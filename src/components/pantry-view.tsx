"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, Mic, Plus, Search, Sparkles, Square, X } from "lucide-react";
import { useSpeech } from "@/lib/use-speech";
import { usePersistentState } from "@/lib/use-persistent-state";
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
          "flex h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium transition-colors",
          onRemove ? "pr-9" : "",
          selected
            ? "border-accent/60 bg-accent/10 text-accent"
            : "border-border bg-surface text-text hover:border-muted/50 active:bg-surface-2",
        ].join(" ")}
      >
        {selected && !onRemove && <Check className="-ml-1 h-4 w-4" strokeWidth={2.6} />}
        {item.name}
      </motion.button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Ukloni ${item.name} sa liste`}
          className={[
            "absolute top-1/2 right-1.5 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full",
            selected ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted",
          ].join(" ")}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>
      )}
    </motion.div>
  );
}

function SelectedCard({
  items,
  onToggle,
  onClear,
}: {
  items: Ingredient[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          U frižideru <span className="text-accent-gradient">{items.length}</span>
        </h2>
        <button type="button" onClick={onClear} className="text-sm font-medium text-muted active:text-text">
          Očisti
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((i) => (
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
              {i.name}
              <X className="h-3.5 w-3.5 text-muted" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function PantryView({
  custom,
  selected,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onClear,
  onScanImage,
  onVoice,
  onCook,
}: {
  custom: Ingredient[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAddCustom: (name: string) => void;
  onRemoveCustom: (id: string) => void;
  onClear: () => void;
  onScanImage: (file: File) => void;
  onVoice: (text: string) => void;
  /** Desktop: dugme „Šta da skuvam?“ u bočnom panelu. */
  onCook: () => void;
}) {
  const speech = useSpeech(onVoice);
  const [onboarded, setOnboarded] = usePersistentState("cc.onboarded", false);
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
    <div className="pb-36 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10 lg:pb-16">
      <div className="min-w-0">
      {/* Pretraga + dodavanje */}
      <div className="sticky top-0 z-10 -mx-4 bg-bg/85 px-4 pt-2 pb-3 backdrop-blur-xl">
        <div className="flex gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
          className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-surface pr-1.5 pl-3.5 focus-within:border-accent"
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
          {speech.supported && !query && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              aria-label={speech.listening ? "Zaustavi slušanje" : "Izgovori namirnice"}
              className={`relative grid h-9 w-9 place-items-center rounded-xl ${speech.listening ? "bg-danger text-white" : "text-muted"}`}
            >
              {speech.listening && (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-danger"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                />
              )}
              {speech.listening ? <Square className="relative h-3.5 w-3.5" fill="currentColor" /> : <Mic className="h-5 w-5" />}
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
        <label
          className="flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 font-medium text-text hover:border-muted/50 active:scale-95 lg:px-4"
          aria-label="Slikaj frižider"
          title="Slikaj frižider — AI prepozna namirnice"
        >
          <Camera className="h-5 w-5 text-accent" />
          <span className="hidden text-sm lg:inline">Slikaj frižider</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onScanImage(file);
              e.target.value = "";
            }}
          />
        </label>
        </div>

        <AnimatePresence>
          {(speech.listening || speech.error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3">
                <span className="text-xl">{speech.error ? "🙉" : "🎙️"}</span>
                <p className="min-w-0 flex-1 text-sm">
                  {speech.error ?? (speech.interim ? `„${speech.interim}“` : "Slušam… reci npr. „imam jaja, crni luk i sir“")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filteri kategorija */}
        {!query && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
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
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kratak vodič za nove korisnike */}
      <AnimatePresence initial={false}>
        {!onboarded && !query && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="relative mb-5 rounded-3xl border border-border bg-surface p-4 pr-12">
              <p className="font-display text-lg font-semibold">Kako radi?</p>
              <ol className="mt-2 grid gap-2 text-sm text-muted sm:grid-cols-3">
                {[
                  "Označi šta imaš u kuhinji — ili slikaj frižider.",
                  "Klikni „Predloži jela“ i AI smisli 3 recepta.",
                  "Kuvaj korak po korak, uz tajmere.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setOnboarded(true)}
                aria-label="Sakrij uputstvo"
                className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Izabrano */}
      <AnimatePresence initial={false}>
        {selectedItems.length > 0 && !query && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="mb-5">
              <SelectedCard items={selectedItems} onToggle={onToggle} onClear={onClear} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Kategorije */}
      <div className="space-y-6">
        {sections.map((c) => (
          <section key={c.id}>
            <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
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

      {/* Desktop: bočni panel sa izabranim namirnicama */}
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:space-y-4 lg:pt-2">
        {selectedItems.length > 0 ? (
          <SelectedCard items={selectedItems} onToggle={onToggle} onClear={onClear} />
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-6 text-center">
            <p className="text-4xl">🧺</p>
            <p className="mt-3 font-display text-lg font-semibold">Frižider je prazan</p>
            <p className="mt-1 text-sm text-muted">Klikni namirnice levo, slikaj frižider ili ih izgovori.</p>
          </div>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={selectedItems.length === 0}
          onClick={onCook}
          title={selectedItems.length === 0 ? "Prvo označi bar jednu namirnicu" : undefined}
          className="bg-accent-gradient flex h-14 w-full items-center justify-between rounded-2xl pr-2 pl-5 text-white shadow-[0_16px_36px_-10px_var(--glow)] transition-opacity hover:brightness-105 disabled:opacity-40"
        >
          <span className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5" /> Predloži jela
          </span>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-sm font-semibold">
            {selectedItems.length} namirnica
          </span>
        </motion.button>
      </aside>
    </div>
  );
}
