import "server-only";

/**
 * Minimalni Upstash Redis REST klijent (bez SDK-a).
 * Radi sa promenljivama koje postavlja Vercel Marketplace integracija (KV_REST_API_*)
 * ili sa originalnim Upstash imenima (UPSTASH_REDIS_REST_*).
 */
function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function redisEnabled() {
  return config() !== null;
}

export async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const cfg = config();
  if (!cfg) throw new Error("Redis nije podešen");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(`Redis greška: ${data.error ?? res.status}`);
  return data.result as T;
}
