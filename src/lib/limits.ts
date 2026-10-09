import "server-only";
import { redis, redisEnabled } from "./redis";

/**
 * Ograničenja: zaključavanje PIN-a posle pogrešnih pokušaja i dnevni limit AI poziva.
 * Sa Redis-om važe za sve serverless instance; bez njega rade u memoriji jedne instance.
 */

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_SECONDS = 5 * 60;
// Zaštita i od napada sa više IP adresa: ukupno pogrešnih pokušaja po satu.
const MAX_GLOBAL_FAILURES = 40;

const memory = new Map<string, { value: number; expiresAt: number }>();

async function incr(key: string, ttlSeconds: number) {
  if (redisEnabled()) {
    const value = await redis<number>("INCR", key);
    if (value === 1) await redis("EXPIRE", key, ttlSeconds);
    return value;
  }
  const now = Date.now();
  const cur = memory.get(key);
  const next = cur && cur.expiresAt > now ? { ...cur, value: cur.value + 1 } : { value: 1, expiresAt: now + ttlSeconds * 1000 };
  memory.set(key, next);
  return next.value;
}

async function read(key: string): Promise<{ value: number; ttl: number }> {
  if (redisEnabled()) {
    const value = Number((await redis<string | null>("GET", key)) ?? 0);
    const ttl = value ? await redis<number>("TTL", key) : 0;
    return { value, ttl: Math.max(0, ttl) };
  }
  const cur = memory.get(key);
  if (!cur || cur.expiresAt <= Date.now()) return { value: 0, ttl: 0 };
  return { value: cur.value, ttl: Math.ceil((cur.expiresAt - Date.now()) / 1000) };
}

async function del(key: string) {
  if (redisEnabled()) await redis("DEL", key);
  else memory.delete(key);
}

/** Sekunde do otključavanja (0 = nije zaključano). */
export async function pinLockedFor(ip: string) {
  const [own, global] = await Promise.all([read(`cc:pin:${ip}`), read("cc:pin:global")]);
  if (own.value >= MAX_PIN_ATTEMPTS) return own.ttl || PIN_LOCK_SECONDS;
  if (global.value >= MAX_GLOBAL_FAILURES) return global.ttl || 3600;
  return 0;
}

/** Beleži pogrešan pokušaj; vraća koliko pokušaja je ostalo. */
export async function registerPinFailure(ip: string) {
  const [count] = await Promise.all([incr(`cc:pin:${ip}`, PIN_LOCK_SECONDS), incr("cc:pin:global", 3600)]);
  return Math.max(0, MAX_PIN_ATTEMPTS - count);
}

export async function clearPinFailures(ip: string) {
  await del(`cc:pin:${ip}`);
}

// ---------- Dnevni limit AI poziva ----------

export function aiDailyLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
}

function today() {
  // Dan po beogradskom vremenu — limit se resetuje u ponoć kod nas, ne po UTC-u.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade" }).format(new Date());
}

export async function aiUsage() {
  const { value } = await read(`cc:ai:${today()}`);
  const limit = aiDailyLimit();
  return { used: Math.min(value, limit), limit };
}

/** Troši jedan AI poziv. Vraća null ako je u redu, ili Response 429 ako je limit potrošen. */
export async function consumeAi(): Promise<Response | null> {
  const limit = aiDailyLimit();
  try {
    const used = await incr(`cc:ai:${today()}`, 2 * 24 * 3600);
    if (used > limit) {
      return Response.json(
        { error: `Dnevni AI limit (${limit}) je potrošen. Resetuje se u ponoć. 🌙` },
        { status: 429 },
      );
    }
  } catch (err) {
    // Ako brojač ne radi (npr. Redis nedostupan), ne blokiraj kuvanje.
    console.warn("[limits]", err);
  }
  return null;
}
