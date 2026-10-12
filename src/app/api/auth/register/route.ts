import { z } from "zod";
import { clientIp, startSession } from "@/lib/auth";
import { registrationAllowed } from "@/lib/limits";
import { accountsAvailable, createUser } from "@/lib/users";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Unesi ispravan email.").max(120),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera.").max(200),
  name: z.string().trim().max(40).optional().default(""),
});

export async function POST(request: Request) {
  if (!accountsAvailable()) {
    return Response.json(
      { error: "Nalozi još nisu podešeni na serveru (nedostaje Upstash Redis baza)." },
      { status: 503 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Neispravni podaci." }, { status: 400 });
  }
  if (!(await registrationAllowed(clientIp(request)))) {
    return Response.json({ error: "Previše novih naloga sa ove mreže. Probaj kasnije." }, { status: 429 });
  }

  try {
    const { email, password, name } = parsed.data;
    const result = await createUser(email, password, name);
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });
    await startSession(result.user.id);
    return Response.json({ user: result.user });
  } catch (err) {
    console.error("[register]", err);
    return Response.json({ error: "Registracija trenutno nije moguća." }, { status: 500 });
  }
}
