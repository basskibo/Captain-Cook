"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookHeart, ChefHat, Lock, SlidersHorizontal, RefreshCw, ShoppingBasket, ShoppingCart, Sparkles, UtensilsCrossed } from "lucide-react";
import { ALL_INGREDIENTS, type Ingredient } from "@/lib/ingredients";
import { EMPTY_PROFILE, type Recipe, type ShoppingItem, type TasteProfile } from "@/lib/types";
import { usePersistentState } from "@/lib/use-persistent-state";
import { readNdjson } from "@/lib/ndjson";
import { PantryView } from "./pantry-view";
import { OptionsSheet, defaultMealType, type CookOptions } from "./options-sheet";
import { RecipeCard } from "./recipe-card";
import { CookingAnimation } from "./cooking-animation";
import { RecipeDetail } from "./recipe-detail";
import { ScanSheet, type ScanInput } from "./scan-sheet";
import { TimerTray } from "./timer-tray";
import { ShoppingView } from "./shopping-view";
import { ProfileSheet, profileSummary } from "./profile-sheet";
import { useTimers } from "@/lib/timers";

type Tab = "pantry" | "recipes" | "saved" | "shopping";

const TABS: { id: Tab; label: string; icon: typeof ShoppingBasket }[] = [
  { id: "pantry", label: "Namirnice", icon: ShoppingBasket },
  { id: "recipes", label: "Predlozi", icon: UtensilsCrossed },
  { id: "saved", label: "Sačuvano", icon: BookHeart },
  { id: "shopping", label: "Kupovina", icon: ShoppingCart },
];

const LOADING_LINES = [
  "Zagrevam tiganj…",
  "Listam bakine sveske…",
  "Seckam luk (bez suza)…",
  "Probam da li treba soli…",
  "Konsultujem se sa šefom…",
  "Slažem tanjire…",
];

const MAX_RESULTS = 12;

function guessEmoji(name: string) {
  const n = name.toLowerCase();
  const map: [RegExp, string][] = [
    [/riba|som|šaran|pastrmk|skuš|sardin/, "🐟"],
    [/meso|teletin|jagnjet|ćuret|pačj/, "🥩"],
    [/sir|cheese/, "🧀"],
    [/hleb|lepinj|kifl|baget/, "🥖"],
    [/vino/, "🍷"],
    [/pivo/, "🍺"],
    [/orah|bade|lešnik|semenk/, "🌰"],
    [/kupin|malin|višn|trešn|grožđ|šljiv|kajsij|bresk|dinj|lubenic/, "🍒"],
    [/salat|rukol|blitv|kelj|zelje/, "🥬"],
    [/čili|ljut/, "🌶️"],
    [/sos|preliv/, "🥫"],
    [/banan/, "🍌"],
    [/ruzmarin|timijan|majčin|lovor|nana|mirođij|kim\b|kurkum|cimet|začin/, "🌿"],
    [/jaj/, "🥚"],
    [/mlek|jogurt|kefir/, "🥛"],
    [/pirinač|riža/, "🍚"],
    [/testenin|špaget|makaron/, "🍝"],
    [/krompir/, "🥔"],
    [/luk/, "🧅"],
    [/paradajz/, "🍅"],
    [/piletin|piletina|ćuretin|batak|krilc/, "🍗"],
    [/šunk|slanin|kobasic|viršl/, "🥓"],
    [/pečurk|šampinjon|vrganj/, "🍄"],
    [/limun|limet/, "🍋"],
    [/jabuk/, "🍎"],
    [/med\b/, "🍯"],
  ];
  return map.find(([re]) => re.test(n))?.[1] ?? "🥄";
}

