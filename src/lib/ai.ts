import "server-only";
import { z } from "zod";
import type { GenerateRequest, Recipe } from "./types";
import { findDishPhoto } from "./images";

const MEAL_LABELS: Record<GenerateRequest["mealType"], string> = {
  dorucak: "doručak",
  rucak: "ručak",
  vecera: "večera",
  uzina: "užina",
  desert: "desert",
};

const recipeSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().default("🍽️"),
  imageQuery: z.string().optional(),
  description: z.string().default(""),
  timeMinutes: z.coerce.number().int().positive().catch(30),
  difficulty: z.enum(["lako", "srednje", "teško"]).catch("srednje"),
  servings: z.coerce.number().int().positive().catch(2),
  caloriesPerServing: z.coerce.number().int().positive().optional().catch(undefined),
  ingredients: z
    .array(
      z.object({
        item: z.string(),
        amount: z.string().default(""),
        have: z.boolean().default(true),
      }),
    )
    .min(1),
  steps: z.array(z.string()).min(1),
  tip: z.string().optional(),
});

const responseSchema = z.object({ recipes: z.array(recipeSchema).min(1) });

const SYSTEM_PROMPT = `Ti si iskusan kuvar i nutricionista koji predlaže praktična, ukusna jela za kućno kuvanje.
Odgovaraš ISKLJUČIVO na srpskom jeziku (latinica) i ISKLJUČIVO validnim JSON-om, bez markdown-a i bez ikakvog teksta van JSON-a.

Format odgovora:
{
  "recipes": [
    {
      "name": "Naziv jela",
      "emoji": "jedan emoji koji predstavlja jelo",
      "imageQuery": "kratak ENGLESKI naziv jela za pretragu fotografija, 2-4 reči (npr. \"moussaka\", \"creamy chicken pasta\")",
      "description": "1-2 rečenice koje zvuče primamljivo",
      "timeMinutes": 30,
      "difficulty": "lako" | "srednje" | "teško",
      "servings": 2,
      "caloriesPerServing": 450,
      "ingredients": [{ "item": "naziv", "amount": "200 g", "have": true }],
      "steps": ["Konkretan korak sa vremenom i temperaturom gde je bitno."],
      "tip": "kratak savet šefa"
    }
  ]
}

Pravila:
- "have" je true ako korisnik ima namirnicu (ili je osnovna: so, biber, voda, ulje), inače false.
- Koraci su jasni, numerisani redosledom, bez numeracije u tekstu.
- Predlozi treba da budu međusobno različiti (tehnika, ukus, kuhinja).
- Količine prilagodi broju porcija.`;

function buildPrompt(req: GenerateRequest, count: number) {
  const lines = [
    `Namirnice koje imam: ${req.ingredients.join(", ")}.`,
    `Obrok: ${MEAL_LABELS[req.mealType]}.`,
    `Broj porcija: ${req.servings}.`,
    req.maxTime ? `Maksimalno vreme pripreme: ${req.maxTime} minuta.` : "Vreme pripreme nije ograničeno.",
    req.strict
      ? "Koristi SAMO namirnice koje imam (plus so, biber, voda, ulje). Ne dodaji ništa drugo."
      : "Prednost daj mojim namirnicama; smeš dodati najviše 2-3 uobičajene namirnice koje nemam (označi ih sa have: false).",
    req.note ? `Dodatne želje: ${req.note}` : "",
    req.exclude?.length ? `Nemoj predlagati ova jela (već sam ih video): ${req.exclude.join(", ")}.` : "",
    `Predloži tačno ${count} recepta.`,
  ];
  return lines.filter(Boolean).join("\n");
}

function extractJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI nije vratio JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const RETRYABLE = new Set([429, 500, 503, 504]);

async function callGeminiModel(model: string, key: string, prompt: string) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
    }),
  });
}

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY nije podešen");
  // Besplatni tier često vraća 503/429 — pokušaj ponovo, pa pređi na rezervni model.
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest",
  ];

  let lastError = "";
  for (const model of [...new Set(models)]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await callGeminiModel(model, key, prompt);
      if (res.ok) {
        const data = await res.json();
        const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
        return parts
          .filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("");
      }
      lastError = `Gemini (${model}) greška ${res.status}: ${(await res.text()).slice(0, 300)}`;
      console.warn("[gemini]", lastError);
      if (!RETRYABLE.has(res.status)) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(lastError);
}

async function callAnthropic(prompt: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY nije podešen");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic greška ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return text;
}

// Za lokalni razvoj bez API ključa: AI_PROVIDER=mock
function mockResponse(req: GenerateRequest, count: number) {
  const base = req.ingredients.slice(0, 3);
  return JSON.stringify({
    recipes: Array.from({ length: count }, (_, n) => ({
      name: `Probno jelo ${n + 1} sa ${base[0] ?? "ničim"}`,
      emoji: ["🍳", "🥘", "🍝"][n % 3],
      imageQuery: ["spanish omelette", "moussaka", "creamy pasta"][n % 3],
      description: "Ovo je probni recept — podesi pravi AI ključ za prave predloge.",
      timeMinutes: 15 + n * 10,
      difficulty: ["lako", "srednje", "teško"][n % 3],
      servings: req.servings,
      caloriesPerServing: 420,
      ingredients: [
        ...base.map((item) => ({ item, amount: "200 g", have: true })),
        { item: "Svež bosiljak", amount: "par listića", have: false },
      ],
      steps: ["Pripremi sve namirnice.", "Kuvaj 10 minuta uz mešanje.", "Posluži toplo."],
      tip: "Dodaj malo limunovog soka na kraju.",
    })),
  });
}

function provider() {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "gemini" || p === "anthropic" || p === "mock") return p;
  return process.env.GEMINI_API_KEY ? "gemini" : "anthropic";
}

export async function generateRecipes(req: GenerateRequest, count = 3): Promise<Recipe[]> {
  const prompt = buildPrompt(req, count);
  const p = provider();
  const raw =
    p === "mock" ? mockResponse(req, count) : p === "gemini" ? await callGemini(prompt) : await callAnthropic(prompt);
  const parsed = responseSchema.parse(extractJson(raw));
  return Promise.all(
    parsed.recipes.map(async ({ imageQuery, ...r }) => ({
      ...r,
      id: crypto.randomUUID(),
      image: await findDishPhoto(imageQuery || r.name, r.name),
    })),
  );
}
