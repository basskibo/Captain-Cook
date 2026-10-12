import { z } from "zod";
import { startSession } from "@/lib/auth";
import { resetPassword } from "@/lib/users";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera.").max(200),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Neispravan zahtev." }, { status: 400 });
  }
  try {
    const user = await resetPassword(parsed.data.token, parsed.data.password);
    if (!user) {
      return Response.json({ error: "Link je istekao ili je već iskorišćen. Zatraži novi." }, { status: 400 });
    }
    await startSession(user.id);
    return Response.json({ user });
  } catch (err) {
    console.error("[reset]", err);
    return Response.json({ error: "Promena lozinke nije uspela." }, { status: 500 });
  }
}
