import { currentUserId, endSession } from "@/lib/auth";
import { getUser } from "@/lib/users";

/** Trenutno prijavljen korisnik (ili null za gosta). */
export async function GET() {
  const id = await currentUserId();
  const user = id ? await getUser(id).catch(() => null) : null;
  return Response.json({ user });
}

/** Odjava. */
export async function DELETE() {
  await endSession();
  return Response.json({ ok: true });
}
