import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, type ScryptOptions } from "node:crypto";
import { safeEqual } from "./auth";
import { kv } from "./kv";
import { redisEnabled } from "./redis";

/** U produkciji nalozi traže pravu bazu — u memoriji bi nestajali. */
export function accountsAvailable() {
  return redisEnabled() || process.env.NODE_ENV !== "production";
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

interface StoredUser extends PublicUser {
  salt: string;
  hash: string;
  /** Sekunde (unix) poslednje promene lozinke — starije sesije prestaju da važe. */
  passwordChangedAt?: number;
}

const SCRYPT: ScryptOptions = { N: 16384, r: 8, p: 1 };

function hashPassword(password: string, salt: string) {
  return new Promise<string>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, 64, SCRYPT, (err, key) => (err ? reject(err) : resolve(key.toString("base64")))),
  );
}

const userKey = (id: string) => `cc:user:${id}`;
const emailKey = (email: string) => `cc:user:email:${email.toLowerCase()}`;

function toPublic(u: StoredUser): PublicUser {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

export async function getUser(id: string): Promise<PublicUser | null> {
  const raw = await kv.get(userKey(id));
  return raw ? toPublic(JSON.parse(raw) as StoredUser) : null;
}

export async function createUser(email: string, password: string, name: string) {
  const id = randomUUID();
  // Rezervacija emaila je atomska (SET NX), pa dva ista naloga ne mogu nastati istovremeno.
  if (!(await kv.setNX(emailKey(email), id))) return { error: "Nalog sa tim emailom već postoji." } as const;
  const salt = randomBytes(16).toString("base64");
  const user: StoredUser = {
    id,
    email: email.toLowerCase(),
    name: name || email.split("@")[0],
    createdAt: Date.now(),
    salt,
    hash: await hashPassword(password, salt),
  };
  await kv.set(userKey(id), JSON.stringify(user));
  return { user: toPublic(user) } as const;
}

export async function verifyLogin(email: string, password: string): Promise<PublicUser | null> {
  const id = await kv.get(emailKey(email));
  const raw = id ? await kv.get(userKey(id)) : null;
  if (!raw) {
    // Ista količina posla i kad nalog ne postoji, da se iz vremena odgovora ne vidi da li email postoji.
    await hashPassword(password, "nema-naloga");
    return null;
  }
  const user = JSON.parse(raw) as StoredUser;
  return safeEqual(await hashPassword(password, user.salt), user.hash) ? toPublic(user) : null;
}

export async function deleteUser(id: string) {
  const user = await getUser(id);
  if (!user) return;
  await kv.del(userKey(id), emailKey(user.email), `cc:sync:${id}`);
}

// ---------- Zaboravljena lozinka ----------

export const RESET_TTL = 60 * 60; // 1 sat

/** U bazi se čuva samo heš tokena — ni ko vidi bazu ne može da iskoristi link. */
const resetKey = (token: string) => `cc:reset:${createHash("sha256").update(token).digest("base64url")}`;

/** Pravi jednokratni token za reset; null ako nalog ne postoji. */
export async function createResetToken(email: string) {
  const id = await kv.get(emailKey(email));
  const raw = id ? await kv.get(userKey(id)) : null;
  if (!raw) return null;
  const user = JSON.parse(raw) as StoredUser;
  const token = randomBytes(32).toString("base64url");
  await kv.setEx(resetKey(token), user.id, RESET_TTL);
  return { token, user: toPublic(user) };
}

/** Postavlja novu lozinku preko tokena (token se troši). Vraća korisnika ili null. */
export async function resetPassword(token: string, password: string): Promise<PublicUser | null> {
  const key = resetKey(token);
  const id = await kv.get(key);
  if (!id) return null;
  await kv.del(key);
  const raw = await kv.get(userKey(id));
  if (!raw) return null;
  const user = JSON.parse(raw) as StoredUser;
  user.salt = randomBytes(16).toString("base64");
  user.hash = await hashPassword(password, user.salt);
  // Odjavljuje sve postojeće sesije (i one koje je možda otvorio neko drugi).
  user.passwordChangedAt = Math.floor(Date.now() / 1000);
  await kv.set(userKey(id), JSON.stringify(user));
  return toPublic(user);
}
