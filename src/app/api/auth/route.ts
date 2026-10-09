import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkPin,
  clearFailures,
  createSessionToken,
  lockedFor,
  pinLength,
  registerFailure,
  verifySessionToken,
} from "@/lib/auth";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return Response.json({ authed: verifySessionToken(token), pinLength: pinLength() });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const locked = lockedFor(ip);
  if (locked) {
    return Response.json(
      { error: `Previše pokušaja. Probaj ponovo za ${Math.ceil(locked / 60000)} min.` },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!checkPin(pin)) {
    // Mali delay usporava brute-force.
    await new Promise((r) => setTimeout(r, 400));
    const left = registerFailure(ip);
    return Response.json(
      { error: left > 0 ? `Pogrešan PIN (još ${left})` : "Previše pokušaja. Sačekaj 5 min." },
      { status: 401 },
    );
  }

  clearFailures(ip);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
