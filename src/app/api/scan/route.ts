import { z } from "zod";
import { isAuthed, unauthorized } from "@/lib/auth";
import { detectIngredients } from "@/lib/ai/scan";

export const maxDuration = 60;

const bodySchema = z
  .object({
    image: z
      .object({
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().max(4_000_000),
      })
      .optional(),
    text: z.string().trim().min(2).max(500).optional(),
    custom: z.array(z.string().max(60)).max(200).default([]),
  })
  .refine((b) => b.image || b.text, "Potrebna je slika ili tekst");

export async function POST(request: Request) {
  if (!(await isAuthed())) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Neispravan zahtev" }, { status: 400 });

  try {
    const { custom, ...input } = parsed.data;
    return Response.json(await detectIngredients(input, custom));
  } catch (err) {
    console.error("[scan]", err);
    return Response.json({ error: "Nisam uspeo da prepoznam namirnice. Probaj ponovo." }, { status: 502 });
  }
}
