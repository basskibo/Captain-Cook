"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, MessageCircle } from "lucide-react";
import type { Recipe } from "@/lib/types";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = ["Čime mogu da zamenim…?", "Može li u airfryer?", "Kako da bude zdravije?", "Šta da poslužim uz ovo?"];

export function ChefChat({ recipe, profileNote }: { recipe: Recipe; profileNote?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    const history: Msg[] = [...messages, { role: "user", text }];
    setMessages([...history, { role: "assistant", text: "" }]);
    setDraft("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: {
            name: recipe.name,
            servings: recipe.servings,
            ingredients: recipe.ingredients.map(({ item, amount }) => ({ item, amount })),
            steps: recipe.steps,
          },
          messages: history.slice(-12),
          profileNote: profileNote || undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", text: answer }]);
      }
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : "Kuvar trenutno ne može da odgovori. Pokušaj ponovo.";
      setMessages([...history, { role: "assistant", text: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8">
      <h3 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
        <MessageCircle className="h-5 w-5 text-accent" /> Pitaj kuvara
      </h3>

      <div className="rounded-3xl border border-border bg-surface-2/40 p-3">
        {messages.length === 0 ? (
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s.endsWith("…?")) {
                    setDraft(s.replace("…?", " "));
                    inputRef.current?.focus();
                  } else void ask(s);
                }}
                className="h-9 shrink-0 rounded-full border border-border bg-surface px-3.5 text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="max-h-80 space-y-2.5 overflow-y-auto overscroll-contain pb-1">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                      m.role === "user" ? "bg-accent-gradient rounded-br-md text-white" : "rounded-bl-md bg-surface"
                    }`}
                  >
                    {m.text ||
                      (busy && (
                        <span className="flex gap-1 py-1.5" aria-label="Kuvar piše">
                          {[0, 1, 2].map((d) => (
                            <motion.span
                              key={d}
                              className="h-2 w-2 rounded-full bg-muted"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                            />
                          ))}
                        </span>
                      ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
          className="mt-2.5 flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface pr-1.5 pl-3.5 focus-within:border-accent"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="npr. nemam pavlaku, šta umesto?"
            maxLength={500}
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            aria-label="Pošalji pitanje"
            className="bg-accent-gradient grid h-9 w-9 place-items-center rounded-xl text-white disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
          </button>
        </form>
      </div>
    </section>
  );
}
