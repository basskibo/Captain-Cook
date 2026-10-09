import { z } from "zod";
import { isAuthed, unauthorized } from "@/lib/auth";
import { generateRecipes } from "@/lib/ai/recipes";

export const maxDuration = 60;

const bodySchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(60)).min(1).max(80),
  mealType: z.enum(["dorucak", "rucak", "vecera", "uzina", "desert"]),
  maxTime: z.number().int().positive().max(600).nullable(),
  servings: z.number().int().min(1).max(12),
  strict: z.boolean(),
  note: z.string().max(300).optional(),
  exclude: z.array(z.string().max(120)).max(30).optional(),
});

export async function POST(request: Request) {
  if (!(await isAuthed())) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Neispravan zahtev" }, { status: 400 });
  }

  try {
    const recipes = await generateRecipes(parsed.data);
    return Response.json({ recipes });
  } catch (err) {
    console.error("[recipes]", err);
    return Response.json(
      { error: "Kuvar se zbunio 🤯 Pokušaj ponovo za trenutak." },
      { status: 502 },
    );
  }
}
