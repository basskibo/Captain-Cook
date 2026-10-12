import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "./kv";

export const SESSION_COOKIE = "cc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 60; // 60 dana

function secret() {
  // Rezerva: tajni Upstash token (nikad ne ide ka klijentu), da prijava radi i bez posebne tajne.
  const s = process.env.SESSION_SECRET || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (s) return s;
  if (process.env.NODE_ENV !== "production") return "captain-cook-dev-secret";
  throw new Error("SESSION_SECRET nije podešen");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Token: "<userId>.<istek>.<potpis>" — potpisan HMAC-om, bez stanja na serveru. */
function createSessionToken(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string | undefined): { userId: string; issuedAt: number } | null {
  if (!token) return null;
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig) return null;
  if (!safeEqual(sig, sign(`${userId}.${exp}`))) return null;
  if (Number(exp) <= Date.now() / 1000) return null;
  return { userId, issuedAt: Number(exp) - SESSION_MAX_AGE };
}

/**
 * Id prijavljenog korisnika ili null.
 * Sesija ne važi ako je nalog obrisan ili je lozinka promenjena posle prijave.
 */
export async function currentUserId() {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const raw = await kv.get(`cc:user:${session.userId}`).catch(() => null);
  if (!raw) return null;
  const { passwordChangedAt = 0 } = JSON.parse(raw) as { passwordChangedAt?: number };
  return passwordChangedAt > session.issuedAt ? null : session.userId;
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export function unauthorized() {
  return Response.json({ error: "Prijavi se da bi koristio ovu opciju.", auth: true }, { status: 401 });
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
