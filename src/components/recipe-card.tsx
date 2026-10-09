"use client";

import { motion } from "motion/react";
import { Clock, Flame, Gauge, Heart, ShoppingBasket } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { DishImage } from "./dish-image";

export function Meta({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) {
  const pill = "flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted";
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={pill}>
        <Clock className="h-3.5 w-3.5" /> {recipe.timeMinutes} min
      </span>
      <span className={pill}>
        <Gauge className="h-3.5 w-3.5" /> {recipe.difficulty}
      </span>
      {recipe.caloriesPerServing && !compact && (
        <span className={pill}>
          <Flame className="h-3.5 w-3.5" /> {recipe.caloriesPerServing} kcal
        </span>
      )}
    </div>
  );
}

export function HeartButton({ active, onClick, className = "" }: { active: boolean; onClick: () => void; className?: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={active ? "Ukloni iz sačuvanih" : "Sačuvaj recept"}
      aria-pressed={active}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${active ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"} ${className}`}
    >
      <motion.span key={String(active)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
        <Heart className="h-5 w-5" fill={active ? "currentColor" : "none"} />
      </motion.span>
    </motion.button>
  );
}

export function RecipeCard({
  recipe,
  index = 0,
  saved,
  onOpen,
  onToggleSave,
}: {
  recipe: Recipe;
  index?: number;
  saved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
}) {
  const missing = recipe.ingredients.filter((i) => !i.have).length;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 260, damping: 26 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="cursor-pointer overflow-hidden rounded-3xl border border-border bg-surface outline-none focus-visible:border-accent"
    >
      {recipe.image ? (
        <>
          <div className="relative">
            <DishImage image={recipe.image} className="aspect-[16/9] w-full" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
            <HeartButton
              active={saved}
              onClick={onToggleSave}
              className={`absolute top-3 right-3 backdrop-blur-md ${saved ? "!bg-white/90" : "!bg-black/30 !text-white"}`}
            />
            <span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-black/30 text-2xl backdrop-blur-md">
              {recipe.emoji}
            </span>
          </div>
          <div className="p-4 pt-3.5">
            <h3 className="font-display text-lg leading-tight font-semibold">{recipe.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{recipe.description}</p>
            <Footer recipe={recipe} missing={missing} />
          </div>
        </>
      ) : (
        <div className="p-4">
          <div className="flex gap-3.5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface-2 text-4xl">{recipe.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 font-display text-lg leading-tight font-semibold">{recipe.name}</h3>
                <HeartButton active={saved} onClick={onToggleSave} className="-mt-1 -mr-1" />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{recipe.description}</p>
            </div>
          </div>
          <Footer recipe={recipe} missing={missing} />
        </div>
      )}
    </motion.article>
  );
}

function Footer({ recipe, missing }: { recipe: Recipe; missing: number }) {
  return (
    <div className="mt-3.5 flex items-center justify-between gap-2">
      <Meta recipe={recipe} compact />
      {missing > 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
          <ShoppingBasket className="h-3.5 w-3.5" /> fali {missing}
        </span>
      ) : (
        <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">Imaš sve ✓</span>
      )}
    </div>
  );
}
