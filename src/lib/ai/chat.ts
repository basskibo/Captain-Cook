import "server-only";
import { streamText, type Message } from "./provider";

export interface ChatRecipe {
  name: string;
  servings: number;
  ingredients: { item: string; amount: string }[];
  steps: string[];
}

const SYSTEM = `Ti si topao, iskusan kuvar koji pomaže korisniku dok sprema konkretan recept.
- Odgovaraš na srpskom (latinica), kratko i praktično: 1-5 rečenica ili kratka lista sa crticama.
- Bez markdown naslova i bez **podebljavanja**.
- Ako pita za zamenu namirnice, predloži 1-3 realne zamene i kako to menja ukus/pripremu.
- Drži se teme kuvanja i ovog recepta. Ako pitanje nema veze sa hranom, ljubazno vrati razgovor na kuvanje.
- Poštuj alergije i ishranu korisnika ako su navedene.`;

export function streamChat(recipe: ChatRecipe, history: { role: "user" | "assistant"; text: string }[], profileNote?: string) {
  const context = [
    `Recept: ${recipe.name} (${recipe.servings} porcije)`,
    `Sastojci: ${recipe.ingredients.map((i) => `${i.item}${i.amount ? ` ${i.amount}` : ""}`).join(", ")}`,
    `Koraci:\n${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    profileNote ? `O korisniku: ${profileNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: Message[] = history.map((m, i) => ({
    role: m.role,
    // Kontekst recepta ide uz prvo pitanje
    parts: [{ text: i === 0 && m.role === "user" ? `${context}\n\nPitanje: ${m.text}` : m.text }],
  }));

  return streamText({
    system: SYSTEM,
    messages,
    temperature: 0.6,
    maxTokens: 1024,
    mock: () =>
      "Odlično pitanje! Umesto pavlake možeš koristiti grčki jogurt, a ako želiš posnu varijantu, kremu od indijskog oraha. Ukus će biti malo kiseliji, pa dodaj prstohvat šećera.",
  });
}
