import { z } from "zod";
import { currentUserId, unauthorized } from "@/lib/auth";
import { kv } from "@/lib/kv";

/** Ključevi koji se sinhronizuju između uređaja. */
const SYNC_KEYS = ["cc.custom", "cc.selected", "cc.saved", "cc.shopping", "cc.profile"] as const;
/** Podaci svakog korisnika su u posebnom hash-u. */
const hashFor = (userId: string) => `cc:sync:${userId}`;

type Entry = { v: unknown; t: number };

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  try {
    const raw = await kv.hgetall(hashFor(userId));
    const data: Record<string, Entry> = {};
    for (const [field, value] of Object.entries(raw)) {
      try {
        data[field] = JSON.parse(value);
      } catch {}
    }
    return Response.json({ enabled: true, data });
  } catch (err) {
    console.error("[sync]", err);
    return Response.json({ enabled: false, error: "Sinhronizacija trenutno nije dostupna" });
  }
}

const putSchema = z.object({
  key: z.enum(SYNC_KEYS),
  v: z.unknown(),
  t: z.number().int().positive(),
});

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const text = await request.text();
  if (text.length > 900_000) return Response.json({ error: "Previše podataka" }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {}
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Neispravan zahtev" }, { status: 400 });

  const { key, v, t } = parsed.data;
  try {
    // Novija izmena pobeđuje (last-write-wins po vremenu izmene na uređaju).
    const current = await kv.hget(hashFor(userId), key);
    const currentT = current ? (JSON.parse(current) as Entry).t : 0;
    if (t <= currentT) return Response.json({ ok: true, stale: true });
    await kv.hset(hashFor(userId), key, JSON.stringify({ v, t }));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[sync]", err);
    return Response.json({ error: "Sinhronizacija nije uspela" }, { status: 502 });
  }
}
