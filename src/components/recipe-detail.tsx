"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Lightbulb, Share2, Users } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { Sheet } from "./sheet";
import { HeartButton, Meta } from "./recipe-card";

function recipeToText(r: Recipe) {
  return [
    `${r.emoji} ${r.name}`,
    r.description,
    "",
    `⏱ ${r.timeMinutes} min · ${r.difficulty} · ${r.servings} porcije`,
    "",
    "Sastojci:",
    ...r.ingredients.map((i) => `• ${i.item}${i.amount ? ` — ${i.amount}` : ""}`),
    "",
    "Priprema:",
    ...r.steps.map((s, n) => `${n + 1}. ${s}`),
    r.tip ? `\n💡 ${r.tip}` : "",
  ].join("\n");
}

function RecipeBody({ recipe, saved, onToggleSave }: { recipe: Recipe; saved: boolean; onToggleSave: () => void }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const progress = recipe.steps.length ? done.size / recipe.steps.length : 0;
  const have = recipe.ingredients.filter((i) => i.have);
  const missing = recipe.ingredients.filter((i) => !i.have);

  const toggleStep = (n: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const share = async () => {
    const text = recipeToText(recipe);
    try {
      if (navigator.share) await navigator.share({ title: recipe.name, text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="px-5 pb-10">
      <div className="flex items-start justify-between">
        <motion.div
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="grid h-20 w-20 place-items-center rounded-3xl bg-surface-2 text-5xl"
        >
          {recipe.emoji}
        </motion.div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={share}
            aria-label="Podeli recept"
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <HeartButton active={saved} onClick={onToggleSave} />
        </div>
      </div>

      <h2 className="mt-4 font-display text-[28px] leading-tight font-bold">{recipe.name}</h2>
      <p className="mt-2 text-muted">{recipe.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Meta recipe={recipe} />
        <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
          <Users className="h-3.5 w-3.5" /> {recipe.servings}
        </span>
      </div>

      <section className="mt-7">
        <h3 className="mb-3 font-display text-xl font-semibold">Sastojci</h3>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {[...have, ...missing].map((i, n) => (
            <li key={n} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${i.have ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}
              >
                {i.have ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="text-xs font-bold">+</span>}
              </span>
              <span className="flex-1">{i.item}</span>
              <span className="text-sm text-muted">{i.amount}</span>
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <p className="mt-2 text-sm text-warn">
            Treba dokupiti: {missing.map((i) => i.item).join(", ")}
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="font-display text-xl font-semibold">Priprema</h3>
          <span className="text-sm text-muted">
            {done.size}/{recipe.steps.length}
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="bg-accent-gradient h-full" animate={{ width: `${progress * 100}%` }} />
        </div>
        <ol className="space-y-2.5">
          {recipe.steps.map((s, n) => {
            const isDone = done.has(n);
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => toggleStep(n)}
                  className={`flex w-full gap-3.5 rounded-2xl border p-3.5 text-left transition-colors ${isDone ? "border-transparent bg-surface-2/60" : "border-border"}`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${isDone ? "bg-ok text-white" : "bg-accent-gradient text-white"}`}
                  >
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : n + 1}
                  </span>
                  <span className={`pt-0.5 leading-relaxed ${isDone ? "text-muted line-through" : ""}`}>{s}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {progress === 1 && (
          <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 text-center text-lg font-semibold">
            🎉 Prijatno!
          </motion.p>
        )}
      </section>

      {recipe.tip && (
        <section className="mt-8 flex gap-3 rounded-2xl bg-warn-soft p-4">
          <Lightbulb className="h-5 w-5 shrink-0 text-warn" />
          <p className="text-sm leading-relaxed">
            <b>Savet šefa:</b> {recipe.tip}
          </p>
        </section>
      )}
    </div>
  );
}

export function RecipeDetail({
  recipe,
  saved,
  onClose,
  onToggleSave,
}: {
  recipe: Recipe | null;
  saved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
}) {
  // Zadrži poslednji recept da sadržaj ostane vidljiv tokom animacije zatvaranja.
  const [shown, setShown] = useState(recipe);
  if (recipe && recipe !== shown) setShown(recipe);

  return (
    <Sheet open={!!recipe} onClose={onClose} full label={shown?.name ?? "Recept"}>
      {shown && <RecipeBody key={shown.id} recipe={shown} saved={saved} onToggleSave={onToggleSave} />}
    </Sheet>
  );
}
