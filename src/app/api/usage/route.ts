import { currentUserId, unauthorized } from "@/lib/auth";
import { aiUsage } from "@/lib/limits";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  try {
    return Response.json(await aiUsage(userId));
  } catch {
    return Response.json({ used: null, limit: null });
  }
}
