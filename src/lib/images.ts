import "server-only";
import type { RecipeImage } from "./types";

interface PexelsPhoto {
  alt: string;
  avg_color: string;
  photographer: string;
  url: string;
  src: { large: string; medium: string; landscape: string };
}

/** Prava fotografija jela sa Pexels-a (besplatno). Bez PEXELS_API_KEY vraća undefined → prikazuje se emoji. */
export async function findDishPhoto(query: string, name: string): Promise<RecipeImage | undefined> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return undefined;

  try {
    const params = new URLSearchParams({ query: `${query} food`, per_page: "1", orientation: "landscape" });
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.warn("[pexels]", res.status, await res.text().catch(() => ""));
      return undefined;
    }
    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const photo = data.photos?.[0];
    if (!photo) return undefined;

    return {
      src: photo.src.large,
      thumb: photo.src.medium,
      alt: photo.alt || name,
      color: photo.avg_color,
      credit: photo.photographer,
      creditUrl: photo.url,
    };
  } catch (err) {
    console.warn("[pexels]", err);
    return undefined;
  }
}
