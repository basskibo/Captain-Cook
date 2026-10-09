"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Search, X } from "lucide-react";
import { CATEGORIES, type Ingredient } from "@/lib/ingredients";

const MINE = "moje";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "dj")
    .trim();
}

function Chip({
  item,
  selected,
  onToggle,
  onRemove,
}: {
  item: Ingredient;
  selected: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <motion.div layout="position" className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={onToggle}
        aria-pressed={selected}
        className={[
          "flex h-10 items-center gap-1.5 rounded-full border pr-3.5 pl-2.5 text-[15px] font-medium transition-colors",
          onRemove ? "pr-8" : "",
          selected
            ? "bg-accent-gradient border-transparent text-white shadow-[0_6px_18px_-6px_var(--glow)]"
            : "border-border bg-surface text-text active:bg-surface-2",
        ].join(" ")}
      >
        <span className="text-base leading-none">{item.emoji}</span>
        {item.name}
        {selected && !onRemove && <Check className="-mr-1 h-4 w-4" strokeWidth={2.6} />}
      </motion.button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Ukloni ${item.name} sa liste`}
          className={[
            "absolute top-1/2 right-1.5 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full",
            selected ? "bg-white/25 text-white" : "bg-surface-2 text-muted",
          ].join(" ")}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>
      )}
    </motion.div>
  );
}

export function PantryView({
  custom,
  selected,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onClear,
}: {
  custom: Ingredient[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAddCustom: (name: string) => void;
  onRemoveCustom: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("sve");

  const sections = useMemo(() => {
    const all = [
      ...(custom.length ? [{ id: MINE, name: "Moje namirnice", emoji: "⭐", items: custom }] : []),
      ...CATEGORIES,
    ];
    const q = normalize(query);
    return all
      .filter((c) => q || filter === "sve" || c.id === filter)
      .map((c) => ({ ...c, items: q ? c.items.filter((i) => normalize(i.name).includes(q)) : c.items }))
      .filter((c) => c.items.length > 0);
  }, [custom, query, filter]);

  const lookup = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const c of CATEGORIES) for (const i of c.items) map.set(i.id, i);
    for (const i of custom) map.set(i.id, i);
    return map;
  }, [custom]);

  const exists = query.trim() && lookup.has(query.trim().toLowerCase());
  const selectedItems = [...selected].map((id) => lookup.get(id)).filter(Boolean) as Ingredient[];

  const submitCustom = () => {
    const name = query.trim();
    if (!name) return;
    if (exists) {
      const id = name.toLowerCase();
      if (!selected.has(id)) onToggle(id);
    } else {
      onAddCustom(name);
    }
    setQuery("");
  };

  return (
    <div className="pb-36">
      {/* Pretraga + dodavanje */}
      <div className="sticky top-0 z-10 -mx-4 bg-bg/85 px-4 pt-2 pb-3 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
          className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface pr-1.5 pl-3.5 focus-within:border-accent"
        >
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Traži ili dodaj namirnicu…"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
            enterKeyHint="done"
            autoComplete="off"
            maxLength={40}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="p-1.5 text-muted" aria-label="Obriši pretragu">
              <X className="h-4 w-4" />
            </button>
          )}
          <AnimatePresence>
            {query.trim() && !exists && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-accent-gradient flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} /> Dodaj
              </motion.button>
            )}
          </AnimatePresence>
        </form>

        {/* Filteri kategorija */}
        {!query && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            {[
              { id: "sve", name: "Sve", emoji: "✨" },
              ...(custom.length ? [{ id: MINE, name: "Moje", emoji: "⭐" }] : []),
              ...CATEGORIES,
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={[
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                  filter === c.id ? "bg-text text-bg" : "bg-surface-2 text-muted",
                ].join(" ")}
              >
                <span>{c.emoji}</span>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Izabrano */}
      <AnimatePresence initial={false}>
        {selectedItems.length > 0 && !query && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-5 rounded-3xl border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  U frižideru <span className="text-accent-gradient">{selectedItems.length}</span>
                </h2>
                <button type="button" onClick={onClear} className="text-sm font-medium text-muted active:text-text">
                  Očisti
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {selectedItems.map((i) => (
                    <motion.button
                      key={i.id}
                      layout
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      type="button"
                      onClick={() => onToggle(i.id)}
                      className="flex h-8 items-center gap-1 rounded-full bg-surface-2 pr-2 pl-2.5 text-sm"
                      aria-label={`Ukloni ${i.name}`}
                    >
                      {i.emoji} {i.name}
                      <X className="h-3.5 w-3.5 text-muted" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Kategorije */}
      <div className="space-y-6">
        {sections.map((c) => (
          <section key={c.id}>
            <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              <span className="text-base">{c.emoji}</span>
              {c.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {c.items.map((i) => (
                <Chip
                  key={i.id}
                  item={i}
                  selected={selected.has(i.id)}
                  onToggle={() => onToggle(i.id)}
                  onRemove={c.id === MINE ? () => onRemoveCustom(i.id) : undefined}
                />
              ))}
            </div>
          </section>
        ))}

        {query && sections.length === 0 && (
          <div className="py-10 text-center text-muted">
            <p className="text-4xl">🛒</p>
            <p className="mt-3">
              Nema „{query.trim()}“ na listi.
              <br />
              Pritisni <b className="text-text">Dodaj</b> da je ubaciš.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
