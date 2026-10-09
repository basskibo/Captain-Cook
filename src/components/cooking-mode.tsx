"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ListChecks, Sun, Timer, X } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { findDurations, startTimer, useTimers } from "@/lib/timers";
import { TimerTray } from "./timer-tray";

/** Drži ekran upaljenim dok je režim kuvanja otvoren. */
function useWakeLock(active: boolean) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) return void sentinel.release();
        setLocked(true);
        sentinel.addEventListener("release", () => setLocked(false));
      } catch {
        setLocked(false);
      }
    };
    // Lock se gubi kad se aplikacija skloni u pozadinu — vrati ga po povratku.
    const onVisible = () => document.visibilityState === "visible" && void request();

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [active]);

  return locked;
}

export function CookingMode({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showIngredients, setShowIngredients] = useState(false);
  const timers = useTimers();
  const wakeLocked = useWakeLock(open);

  const total = recipe.steps.length;
  const last = step === total - 1;
  const durations = findDurations(recipe.steps[step] ?? "");

  const go = (to: number) => {
    if (to < 0 || to >= total) return;
    setDirection(to > step ? 1 : -1);
    setStep(to);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(step + 1);
      else if (e.key === "ArrowLeft") go(step - 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (typeof document === "undefined") return null;

  // Portal: roditeljski sheet ima transform, pa bi "fixed" inače bio relativan na njega.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-bg"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Kuvanje: ${recipe.name}`}
        >
          {/* Zaglavlje */}
          <div className="pt-safe px-4">
            <div className="flex h-14 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Zatvori režim kuvanja"
                className="grid h-10 w-10 place-items-center rounded-full bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {recipe.emoji} {recipe.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  Korak {step + 1} od {total}
                  {wakeLocked && (
                    <>
                      {" · "}
                      <Sun className="h-3 w-3" /> ekran ostaje upaljen
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIngredients((v) => !v)}
                aria-pressed={showIngredients}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium ${showIngredients ? "bg-text text-bg" : "bg-surface-2"}`}
              >
                <ListChecks className="h-4 w-4" /> Sastojci
              </button>
            </div>
            {/* Segmentirani progres */}
            <div className="flex gap-1">
              {recipe.steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Korak ${i + 1}`}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                >
                  <motion.span
                    className="bg-accent-gradient block h-full"
                    initial={false}
                    animate={{ width: i <= step ? "100%" : "0%" }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Sastojci (preklop) */}
          <AnimatePresence>
            {showIngredients && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-4"
              >
                <ul className="mt-3 grid max-h-[35dvh] grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto rounded-2xl bg-surface p-4 text-sm">
                  {recipe.ingredients.map((i, n) => (
                    <li key={n} className="flex justify-between gap-2">
                      <span>{i.item}</span>
                      <span className="shrink-0 text-muted">{i.amount}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Korak — prevuci levo/desno */}
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d * 80, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -80, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 400, damping: 36 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) go(step + 1);
                  else if (info.offset.x > 70) go(step - 1);
                }}
                className="absolute inset-0 flex touch-pan-y flex-col justify-center overflow-y-auto px-6 py-6"
              >
                <span className="bg-accent-gradient mb-5 grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl font-bold text-white">
                  {step + 1}
                </span>
                <p className="font-display text-[26px] leading-snug font-medium text-balance">{recipe.steps[step]}</p>

                {durations.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {durations.map((d) => (
                      <motion.button
                        key={d.label}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => startTimer(`${recipe.emoji} Korak ${step + 1} · ${d.label}`, d.minutes)}
                        className="flex h-12 items-center gap-2 rounded-2xl border-2 border-accent/40 bg-accent/10 px-4 font-semibold text-accent"
                      >
                        <Timer className="h-5 w-5" /> Pokreni tajmer {d.label}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Aktivni tajmeri */}
          {timers.length > 0 && (
            <div className="px-4 pb-3">
              <TimerTray />
            </div>
          )}

          {/* Navigacija */}
          <div className="pb-safe flex gap-3 px-4 pt-1">
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={step === 0}
              aria-label="Prethodni korak"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface-2 disabled:opacity-30"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => (last ? onClose() : go(step + 1))}
              className="bg-accent-gradient flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-[0_14px_30px_-10px_var(--glow)]"
            >
              {last ? (
                "Gotovo, prijatno! 🎉"
              ) : (
                <>
                  Sledeći korak <ChevronRight className="h-6 w-6" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
