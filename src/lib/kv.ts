import "server-only";
import { redis, redisEnabled } from "./redis";

/**
 * Key-value sloj: Upstash Redis u produkciji, memorija kao rezerva za lokalni razvoj.
 * Bez Redis-a podaci (i nalozi!) žive samo dok radi jedna serverska instanca.
 */

type Entry = { v: string | Map<string, string>; exp?: number };
const mem = new Map<string, Entry>();
let warned = false;

function memEntry(key: string) {
  const e = mem.get(key);
  if (e?.exp && e.exp < Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e;
}

function redisOn() {
  if (redisEnabled()) return true;
  if (!warned) {
    warned = true;
    console.warn("[kv] Redis nije podešen — koristi se memorija (podaci se gube pri restartu).");
  }
  return false;
}

export const kv = {
  async get(key: string): Promise<string | null> {
    if (redisOn()) return redis<string | null>("GET", key);
    const e = memEntry(key);
    return typeof e?.v === "string" ? e.v : null;
  },

  async set(key: string, value: string) {
    if (redisOn()) return void (await redis("SET", key, value));
    mem.set(key, { v: value });
  },

  /** SET sa istekom (sekunde). */
  async setEx(key: string, value: string, ttlSeconds: number) {
    if (redisOn()) return void (await redis("SET", key, value, "EX", ttlSeconds));
    mem.set(key, { v: value, exp: Date.now() + ttlSeconds * 1000 });
  },

  /** Postavlja samo ako ključ ne postoji; vraća true ako je postavljen. */
  async setNX(key: string, value: string): Promise<boolean> {
    if (redisOn()) return (await redis<string | null>("SET", key, value, "NX")) === "OK";
    if (memEntry(key)) return false;
    mem.set(key, { v: value });
    return true;
  },

  async del(...keys: string[]) {
    if (!keys.length) return;
    if (redisOn()) return void (await redis("DEL", ...keys));
    keys.forEach((k) => mem.delete(k));
  },

  /** INCR sa TTL-om koji se postavlja pri prvom uvećanju. */
  async incr(key: string, ttlSeconds: number): Promise<number> {
    if (redisOn()) {
      const value = await redis<number>("INCR", key);
      if (value === 1) await redis("EXPIRE", key, ttlSeconds);
      return value;
    }
    const e = memEntry(key);
    const value = (e ? Number(e.v) : 0) + 1;
    mem.set(key, { v: String(value), exp: e?.exp ?? Date.now() + ttlSeconds * 1000 });
    return value;
  },

  async ttl(key: string): Promise<number> {
    if (redisOn()) return Math.max(0, await redis<number>("TTL", key));
    const e = memEntry(key);
    return e?.exp ? Math.ceil((e.exp - Date.now()) / 1000) : 0;
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    if (redisOn()) {
      const flat = (await redis<string[]>("HGETALL", key)) ?? [];
      const out: Record<string, string> = {};
      for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
      return out;
    }
    const e = memEntry(key);
    return e?.v instanceof Map ? Object.fromEntries(e.v) : {};
  },

  async hget(key: string, field: string): Promise<string | null> {
    if (redisOn()) return redis<string | null>("HGET", key, field);
    const e = memEntry(key);
    return e?.v instanceof Map ? (e.v.get(field) ?? null) : null;
  },

  async hset(key: string, field: string, value: string) {
    if (redisOn()) return void (await redis("HSET", key, field, value));
    const e = memEntry(key);
    const map = e?.v instanceof Map ? e.v : new Map<string, string>();
    map.set(field, value);
    mem.set(key, { v: map });
  },
};
