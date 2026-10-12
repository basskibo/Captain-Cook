import { z } from "zod";
import { clientIp } from "@/lib/auth";
import { emailConfigured, resetEmail, sendEmail } from "@/lib/email";
import { resetRequestAllowed } from "@/lib/limits";
import { accountsAvailable, createResetToken } from "@/lib/users";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Unesi ispravan email.").max(120) });

/** Adresa aplikacije za link u mejlu — iz podešavanja, ne iz Host zaglavlja (zaštita od podmetanja). */
function appUrl(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Neispravan email." }, { status: 400 });
  }
  if (!accountsAvailable()) {
    return Response.json({ error: "Nalozi još nisu podešeni na serveru." }, { status: 503 });
  }
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !emailConfigured()) {
    return Response.json({ error: "Slanje mejlova još nije podešeno. Javi se administratoru." }, { status: 503 });
  }

  const { email } = parsed.data;
  if (!(await resetRequestAllowed(clientIp(request), email))) {
    return Response.json({ error: "Previše zahteva. Probaj ponovo kasnije." }, { status: 429 });
  }

  try {
    const reset = await createResetToken(email);
    if (reset) {
      const link = `${appUrl(request)}/?reset=${reset.token}`;
      if (emailConfigured()) {
        const { subject, html, text } = resetEmail(reset.user.name, link);
        await sendEmail({ to: reset.user.email, subject, html, text });
      } else {
        // Lokalni razvoj bez Resend ključa: link u konzoli servera.
        console.info(`[forgot] Link za reset (${reset.user.email}): ${link}`);
      }
    }
  } catch (err) {
    console.error("[forgot]", err);
    return Response.json({ error: "Slanje mejla nije uspelo. Probaj ponovo." }, { status: 502 });
  }

  // Isti odgovor bez obzira da li nalog postoji — ne otkrivamo ko je registrovan.
  return Response.json({ ok: true });
}
