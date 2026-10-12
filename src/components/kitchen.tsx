"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookHeart, ChefHat, Cloud, CloudOff, WifiOff, SlidersHorizontal, RefreshCw, ShoppingBasket, ShoppingCart, Sparkles, UtensilsCrossed } from "lucide-react";
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
import { AccountSheet, Avatar } from "./account-sheet";
import { useAuth } from "@/lib/auth-client";
import { useTimers } from "@/lib/timers";
import { useSyncStatus } from "@/lib/sync";
import { useOnline } from "@/lib/use-online";

type Tab = "pantry" | "recipes" | "saved" | "shopping";

const TABS: { id: Tab; label: string; icon: typeof ShoppingBasket }[] = [
  { id: "pantry", label: "Namirnice", icon: ShoppingBasket },
  { id: "recipes", label: "Predlozi", icon: UtensilsCrossed },
  { id: "saved", label: "Sačuvano", icon: BookHeart },
  { id: "shopping", label: "Kupovina", icon: ShoppingCart },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  pantry: "Označi šta imaš u kuhinji — slikaj frižider ili izgovori namirnice.",
  recipes: "Predlozi jela napravljeni od tvojih namirnica.",
  saved: "Recepti kojima se rado vraćaš.",
  shopping: "Sve što treba dokupiti, na jednom mestu.",
};

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

