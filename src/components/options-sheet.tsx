"use client";

import { motion } from "motion/react";
import { ChevronRight, Minus, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import type { MealType } from "@/lib/types";
import { Sheet } from "./sheet";

export interface CookOptions {
  mealType: MealType;
  maxTime: number | null;
  servings: number;
  strict: boolean;
  note: string;
}

export function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "dorucak";
  if (h < 17) return "rucak";
  return "vecera";
}

const MEALS: { id: MealType; label: string; emoji: string }[] = [
  { id: "dorucak", label: "Doručak", emoji: "🍳" },
  { id: "rucak", label: "Ručak", emoji: "🍲" },
  { id: "vecera", label: "Večera", emoji: "🍝" },
  { id: "uzina", label: "Užina", emoji: "🥪" },
  { id: "desert", label: "Desert", emoji: "🍰" },
];

const TIMES: { value: number | null; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
  { value: null, label: "Bez žurbe" },
];

const NOTE_IDEAS = ["Bez mesa", "Što manje sudova", "Proteinsko", "Lagano", "Za decu", "Ljuto 🌶️"];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 text-xs font-semibold tracking-wider text-muted uppercase">{children}</p>;
}

export function OptionsSheet({
  open,
  onClose,
  options,
  onChange,
  onCook,
  count,
  profileSummary,
  onEditProfile,
}: {
  open: boolean;
  onClose: () => void;
  options: CookOptions;
  onChange: (o: CookOptions) => void;
  onCook: () => void;
  count: number;
  profileSummary: string;
  onEditProfile: () => void;
}) {
  const set = <K extends keyof CookOptions>(k: K, v: CookOptions[K]) => onChange({ ...options, [k]: v });

  return (
    <Sheet open={open} onClose={onClose} label="Podešavanja obroka">
      <div className="px-5 pb-2">
        <h2 className="font-display text-2xl font-bold">Šta spremamo?</h2>
        <p className="mt-1 text-sm text-muted">Imaš {count} namirnica. Podesi detalje i pusti šefa da radi.</p>

        <button
          type="button"
          onClick={onEditProfile}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-surface-2/60 p-3 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Moj ukus</span>
            <span className="block truncate text-xs text-muted">{profileSummary || "Dijeta, alergije, šta ne voliš…"}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </button>

        <div className="mt-6">
          <Label>Obrok</Label>
          <div className="grid grid-cols-5 gap-2">
            {MEALS.map((m) => {
              const active = options.mealType === m.id;
              return (
                <motion.button
                  key={m.id}
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  onClick={() => set("mealType", m.id)}
                  className={[
                    "flex flex-col items-center gap-1 rounded-2xl border py-2.5 text-[11px] font-semibold transition-colors",
                    active ? "border-accent bg-accent/10 text-text" : "border-border bg-surface-2/50 text-muted",
                  ].join(" ")}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  {m.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <Label>Vreme</Label>
          <div className="flex rounded-2xl bg-surface-2 p-1">
            {TIMES.map((t) => {
              const active = options.maxTime === t.value;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => set("maxTime", t.value)}
                  className="relative flex-1 rounded-xl py-2.5 text-sm font-medium"
                >
                  {active && (
                    <motion.span
                      layoutId="time-pill"
                      className="absolute inset-0 rounded-xl bg-surface shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${active ? "text-text" : "text-muted"}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border p-3.5">
          <div>
            <p className="font-medium">Broj porcija</p>
            <p className="text-sm text-muted">Za koliko osoba kuvaš</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("servings", Math.max(1, options.servings - 1))}
              className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 disabled:opacity-40"
              disabled={options.servings <= 1}
              aria-label="Manje porcija"
            >
              <Minus className="h-4 w-4" />
            </button>
            <motion.span
              key={options.servings}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-5 text-center font-display text-xl font-bold"
            >
              {options.servings}
            </motion.span>
            <button
              type="button"
              onClick={() => set("servings", Math.min(12, options.servings + 1))}
              className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 disabled:opacity-40"
              disabled={options.servings >= 12}
              aria-label="Više porcija"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={options.strict}
          onClick={() => set("strict", !options.strict)}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border p-3.5 text-left"
        >
          <div className="pr-4">
            <p className="font-medium">Samo ono što imam</p>
            <p className="text-sm text-muted">
              {options.strict ? "Bez kupovine — strogo od tvojih namirnica" : "Može 2-3 namirnice da se dokupi"}
            </p>
          </div>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${options.strict ? "bg-accent" : "bg-border"}`}
          >
            <motion.span
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
              animate={{ left: options.strict ? 22 : 2 }}
              transition={{ type: "spring", stiffness: 600, damping: 35 }}
            />
          </span>
        </button>

        <div className="mt-6">
          <Label>Posebne želje</Label>
          <textarea
            value={options.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="npr. nešto azijsko, bez rerne…"
            rows={2}
            maxLength={300}
            className="w-full resize-none rounded-2xl border border-border bg-surface-2/50 p-3.5 outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
            {NOTE_IDEAS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set("note", options.note ? `${options.note.replace(/[,\s]+$/, "")}, ${n.toLowerCase()}` : n)}
                className="h-8 shrink-0 rounded-full border border-dashed border-border px-3 text-sm text-muted active:bg-surface-2"
              >
                + {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-safe sticky bottom-0 bg-gradient-to-t from-surface via-surface to-transparent px-5 pt-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onCook}
          className="bg-accent-gradient flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-[0_14px_30px_-10px_var(--glow)]"
        >
          <Sparkles className="h-5 w-5" /> Predloži mi jela
        </motion.button>
      </div>
    </Sheet>
  );
}
