"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, RotateCcw, ScanLine, Sparkles } from "lucide-react";
import type { Ingredient } from "@/lib/ingredients";
import { resizeImage } from "@/lib/resize-image";
import { Sheet } from "./sheet";

type ScanInput = { kind: "image"; file: File } | { kind: "text"; text: string };

type State =
  | { status: "idle" }
  | { status: "scanning"; preview?: string }
  | { status: "done"; preview?: string; known: string[]; extra: string[] }
  | { status: "error"; preview?: string; message: string };

export function ScanSheet({
  input,
  onClose,
  onAdd,
  lookup,
  selected,
  customNames,
  onUnauthorized,
}: {
  input: ScanInput | null;
  onClose: () => void;
  onAdd: (ids: string[], extra: string[]) => void;
  lookup: Map<string, Ingredient>;
  selected: Set<string>;
  customNames: string[];
  onUnauthorized: () => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    (async () => {
      let preview: string | undefined;
      try {
        let body: object;
        if (input.kind === "image") {
          const img = await resizeImage(input.file);
          preview = img.preview;
          if (cancelled) return;
          setState({ status: "scanning", preview });
          body = { image: { mimeType: img.mimeType, data: img.data }, custom: customNames };
        } else {
          setState({ status: "scanning" });
          body = { text: input.text, custom: customNames };
        }
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 401) return onUnauthorized();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Greška");
        if (cancelled) return;
        const known: string[] = data.known;
        const extra: string[] = data.extra;
        setPicked(new Set([...known.filter((id) => !selected.has(id)), ...extra.map((e) => `+${e}`)]));
        setState({ status: "done", preview, known, extra });
      } catch (e) {
        if (!cancelled) setState({ status: "error", preview, message: e instanceof Error ? e.message : "Greška" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pokreće se samo za novi unos / ponovni pokušaj
  }, [input, attempt]);

  const toggle = (key: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const confirm = () => {
    const ids = [...picked].filter((k) => !k.startsWith("+"));
    const extra = [...picked].filter((k) => k.startsWith("+")).map((k) => k.slice(1));
    onAdd(ids, extra);
    onClose();
  };

  const preview = state.status !== "idle" ? state.preview : undefined;

  return (
    <Sheet open={!!input} onClose={onClose} label="Prepoznavanje namirnica">
      <div className="px-5 pb-4">
        <h2 className="font-display text-2xl font-bold">
          {state.status === "done" ? "Evo šta sam našao" : input?.kind === "text" ? "Slušam…" : "Gledam šta imaš…"}
        </h2>
        {input?.kind === "text" && <p className="mt-1 text-sm text-muted">„{input.text}“</p>}

        {preview && (
          <div className="relative mt-4 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokalni data URL */}
            <img src={preview} alt="Tvoja fotografija" className="max-h-56 w-full object-cover" />
            {state.status === "scanning" && (
              <>
                <div className="absolute inset-0 bg-black/30" />
                <motion.div
                  className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent/50 to-transparent"
                  animate={{ top: ["-15%", "100%", "-15%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <ScanLine className="absolute top-1/2 left-1/2 h-10 w-10 -translate-1/2 text-white" />
              </>
            )}
          </div>
        )}

        {state.status === "scanning" && !preview && (
          <div className="flex justify-center py-10">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-5xl">
              👂
            </motion.span>
          </div>
        )}

        {state.status === "scanning" && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <Sparkles className="h-4 w-4 animate-pulse text-accent" /> AI prepoznaje namirnice…
          </p>
        )}

        {state.status === "error" && (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-center">
            <p className="font-medium">{state.message}</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent"
            >
              <RotateCcw className="h-4 w-4" /> Pokušaj ponovo
            </button>
          </div>
        )}

        {state.status === "done" && (
          <div className="mt-4">
            {state.known.length + state.extra.length === 0 ? (
              <p className="py-6 text-center text-muted">Nisam prepoznao nijednu namirnicu 🤔</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...state.known.map((id) => ({ key: id, item: lookup.get(id), isNew: false })), ...state.extra.map((e) => ({ key: `+${e}`, item: { id: e, name: e, emoji: "✨" }, isNew: true }))].map(
                  ({ key, item, isNew }) => {
                    if (!item) return null;
                    const on = picked.has(key);
                    const already = !isNew && selected.has(key);
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => !already && toggle(key)}
                        disabled={already}
                        className={[
                          "flex h-10 items-center gap-1.5 rounded-full border px-3 text-[15px] font-medium transition-colors",
                          already
                            ? "border-dashed border-border text-muted"
                            : on
                              ? "bg-accent-gradient border-transparent text-white"
                              : "border-border bg-surface text-muted",
                        ].join(" ")}
                      >
                        <span>{item.emoji}</span>
                        {item.name}
                        {isNew && <span className="rounded-full bg-white/25 px-1.5 text-[10px] uppercase">novo</span>}
                        {already ? <span className="text-xs">· već imaš</span> : on && <Check className="h-4 w-4" strokeWidth={2.6} />}
                      </motion.button>
                    );
                  },
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {state.status === "done" && (
        <div className="pb-safe sticky bottom-0 bg-gradient-to-t from-surface via-surface to-transparent px-5 pt-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            disabled={picked.size === 0}
            onClick={confirm}
            className="bg-accent-gradient flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white disabled:opacity-40"
          >
            <Check className="h-5 w-5" /> Dodaj {picked.size} {picked.size === 1 ? "namirnicu" : "namirnica"}
          </motion.button>
        </div>
      )}
    </Sheet>
  );
}

export type { ScanInput };