export function Kitchen() {
  const auth = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("pantry");
  const [custom, setCustom] = usePersistentState<Ingredient[]>("cc.custom", [], { sync: true });
  const [selectedList, setSelectedList] = usePersistentState<string[]>("cc.selected", [], { sync: true });
  const [results, setResults] = usePersistentState<Recipe[]>("cc.results", []);
  const [saved, setSaved] = usePersistentState<Recipe[]>("cc.saved", [], { sync: true });
  const [shopping, setShopping] = usePersistentState<ShoppingItem[]>("cc.shopping", [], { sync: true });
  const [profile, setProfile] = usePersistentState<TasteProfile>("cc.profile", EMPTY_PROFILE, { sync: true });
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
  const syncStatus = useSyncStatus();
  const online = useOnline();

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
    if (!auth.isLoggedIn()) {
      auth.requireAuth({
        reason: "AI predlozi jela su dostupni uz besplatan nalog.",
        onSuccess: () => void cook(more),
      });
      return;
    }
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
        auth.requireAuth({ reason: "Sesija je istekla — prijavi se ponovo.", onSuccess: () => void cook(more) });
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

  const scanImage = (file: File) => {
    if (!auth.isLoggedIn()) {
      auth.requireAuth({
        reason: "Prepoznavanje namirnica sa slike radi uz besplatan nalog.",
        onSuccess: () => setScanInput({ kind: "image", file }),
      });
      return;
    }
    setScanInput({ kind: "image", file });
  };

  const voiceInput = (text: string) => {
    if (!auth.isLoggedIn()) {
      auth.requireAuth({
        reason: "Glasovni unos radi uz besplatan nalog.",
        onSuccess: () => setScanInput({ kind: "text", text }),
      });
      return;
    }
    setScanInput({ kind: "text", text });
  };

  /** „Predloži jela“: gost prvo pravi nalog, pa se otvaraju podešavanja obroka. */
  const openOptions = () => {
    if (!auth.isLoggedIn()) {
      auth.requireAuth({
        reason: "AI predlozi jela su dostupni uz besplatan nalog.",
        onSuccess: () => setOptionsOpen(true),
      });
      return;
    }
    setOptionsOpen(true);
  };

  const openAccount = () => (auth.user ? setAccountOpen(true) : auth.requireAuth());

  const count = selectedList.length;

  const badgeFor = (id: Tab) =>
    id === "recipes"
      ? results.length
      : id === "saved"
        ? saved.length
        : id === "shopping"
          ? shopping.filter((i) => !i.done).length
          : count;

  const goTo = (id: Tab) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  const syncBadge = syncStatus !== "off" && (
    <span
      title={syncStatus === "error" ? "Sinhronizacija nije uspela" : "Sinhronizovano između uređaja"}
      className={syncStatus === "error" ? "text-danger" : syncStatus === "saving" ? "animate-pulse text-accent" : "text-ok"}
    >
      {syncStatus === "error" ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
    </span>
  );

  return (
    <div className="mx-auto min-h-dvh max-w-lg lg:flex lg:max-w-7xl lg:gap-10 lg:px-8">
      {/* Desktop: bočni meni */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:py-8">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-accent-gradient grid h-11 w-11 place-items-center rounded-2xl text-white shadow-[0_8px_20px_-8px_var(--glow)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg leading-tight font-bold">Captain Cook</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">Lični AI kuvar {syncBadge}</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            const badge = badgeFor(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(t.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left font-medium transition-colors ${active ? "text-text" : "text-muted hover:bg-surface-2/60 hover:text-text"}`}
              >
                {active && (
                  <motion.span
                    layoutId="side-pill"
                    className="absolute inset-0 rounded-2xl bg-surface-2"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon className={`relative h-5 w-5 ${active ? "text-accent" : ""}`} strokeWidth={active ? 2.3 : 2} />
                <span className="relative flex-1">{t.label}</span>
                {badge > 0 && (
                  <span className="relative grid h-6 min-w-6 place-items-center rounded-full bg-accent/15 px-1.5 text-xs font-bold text-accent">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-muted hover:bg-surface-2/60 hover:text-text"
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
            <span className="flex-1">Moj ukus</span>
            {profileSummary(profile) && <span className="h-2 w-2 rounded-full bg-accent" />}
          </button>
          {auth.user ? (
            <button
              type="button"
              onClick={openAccount}
              className="flex w-full items-center gap-3 rounded-2xl border border-border p-2.5 text-left hover:bg-surface-2/60"
            >
              <Avatar name={auth.user.name} className="h-9 w-9 text-sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{auth.user.name}</span>
                <span className="block truncate text-xs text-muted">{auth.user.email}</span>
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold">Sačuvaj sve na nalogu</p>
              <p className="mt-1 text-xs text-muted">Besplatan nalog za AI predloge i recepte na svim uređajima.</p>
              <button
                type="button"
                onClick={() => auth.requireAuth()}
                className="mt-3 h-10 w-full rounded-xl bg-text text-sm font-semibold text-bg hover:opacity-90"
              >
                Prijavi se / registruj
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
      {/* Mobilno zaglavlje */}
      <header className="pt-safe px-4 lg:hidden">
        <div className="flex h-16 items-center gap-3">
          <div className="bg-accent-gradient grid h-10 w-10 place-items-center rounded-2xl text-white shadow-[0_8px_20px_-8px_var(--glow)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              Captain Cook
              {syncBadge}
            </p>
            <h1 className="font-display text-xl leading-tight font-bold">{TABS.find((t) => t.id === tab)?.label}</h1>
          </div>
          {auth.user ? (
            <button type="button" onClick={openAccount} aria-label="Nalog">
              <Avatar name={auth.user.name} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => auth.requireAuth()}
              className="h-10 rounded-full bg-surface-2 px-4 text-sm font-semibold"
            >
              Prijavi se
            </button>
          )}
        </div>
      </header>

      {/* Desktop naslov */}
      <header className="hidden lg:block lg:pt-10 lg:pb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">{TABS.find((t) => t.id === tab)?.label}</h1>
        <p className="mt-1.5 text-muted">{TAB_SUBTITLES[tab]}</p>
      </header>

      <AnimatePresence>
        {!online && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 lg:px-0"
          >
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm">
              <WifiOff className="h-4 w-4 shrink-0 text-warn" />
              <span>
                <b>Offline si.</b> Sačuvani recepti, lista za kupovinu i tajmeri rade. Za nove predloge treba internet.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="px-4 lg:px-0">
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
                onScanImage={scanImage}
                onVoice={voiceInput}
                onCook={openOptions}
              />
            )}

            {tab === "recipes" && (
              <div className="grid gap-3 pt-2 pb-32 lg:grid-cols-2 lg:gap-5 lg:pb-16 xl:grid-cols-3">
                {loading && (
                  <div className="space-y-3 lg:col-span-full lg:mx-auto lg:w-full lg:max-w-2xl">
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
                  </div>
                )}

                {error && !loading && (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-center lg:col-span-full">
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
                    className="flex items-center gap-3 rounded-3xl border border-dashed border-border p-4 text-muted lg:min-h-40 lg:justify-center"
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
                  <div className="flex gap-2 pt-2 lg:col-span-full lg:mx-auto lg:w-full lg:max-w-md">
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
              <div className="lg:max-w-2xl">
                <ShoppingView items={shopping} onChange={setShopping} onMoveToPantry={moveToPantry} />
              </div>
            )}

            {tab === "saved" && (
              <div className="grid gap-3 pt-2 pb-32 lg:grid-cols-2 lg:gap-5 lg:pb-16 xl:grid-cols-3">
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
      </div>

      {/* Desktop: aktivni tajmeri u donjem desnom uglu */}
      {timers.length > 0 && (
        <div className="fixed right-6 bottom-6 z-30 hidden w-96 lg:block">
          <TimerTray />
        </div>
      )}

      {/* Mobilna donja traka: CTA + navigacija */}
      <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 lg:hidden">
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
              onClick={openOptions}
              className="bg-accent-gradient pointer-events-auto mb-3 flex h-14 w-full items-center justify-between rounded-2xl pr-2 pl-5 text-white shadow-[0_16px_36px_-10px_var(--glow)]"
            >
              <span className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5" /> Predloži jela
              </span>
              <motion.span
                key={count}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="rounded-xl bg-white/20 px-2.5 py-1 text-sm font-semibold"
              >
                {count} namirnica
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>

        <nav className="pointer-events-auto flex rounded-[22px] border border-border bg-surface/85 p-1.5 shadow-xl backdrop-blur-xl">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            const badge = badgeFor(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(t.id)}
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
      />

      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onEditProfile={() => {
          setAccountOpen(false);
          setProfileOpen(true);
        }}
      />

      <RecipeDetail
        recipe={openRecipe}
        saved={openRecipe ? savedIds.has(openRecipe.id) : false}
        onClose={() => setOpenRecipe(null)}
        onToggleSave={() => openRecipe && toggleSave(openRecipe)}
        shoppingNames={shoppingNames}
        onAddToShopping={addToShopping}
        profileNote={profileSummary(profile)}
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-6 py-16 text-center lg:col-span-full lg:py-24"
    >
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
