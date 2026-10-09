"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellRing, Plus, Timer, X } from "lucide-react";
import { addMinute, formatRemaining, removeTimer, useTimers } from "@/lib/timers";

/** Lista aktivnih tajmera sa odbrojavanjem. */
export function TimerTray() {
  const timers = useTimers();

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {timers.map((t) => {
          const progress = t.done ? 1 : 1 - t.remainingMs / t.durationMs;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={t.done ? { opacity: 1, y: 0, scale: [1, 1.03, 1] } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={t.done ? { scale: { repeat: Infinity, duration: 0.8 } } : undefined}
              className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 shadow-lg backdrop-blur-xl ${t.done ? "border-ok bg-ok-soft" : "border-border bg-surface/90"}`}
            >
              {!t.done && (
                <span
                  className="absolute inset-y-0 left-0 bg-accent/10 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                />
              )}
              <span
                className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.done ? "bg-ok text-white" : "bg-accent/15 text-accent"}`}
              >
                {t.done ? <BellRing className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="truncate text-xs text-muted">{t.label}</p>
                <p className="font-display text-xl leading-tight font-bold tabular-nums">
                  {t.done ? "Gotovo! ⏰" : formatRemaining(t)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addMinute(t.id)}
                aria-label="Dodaj minut"
                className="relative flex h-9 items-center gap-0.5 rounded-xl bg-surface-2 px-2.5 text-sm font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />1
              </button>
              <button
                type="button"
                onClick={() => removeTimer(t.id)}
                aria-label="Ukloni tajmer"
                className="relative grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
