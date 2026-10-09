import { z } from "zod";
import { isAuthed, unauthorized } from "@/lib/auth";
import { redis, redisEnabled } from "@/lib/redis";

/** Ključevi koji se sinhronizuju između uređaja. */
const SYNC_KEYS = ["cc.custom", "cc.selected", "cc.saved", "cc.shopping", "cc.profile"] as const;
const HASH = "cc:sync";

type Entry = { v: unknown; t: number };

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  if (!redisEnabled()) return Response.json({ enabled: false });

  try {
    // HGETALL vraća ravan niz [polje, vrednost, polje, vrednost, ...]
    const flat = (await redis<string[]>("HGETALL", HASH)) ?? [];
    const data: Record<string, Entry> = {};
    for (let i = 0; i < flat.length; i += 2) {
      try {
        data[flat[i]] = JSON.parse(flat[i + 1]);
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
  if (!(await isAuthed())) return unauthorized();
  if (!redisEnabled()) return Response.json({ enabled: false });

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
    const current = await redis<string | null>("HGET", HASH, key);
    const currentT = current ? (JSON.parse(current) as Entry).t : 0;
    if (t <= currentT) return Response.json({ ok: true, stale: true });
    await redis("HSET", HASH, key, JSON.stringify({ v, t }));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[sync]", err);
    return Response.json({ error: "Sinhronizacija nije uspela" }, { status: 502 });
  }
}
