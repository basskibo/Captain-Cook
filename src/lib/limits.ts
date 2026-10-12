import "server-only";
import { kv } from "./kv";

/** Ograničenja: pokušaji prijave/registracije i dnevni AI limit po nalogu. */

/** Vraća broj sekundi do otključavanja, ili 0 ako pokušaj sme. */
async function attemptGuard(key: string, max: number) {
  const value = Number((await kv.get(key)) ?? 0);
  return value >= max ? Math.max(1, await kv.ttl(key)) : 0;
}

export const LOGIN_MAX = 10;
export const LOGIN_WINDOW = 15 * 60;

export async function loginLockedFor(ip: string, email: string) {
  return Math.max(
    await attemptGuard(`cc:login:ip:${ip}`, LOGIN_MAX * 3),
    await attemptGuard(`cc:login:email:${email.toLowerCase()}`, LOGIN_MAX),
  );
}

export async function registerLoginFailure(ip: string, email: string) {
  await Promise.all([
    kv.incr(`cc:login:ip:${ip}`, LOGIN_WINDOW),
    kv.incr(`cc:login:email:${email.toLowerCase()}`, LOGIN_WINDOW),
  ]);
}

export async function clearLoginFailures(email: string) {
  await kv.del(`cc:login:email:${email.toLowerCase()}`);
}

/** Najviše 5 novih naloga po IP adresi na sat. */
export async function registrationAllowed(ip: string) {
  return (await kv.incr(`cc:register:${ip}`, 3600)) <= 5;
}

/** Zahtevi za reset lozinke: 3 po emailu i 10 po IP adresi na sat (štiti inbox i Resend kvotu). */
export async function resetRequestAllowed(ip: string, email: string) {
  const [byEmail, byIp] = await Promise.all([
    kv.incr(`cc:reset-req:email:${email.toLowerCase()}`, 3600),
    kv.incr(`cc:reset-req:ip:${ip}`, 3600),
  ]);
  return byEmail <= 3 && byIp <= 10;
}

// ---------- Dnevni AI limit po nalogu ----------

export function aiDailyLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

function today() {
  // Dan po beogradskom vremenu — limit se resetuje u ponoć kod nas, ne po UTC-u.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade" }).format(new Date());
}

const aiKey = (userId: string) => `cc:ai:${userId}:${today()}`;

export async function aiUsage(userId: string) {
  const used = Number((await kv.get(aiKey(userId))) ?? 0);
  const limit = aiDailyLimit();
  return { used: Math.min(used, limit), limit };
}

/** Troši jedan AI poziv. Vraća null ako je u redu, ili Response 429 ako je limit potrošen. */
export async function consumeAi(userId: string): Promise<Response | null> {
  const limit = aiDailyLimit();
  try {
    const used = await kv.incr(aiKey(userId), 2 * 24 * 3600);
    if (used > limit) {
      return Response.json(
        { error: `Potrošio si današnji AI limit (${limit}). Resetuje se u ponoć. 🌙` },
        { status: 429 },
      );
    }
  } catch (err) {
    // Ako brojač ne radi (npr. Redis nedostupan), ne blokiraj kuvanje.
    console.warn("[limits]", err);
  }
  return null;
}
