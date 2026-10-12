import { currentUserId, endSession, unauthorized } from "@/lib/auth";
import { deleteUser } from "@/lib/users";

/** Brisanje naloga i svih sačuvanih podataka. */
export async function DELETE() {
  const id = await currentUserId();
  if (!id) return unauthorized();
  await deleteUser(id);
  await endSession();
  return Response.json({ ok: true });
}
