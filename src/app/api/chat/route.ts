import { z } from "zod";
import { isAuthed, unauthorized } from "@/lib/auth";
import { consumeAi } from "@/lib/limits";
import { streamChat } from "@/lib/ai/chat";

export const maxDuration = 60;

const bodySchema = z.object({
  recipe: z.object({
    name: z.string().max(200),
    servings: z.number().int().min(1).max(50),
    ingredients: z.array(z.object({ item: z.string().max(100), amount: z.string().max(60) })).max(60),
    steps: z.array(z.string().max(1000)).max(40),
  }),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "Razgovor mora početi i završiti se pitanjem"),
  profileNote: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  if (!(await isAuthed())) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Neispravan zahtev" }, { status: 400 });

  const limited = await consumeAi();
  if (limited) return limited;

  const { recipe, messages, profileNote } = parsed.data;
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(recipe, messages, profileNote)) controller.enqueue(encoder.encode(chunk));
      } catch (err) {
        console.error("[chat]", err);
        controller.enqueue(encoder.encode("\n\n⚠️ Kuvar trenutno ne može da odgovori. Pokušaj ponovo."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
