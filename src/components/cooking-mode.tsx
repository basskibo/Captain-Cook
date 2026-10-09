"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, ChevronLeft, ChevronRight, ListChecks, Sun, Timer, X } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { findDurations, formatRemaining, startTimer, useTimers } from "@/lib/timers";
import {
  IOS_SHORTCUT_NAME,
  detectPlatform,
  iosShortcutReady,
  markIosShortcutReady,
  phoneTimerUrl,
  type Platform,
} from "@/lib/phone-timer";
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
  const [platform, setPlatform] = useState<Platform>("other");
  const [shortcutHelp, setShortcutHelp] = useState<{ minutes: number; label: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detekcija platforme posle hidracije
    setPlatform(detectPlatform());
  }, []);

  const openPhoneTimer = (minutes: number, label: string, skipSetup = false) => {
    if (platform === "ios" && !skipSetup && !iosShortcutReady()) {
      setShortcutHelp({ minutes, label });
      return;
    }
    const url = phoneTimerUrl(platform, minutes, label);
    if (url) window.location.href = url;
  };

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
            <div className="flex min-h-14 items-center gap-3 pb-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Zatvori režim kuvanja"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-tight font-semibold">
                  {recipe.emoji} {recipe.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
                  Korak {step + 1} od {total}
                  {wakeLocked && (
                    <span title="Ekran ostaje upaljen" className="flex items-center gap-0.5 text-ok">
                      <Sun className="h-3 w-3" /> ekran upaljen
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIngredients((v) => !v)}
                aria-pressed={showIngredients}
                aria-label="Sastojci"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${showIngredients ? "bg-text text-bg" : "bg-surface-2"}`}
              >
                <ListChecks className="h-5 w-5" />
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
                  <div className="mt-6 space-y-2">
                    {durations.map((d) => {
                      const label = `${recipe.emoji} Korak ${step + 1} · ${d.label}`;
                      const running = timers.find((t) => t.label === label && !t.done);
                      return (
                        <div key={d.label} className="flex flex-wrap gap-2">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.94 }}
                            disabled={!!running}
                            onClick={() => startTimer(label, d.minutes)}
                            className="flex h-12 items-center gap-2 rounded-2xl border-2 border-accent/40 bg-accent/10 px-4 font-semibold text-accent disabled:border-ok/40 disabled:bg-ok-soft disabled:text-ok"
                          >
                            <Timer className="h-5 w-5" />
                            {running ? `Tajmer radi · ${formatRemaining(running)}` : `Pokreni tajmer ${d.label}`}
                          </motion.button>
                          {platform !== "other" && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.94 }}
                              onClick={() => openPhoneTimer(d.minutes, label)}
                              className="flex h-12 items-center gap-2 rounded-2xl bg-surface-2 px-4 font-semibold"
                            >
                              <AlarmClock className="h-5 w-5" /> Na telefonu
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
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

          {/* Jednokratno podešavanje iOS prečice za sistemski tajmer */}
          <AnimatePresence>
            {shortcutHelp && (
              <motion.div
                className="absolute inset-0 z-10 flex items-end bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShortcutHelp(null)}
              >
                <motion.div
                  initial={{ y: 40 }}
                  animate={{ y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="pb-safe w-full rounded-t-[28px] bg-surface px-5 pt-5"
                >
                  <h3 className="font-display text-xl font-bold">⏰ Tajmer na iPhone-u</h3>
                  <p className="mt-1 text-sm text-muted">
                    Safari ne može sam da pokrene sistemski tajmer, ali može preko aplikacije Prečice. Podešava se jednom:
                  </p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px]">
                    <li>
                      Otvori <b>Prečice</b> (Shortcuts) → <b>+</b> nova prečica.
                    </li>
                    <li>
                      Dodaj radnju <b>Pokreni tajmer</b> (Start Timer).
                    </li>
                    <li>
                      Za trajanje izaberi <b>Ulaz u prečicu</b> (Shortcut Input), a za jedinicu <b>sekunde</b>.
                    </li>
                    <li>
                      Nazovi prečicu tačno: <b className="text-accent">{IOS_SHORTCUT_NAME}</b>
                    </li>
                  </ol>
                  <div className="mt-5 flex gap-2 pb-4">
                    <button
                      type="button"
                      onClick={() => setShortcutHelp(null)}
                      className="h-12 flex-1 rounded-2xl bg-surface-2 font-semibold"
                    >
                      Kasnije
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        markIosShortcutReady();
                        const { minutes, label } = shortcutHelp;
                        setShortcutHelp(null);
                        openPhoneTimer(minutes, label, true);
                      }}
                      className="bg-accent-gradient h-12 flex-[2] rounded-2xl font-semibold text-white"
                    >
                      Napravio sam, pokreni
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
