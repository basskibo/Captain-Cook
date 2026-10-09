import { z } from "zod";
import { isAuthed, unauthorized } from "@/lib/auth";
import { streamRecipes } from "@/lib/ai/recipes";

export const maxDuration = 60;

const bodySchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(60)).min(1).max(80),
  mealType: z.enum(["dorucak", "rucak", "vecera", "uzina", "desert"]),
  maxTime: z.number().int().positive().max(600).nullable(),
  servings: z.number().int().min(1).max(12),
  strict: z.boolean(),
  note: z.string().max(300).optional(),
  exclude: z.array(z.string().max(120)).max(30).optional(),
  profile: z
    .object({
      diet: z.string().max(40),
      allergies: z.array(z.string().max(40)).max(20),
      dislikes: z.array(z.string().max(40)).max(30),
      cuisines: z.array(z.string().max(40)).max(12),
      equipment: z.array(z.string().max(40)).max(12),
      spice: z.enum(["blago", "srednje", "ljuto"]),
    })
    .optional(),
});

export async function POST(request: Request) {
  if (!(await isAuthed())) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Neispravan zahtev" }, { status: 400 });
  }

  // NDJSON stream: jedan red po događaju ({type: "recipe" | "error" | "done"}).
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        for await (const recipe of streamRecipes(parsed.data)) send({ type: "recipe", recipe });
        send({ type: "done" });
      } catch (err) {
        console.error("[recipes]", err);
        send({ type: "error", error: "Kuvar se zbunio 🤯 Pokušaj ponovo za trenutak." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
