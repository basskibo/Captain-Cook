import { isAuthed, unauthorized } from "@/lib/auth";
import { aiUsage } from "@/lib/limits";

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  try {
    return Response.json(await aiUsage());
  } catch {
    return Response.json({ used: null, limit: null });
  }
}
