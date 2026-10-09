import "server-only";

/** Zajednički sloj za AI provajdere (Gemini / Anthropic / mock) sa streamingom i slikama. */

export type Part = { text: string } | { image: { mimeType: string; data: string } };

export interface Message {
  role: "user" | "assistant";
  parts: Part[];
}

export interface TextRequest {
  system: string;
  messages: Message[];
  /** Traži čist JSON odgovor (Gemini responseMimeType). */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Tekst koji mock provajder vraća (za lokalni razvoj bez ključa). */
  mock?: () => string;
}

export class AIError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export function provider() {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "gemini" || p === "anthropic" || p === "mock") return p;
  return process.env.GEMINI_API_KEY ? "gemini" : "anthropic";
}

/** Čita SSE stream i vraća sadržaj svake `data:` linije. */
async function* sseData(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
  const rest = buffer.trim();
  if (rest.startsWith("data:")) yield rest.slice(5).trim();
}

// ---------- Gemini ----------

function geminiBody(req: TextRequest, thinking: boolean) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: m.parts.map((p) => ("text" in p ? { text: p.text } : { inlineData: p.image })),
    })),
    generationConfig: {
      temperature: req.temperature ?? 0.9,
      maxOutputTokens: req.maxTokens ?? 8192,
      ...(req.json ? { responseMimeType: "application/json" } : {}),
      // Manje "razmišljanja" = mnogo brži odgovor; za recepte je sasvim dovoljno.
      ...(thinking ? { thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING || "low" } } : {}),
    },
  });
}

async function* streamGemini(req: TextRequest): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIError("GEMINI_API_KEY nije podešen", 500);
  const models = [
    ...new Set([
      process.env.GEMINI_MODEL || "gemini-flash-latest",
      process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest",
    ]),
  ];

  let lastError = "";
  for (const model of models) {
    let thinking = true;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: geminiBody(req, thinking),
        },
      );
      if (res.ok) {
        for await (const data of sseData(res)) {
          try {
            const json = JSON.parse(data);
            const parts: { text?: string; thought?: boolean }[] = json?.candidates?.[0]?.content?.parts ?? [];
            const text = parts
              .filter((p) => !p.thought)
              .map((p) => p.text ?? "")
              .join("");
            if (text) yield text;
          } catch {}
        }
        return;
      }
      lastError = `Gemini (${model}) greška ${res.status}: ${(await res.text()).slice(0, 300)}`;
      console.warn("[gemini]", lastError);
      // Model ne podržava thinkingConfig → probaj isti model bez njega.
      if (res.status === 400 && thinking) {
        thinking = false;
        continue;
      }
      // Kratkotrajna serverska greška → jedan ponovni pokušaj.
      if ((res.status === 500 || res.status === 504) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      // 503 (preopterećen), 429 (kvota), 404 (ugašen) → odmah sledeći model.
      break;
    }
  }
  throw new AIError(lastError);
}

// ---------- Anthropic ----------

async function* streamAnthropic(req: TextRequest): AsyncGenerator<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AIError("ANTHROPIC_API_KEY nije podešen", 500);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: req.maxTokens ?? 8192,
      temperature: req.temperature ?? 0.9,
      system: req.json ? `${req.system}\n\nOdgovori isključivo validnim JSON-om.` : req.system,
      stream: true,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.parts.map((p) =>
          "text" in p
            ? { type: "text", text: p.text }
            : { type: "image", source: { type: "base64", media_type: p.image.mimeType, data: p.image.data } },
        ),
      })),
    }),
  });
  if (!res.ok) throw new AIError(`Anthropic greška ${res.status}: ${(await res.text()).slice(0, 300)}`);

  for await (const data of sseData(res)) {
    try {
      const json = JSON.parse(data);
      if (json.type === "content_block_delta" && json.delta?.type === "text_delta") yield json.delta.text;
      if (json.type === "error") throw new AIError(`Anthropic: ${json.error?.message}`);
    } catch (e) {
      if (e instanceof AIError) throw e;
    }
  }
}

// ---------- Mock ----------

async function* streamMock(req: TextRequest): AsyncGenerator<string> {
  const text = req.mock?.() ?? "Ovo je probni odgovor. Podesi AI_PROVIDER i ključ za prave odgovore.";
  // Simulira postepeno stizanje teksta.
  for (let i = 0; i < text.length; i += 40) {
    await new Promise((r) => setTimeout(r, 25));
    yield text.slice(i, i + 40);
  }
}

// ---------- Javni API ----------

export function streamText(req: TextRequest): AsyncGenerator<string> {
  const p = provider();
  if (p === "mock") return streamMock(req);
  return p === "gemini" ? streamGemini(req) : streamAnthropic(req);
}

export async function generateText(req: TextRequest) {
  let out = "";
  for await (const chunk of streamText(req)) out += chunk;
  return out;
}

export function extractJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new AIError("AI nije vratio JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}
