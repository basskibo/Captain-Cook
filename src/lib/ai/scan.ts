import "server-only";
import { z } from "zod";
import { ALL_INGREDIENTS } from "../ingredients";
import { extractJson, generateText, type Part } from "./provider";

export interface ScanResult {
  /** id-jevi namirnica koje već postoje na listi */
  known: string[];
  /** nove namirnice kojih nema na listi */
  extra: string[];
}

const schema = z.object({ items: z.array(z.string().trim().min(1).max(40)).max(60) });

const SYSTEM = `Ti prepoznaješ namirnice za kuvanje. Odgovaraš ISKLJUČIVO validnim JSON-om oblika {"items": ["Naziv", ...]}.
Pravila:
- Nazivi su na srpskom (latinica), u nominativu jednine ili uobičajenom obliku (npr. "Jaja", "Crni luk", "Paradajz").
- Ako namirnica postoji na datoj listi poznatih, upotrebi TAČNO taj naziv sa liste.
- Navedi samo jestive namirnice koje se koriste u kuvanju. Bez ambalaže, posuđa i nejasnih stvari.
- Ne izmišljaj: na slici navedi samo ono što jasno vidiš.`;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").trim();
}

export async function detectIngredients(
  input: { image?: { mimeType: string; data: string }; text?: string },
  custom: string[],
): Promise<ScanResult> {
  const knownNames = [...ALL_INGREDIENTS.map((i) => i.name), ...custom];
  const parts: Part[] = [
    {
      text: [
        `Poznate namirnice: ${knownNames.join(", ")}.`,
        input.image
          ? "Na slici je frižider, ostava ili pult. Nabroj sve namirnice koje jasno vidiš."
          : `Korisnik je izgovorio/napisao: "${input.text}". Izdvoj SVE namirnice koje pominje, uključujući i one kojih nema na listi poznatih.`,
      ].join("\n"),
    },
  ];
  if (input.image) parts.push({ image: input.image });

  const raw = await generateText({
    system: SYSTEM,
    messages: [{ role: "user", parts }],
    json: true,
    temperature: 0.2,
    maxTokens: 2048,
    mock: () => JSON.stringify({ items: ["Jaja", "Mleko", "Paradajz", "Kačkavalj", "Tofu"] }),
  });
  const { items } = schema.parse(extractJson(raw));

  const byName = new Map(knownNames.map((n) => [normalize(n), n.toLowerCase()]));
  const known = new Set<string>();
  const extra = new Set<string>();
  for (const item of items) {
    const id = byName.get(normalize(item));
    if (id) known.add(id);
    else extra.add(item.charAt(0).toUpperCase() + item.slice(1));
  }
  return { known: [...known], extra: [...extra] };
}
