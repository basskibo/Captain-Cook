import { z } from "zod";
import { clientIp, startSession } from "@/lib/auth";
import { clearLoginFailures, loginLockedFor, registerLoginFailure } from "@/lib/limits";
import { accountsAvailable, verifyLogin } from "@/lib/users";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Unesi ispravan email.").max(120),
  password: z.string().min(1, "Unesi lozinku.").max(200),
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
  const { email, password } = parsed.data;
  const ip = clientIp(request);

  const locked = await loginLockedFor(ip, email);
  if (locked) {
    return Response.json(
      { error: `Previše pokušaja. Probaj ponovo za ${Math.ceil(locked / 60)} min.` },
      { status: 429 },
    );
  }

  try {
    const user = await verifyLogin(email, password);
    if (!user) {
      await registerLoginFailure(ip, email);
      return Response.json({ error: "Pogrešan email ili lozinka." }, { status: 401 });
    }
    await clearLoginFailures(email);
    await startSession(user.id);
    return Response.json({ user });
  } catch (err) {
    console.error("[login]", err);
    return Response.json({ error: "Prijava trenutno nije moguća." }, { status: 500 });
  }
}
