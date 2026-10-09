"use client";

import { useEffect, useState } from "react";
import { detectPlatform } from "@/lib/phone-timer";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Refrigerator, Share2, Trash2, X } from "lucide-react";
import type { ShoppingItem } from "@/lib/types";

function shareText(items: ShoppingItem[]) {
  return [
    "🛒 Lista za kupovinu",
    "",
    ...items.map((i) => `☐ ${i.name}${i.amount ? ` (${i.amount})` : ""}`),
  ].join("\n");
}

function Row({
  item,
  toggle,
  remove,
}: {
  item: ShoppingItem;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <button
        type="button"
        onClick={() => toggle(item.id)}
        aria-pressed={item.done}
        aria-label={item.done ? `Vrati ${item.name}` : `Kupljeno: ${item.name}`}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${item.done ? "border-ok bg-ok text-white" : "border-border"}`}
      >
        {item.done && <Check className="h-4 w-4" strokeWidth={3} />}
      </button>
      <button
        type="button"
        onClick={() => toggle(item.id)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`truncate ${item.done ? "text-muted line-through" : "font-medium"}`}
        >
          {item.name}
        </p>
        {(item.amount || item.recipe) && (
          <p className="truncate text-xs text-muted">
            {item.amount}
            {item.amount && item.recipe && " · "}
            {item.recipe}
          </p>
        )}
      </button>
      <button
        type="button"
        onClick={() => remove(item.id)}
        aria-label={`Obriši ${item.name}`}
        className="grid h-8 w-8 place-items-center rounded-full text-muted active:bg-surface-2"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.li>
  );
}

export function ShoppingView({
  items,
  onChange,
  onMoveToPantry,
}: {
  items: ShoppingItem[];
  onChange: (items: ShoppingItem[]) => void;
  onMoveToPantry: (names: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [shared, setShared] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detekcija platforme posle hidracije
    setIsIos(detectPlatform() === "ios");
  }, []);
  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    if (
      !items.some((i) => !i.done && i.name.toLowerCase() === name.toLowerCase())
    ) {
      onChange([
        {
          id: crypto.randomUUID(),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          done: false,
        },
        ...items,
      ]);
    }
    setDraft("");
  };

  const toggle = (id: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));

  const share = async () => {
    const text = shareText(todo);
    try {
      if (navigator.share)
        await navigator.share({ title: "Lista za kupovinu", text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {}
  };

  return (
    <div className="space-y-4 pt-2 pb-36">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface pr-1.5 pl-4 focus-within:border-accent"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Dodaj na listu…"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          enterKeyHint="done"
          maxLength={60}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Dodaj"
          className="bg-accent-gradient grid h-9 w-9 place-items-center rounded-xl text-white disabled:opacity-40"
        >
          <Plus className="h-5 w-5" strokeWidth={2.6} />
        </button>
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-[32px] bg-surface-2 text-5xl">
            🛒
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold">
            Lista je prazna
          </h2>
          <p className="mt-1.5 max-w-xs text-muted">
            U receptu tapni „Dodaj na listu“ i sve što fali stiže ovde. Možeš
            dodati i ručno.
          </p>
        </div>
      ) : (
        <>
          {todo.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
                  Za kupiti · {todo.length}
                </h3>
                <button
                  type="button"
                  onClick={share}
                  className="flex items-center gap-1 text-sm font-semibold text-accent"
                >
                  {shared ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {shared ? "Kopirano" : isIos ? "U Beleške" : "Podeli"}
                </button>
              </div>
              {isIos && (
                <p className="mb-2 text-xs text-muted">
                  „U Beleške“ otvara meni za deljenje → izaberi <b>Beleške</b> (Notes), WhatsApp ili Podsetnike.
                </p>
              )}
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                <AnimatePresence initial={false}>
                  {todo.map((i) => (
                    <Row key={i.id} item={i} toggle={toggle} remove={remove} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
                  Kupljeno · {done.length}
                </h3>
                <button
                  type="button"
                  onClick={() => onChange(todo)}
                  className="flex items-center gap-1 text-sm font-medium text-muted"
                >
                  <Trash2 className="h-4 w-4" /> Obriši
                </button>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
                <AnimatePresence initial={false}>
                  {done.map((i) => (
                    <Row key={i.id} item={i} toggle={toggle} remove={remove} />
                  ))}
                </AnimatePresence>
              </ul>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onMoveToPantry(done.map((i) => i.name));
                  onChange(todo);
                }}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ok-soft font-semibold text-ok"
              >
                <Refrigerator className="h-5 w-5" /> Prebaci kupljeno u frižider
              </motion.button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