export function Kitchen({ onLocked }: { onLocked: () => void }) {
  const [tab, setTab] = useState<Tab>("pantry");
  const [custom, setCustom] = usePersistentState<Ingredient[]>("cc.custom", []);
  const [selectedList, setSelectedList] = usePersistentState<string[]>("cc.selected", []);
  const [results, setResults] = usePersistentState<Recipe[]>("cc.results", []);
  const [saved, setSaved] = usePersistentState<Recipe[]>("cc.saved", []);
  const [shopping, setShopping] = usePersistentState<ShoppingItem[]>("cc.shopping", []);
  const [profile, setProfile] = usePersistentState<TasteProfile>("cc.profile", EMPTY_PROFILE);
  const [profileOpen, setProfileOpen] = useState(false);
  const [options, setOptions, optionsHydrated] = usePersistentState<CookOptions>("cc.options", {
    mealType: "rucak",
    maxTime: 30,
    servings: 2,
    strict: false,
    note: "",
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [loadingLine, setLoadingLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState<ScanInput | null>(null);
  const timers = useTimers();

  const selected = useMemo(() => new Set(selectedList), [selectedList]);
  const savedIds = useMemo(() => new Set(saved.map((r) => r.id)), [saved]);

  // Obrok po dobu dana pri svakom otvaranju aplikacije.
  useEffect(() => {
    if (optionsHydrated) setOptions((o) => ({ ...o, mealType: defaultMealType() }));
  }, [optionsHydrated, setOptions]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setLoadingLine((n) => (n + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [loading]);

  const cookingEmojis = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of [...ALL_INGREDIENTS, ...custom]) map.set(i.id, i.emoji);
    return selectedList.map((id) => map.get(id)).filter((e): e is string => !!e && e !== "🥄");
  }, [selectedList, custom]);

  const lookup = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const i of [...ALL_INGREDIENTS, ...custom]) map.set(i.id, i);
    return map;
  }, [custom]);

  const toggle = useCallback(
    (id: string) => setSelectedList((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])),
    [setSelectedList],
  );

  const addCustom = (name: string) => {
    const clean = name.charAt(0).toUpperCase() + name.slice(1);
    const id = clean.toLowerCase();
    setCustom((c) => (c.some((i) => i.id === id) ? c : [{ id, name: clean, emoji: guessEmoji(clean) }, ...c]));
    setSelectedList((l) => (l.includes(id) ? l : [...l, id]));
  };

  const addMany = (ids: string[], extra: string[]) => {
    const newCustom = extra
      .map((name) => ({ id: name.toLowerCase(), name, emoji: guessEmoji(name) }))
      .filter((i) => !lookup.has(i.id));
    if (newCustom.length) setCustom((c) => [...newCustom, ...c]);
    const all = [...ids, ...extra.map((e) => e.toLowerCase())];
    setSelectedList((l) => [...l, ...all.filter((id) => !l.includes(id))]);
  };

  const removeCustom = (id: string) => {
    setCustom((c) => c.filter((i) => i.id !== id));
    setSelectedList((l) => l.filter((x) => x !== id));
  };

  const shoppingNames = useMemo(
    () => new Set(shopping.filter((i) => !i.done).map((i) => i.name.toLowerCase())),
    [shopping],
  );

  const addToShopping = (r: Recipe) => {
    const missing = r.ingredients.filter((i) => !i.have && !shoppingNames.has(i.item.toLowerCase()));
    if (!missing.length) return;
    setShopping((list) => [
      ...missing.map((i) => ({ id: crypto.randomUUID(), name: i.item, amount: i.amount, recipe: r.name, done: false })),
      ...list,
    ]);
  };

  /** Kupljene namirnice → označene u frižideru (postojeće se mapiraju, nove postaju „moje“). */
  const moveToPantry = (names: string[]) => {
    const byName = new Map([...lookup.values()].map((i) => [i.name.toLowerCase(), i.id]));
    const ids: string[] = [];
    const extra: string[] = [];
    for (const n of names) {
      const id = byName.get(n.toLowerCase());
      if (id) ids.push(id);
      else extra.push(n);
    }
    addMany(ids, extra);
  };

  const toggleSave = (r: Recipe) =>
    setSaved((s) => (s.some((x) => x.id === r.id) ? s.filter((x) => x.id !== r.id) : [r, ...s]));

  const cook = async (more = false) => {
    setOptionsOpen(false);
    setTab("recipes");
    setError(null);
    setLoading(true);
    setLoadingLine(0);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const base = more ? results : [];
    const batch: Recipe[] = [];
    setStreaming(true);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: selectedList.map((id) => lookup.get(id)?.name ?? id),
          mealType: options.mealType,
          maxTime: options.maxTime,
          servings: options.servings,
          strict: options.strict,
          note: options.note.trim() || undefined,
          exclude: more ? results.map((r) => r.name).slice(0, 30) : undefined,
          profile,
        }),
      });
      if (res.status === 401) {
        onLocked();
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Greška");

      // Recepti stižu jedan po jedan — prikazuj ih odmah.
      type Event = { type: "recipe"; recipe: Recipe } | { type: "error"; error: string } | { type: "done" };
      for await (const event of readNdjson<Event>(res)) {
        if (event.type === "recipe") {
          batch.push(event.recipe);
          setResults([...batch, ...base].slice(0, MAX_RESULTS));
          setLoading(false);
        } else if (event.type === "error") {
          throw new Error(event.error);
        }
      }
    } catch (e) {
      // Ako je deo recepata stigao, zadrži ih i ne prikazuj grešku preko njih.
      if (batch.length === 0) setError(e instanceof Error ? e.message : "Nešto nije u redu");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    onLocked();
  };

  const count = selectedList.length;

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      {/* Header */}
      <header className="pt-safe px-4">
        <div className="flex h-16 items-center gap-3">
          <div className="bg-accent-gradient grid h-10 w-10 place-items-center rounded-2xl text-white shadow-[0_8px_20px_-8px_var(--glow)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted">Captain Cook</p>
            <h1 className="font-display text-xl leading-tight font-bold">{TABS.find((t) => t.id === tab)?.label}</h1>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Moj ukus"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted active:text-text"
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
            {profileSummary(profile) && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" />}
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Zaključaj"
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted active:text-text"
          >
            <Lock className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <main className="px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "pantry" && (
              <PantryView
                custom={custom}
                selected={selected}
                onToggle={toggle}
                onAddCustom={addCustom}
                onRemoveCustom={removeCustom}
                onClear={() => setSelectedList([])}
                onScanImage={(file) => setScanInput({ kind: "image", file })}
              />
            )}

            {tab === "recipes" && (
              <div className="space-y-3 pt-2 pb-32">
                {loading && (
                  <>
                    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-4">
                      <motion.span
                        animate={{ rotate: [0, -15, 15, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="text-2xl"
                      >
                        👨‍🍳
                      </motion.span>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={loadingLine}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="font-medium"
                        >
                          {LOADING_LINES[loadingLine]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    <CookingAnimation emojis={cookingEmojis} />
                  </>
                )}

                {error && !loading && (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-center">
                    <p className="font-medium">{error}</p>
                    <button type="button" onClick={() => cook()} className="mt-2 text-sm font-semibold text-accent">
                      Pokušaj ponovo
                    </button>
                  </div>
                )}

                {!loading && results.length === 0 && !error && (
                  <EmptyState
                    emoji="🍳"
                    title="Još nema predloga"
                    text="Označi šta imaš u kuhinji i pusti šefa da smisli šta da kuvaš."
                    action="Izaberi namirnice"
                    onAction={() => setTab("pantry")}
                  />
                )}

                <AnimatePresence initial={false}>
                  {results.map((r, i) => (
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                      index={i}
                      saved={savedIds.has(r.id)}
                      onOpen={() => setOpenRecipe(r)}
                      onToggleSave={() => toggleSave(r)}
                    />
                  ))}
                </AnimatePresence>

                {streaming && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-3xl border border-dashed border-border p-4 text-muted"
                  >
                    <motion.span
                      animate={{ rotate: [0, -15, 15, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="text-xl"
                    >
                      👨‍🍳
                    </motion.span>
                    <span className="text-sm font-medium">Šef smišlja još jedan predlog…</span>
                  </motion.div>
                )}

                {!streaming && results.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => cook(true)}
                      disabled={count === 0}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface font-semibold disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" /> Još predloga
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => setResults([])}
                      className="h-12 rounded-2xl px-4 text-sm font-medium text-muted"
                    >
                      Očisti
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "shopping" && (
              <ShoppingView items={shopping} onChange={setShopping} onMoveToPantry={moveToPantry} />
            )}

            {tab === "saved" && (
              <div className="space-y-3 pt-2 pb-32">
                {saved.length === 0 ? (
                  <EmptyState
                    emoji="💛"
                    title="Nema sačuvanih recepata"
                    text="Tapni srce na receptu koji ti se dopadne i ovde će te čekati."
                  />
                ) : (
                  <AnimatePresence initial={false}>
                    {saved.map((r, i) => (
                      <RecipeCard
                        key={r.id}
                        recipe={r}
                        index={i}
                        saved
                        onOpen={() => setOpenRecipe(r)}
                        onToggleSave={() => toggleSave(r)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Donja traka: CTA + navigacija */}
      <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4">
        {timers.length > 0 && (
          <div className="pointer-events-auto mb-3">
            <TimerTray />
          </div>
        )}
        <AnimatePresence>
          {tab === "pantry" && count > 0 && (
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setOptionsOpen(true)}
              className="bg-accent-gradient pointer-events-auto mb-3 flex h-14 w-full items-center justify-between rounded-2xl pr-2 pl-5 text-white shadow-[0_16px_36px_-10px_var(--glow)]"
            >
              <span className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5" /> Šta da skuvam?
              </span>
              <motion.span
                key={count}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="grid h-10 min-w-10 place-items-center rounded-xl bg-white/20 px-2 font-bold"
              >
                {count}
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>

        <nav className="pointer-events-auto flex rounded-[22px] border border-border bg-surface/85 p-1.5 shadow-xl backdrop-blur-xl">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            const badge =
              t.id === "recipes"
                ? results.length
                : t.id === "saved"
                  ? saved.length
                  : t.id === "shopping"
                    ? shopping.filter((i) => !i.done).length
                    : count;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl bg-surface-2"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">
                  <Icon className={`h-5 w-5 ${active ? "text-accent" : "text-muted"}`} strokeWidth={active ? 2.3 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                      {badge}
                    </span>
                  )}
                </span>
                <span className={`relative text-[11px] font-semibold ${active ? "text-text" : "text-muted"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <OptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        options={options}
        onChange={setOptions}
        onCook={() => cook()}
        count={count}
        profileSummary={profileSummary(profile)}
        onEditProfile={() => {
          setOptionsOpen(false);
          setProfileOpen(true);
        }}
      />

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} profile={profile} onChange={setProfile} />

      <ScanSheet
        input={scanInput}
        onClose={() => setScanInput(null)}
        onAdd={addMany}
        lookup={lookup}
        selected={selected}
        customNames={custom.map((c) => c.name)}
        onUnauthorized={onLocked}
      />

      <RecipeDetail
        recipe={openRecipe}
        saved={openRecipe ? savedIds.has(openRecipe.id) : false}
        onClose={() => setOpenRecipe(null)}
        onToggleSave={() => openRecipe && toggleSave(openRecipe)}
        shoppingNames={shoppingNames}
        onAddToShopping={() => openRecipe && addToShopping(openRecipe)}
      />
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  text,
  action,
  onAction,
}: {
  emoji: string;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-16 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="grid h-24 w-24 place-items-center rounded-[32px] bg-surface-2 text-5xl"
      >
        {emoji}
      </motion.div>
      <h2 className="mt-5 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-xs text-muted">{text}</p>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-11 rounded-2xl bg-text px-5 font-semibold text-bg"
        >
          {action}
        </button>
      )}
    </motion.div>
  );
}
