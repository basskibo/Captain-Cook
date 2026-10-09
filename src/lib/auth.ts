import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "cc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dana

function secret() {
  const s = process.env.SESSION_SECRET || process.env.APP_PIN;
  if (!s) throw new Error("APP_PIN nije podešen");
  // PIN je deo ključa: promena PIN-a poništava sve postojeće sesije.
  return `${s}:${process.env.APP_PIN ?? ""}`;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function pinLength() {
  return (process.env.APP_PIN ?? "").length || 4;
}

export function checkPin(pin: string) {
  const expected = process.env.APP_PIN;
  if (!expected) return false;
  return safeEqual(pin, expected);
}

export function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!safeEqual(sig, sign(payload))) return false;
  return Number(payload) > Date.now() / 1000;
}

// Jednostavno ograničenje pokušaja po IP adresi (u memoriji jedne instance).
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export function lockedFor(ip: string) {
  const a = attempts.get(ip);
  if (!a || a.count < MAX_ATTEMPTS) return 0;
  const left = a.until - Date.now();
  if (left <= 0) {
    attempts.delete(ip);
    return 0;
  }
  return left;
}

export function registerFailure(ip: string) {
  const a = attempts.get(ip) ?? { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) a.until = Date.now() + LOCK_MS;
  attempts.set(ip, a);
  return Math.max(0, MAX_ATTEMPTS - a.count);
}

export function clearFailures(ip: string) {
  attempts.delete(ip);
}
