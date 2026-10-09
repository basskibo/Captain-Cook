import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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

/** Da li zahtev ima validnu sesiju (za zaštićene API rute). */
export async function isAuthed() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function unauthorized() {
  return Response.json({ error: "Nisi prijavljen" }, { status: 401 });
}
