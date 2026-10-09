"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { ChefHat, Delete, Lock } from "lucide-react";

type Status = "idle" | "checking" | "error" | "success";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export function PinGate({ pinLength, onUnlock }: { pinLength: number; onUnlock: () => void }) {
  const [pin, setPinState] = useState("");
  // Ref drži tekuću vrednost i kod brzog kucanja (više tastera pre re-rendera).
  const pinRef = useRef("");
  const setPin = useCallback((v: string) => {
    pinRef.current = v;
    setPinState(v);
  }, []);
  const busy = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const shake = useAnimationControls();

  const submit = useCallback(
    async (value: string) => {
      busy.current = true;
      setStatus("checking");
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: value }),
        });
        if (res.ok) {
          setStatus("success");
          vibrate(30);
          setTimeout(onUnlock, 650);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Pogrešan PIN");
      } catch {
        setMessage("Nema konekcije");
      }
      setStatus("error");
      vibrate([40, 60, 40]);
      await shake.start({ x: [0, -14, 12, -9, 6, -3, 0], transition: { duration: 0.45 } });
      setPin("");
      setStatus("idle");
      busy.current = false;
    },
    [onUnlock, shake, setPin],
  );

  const press = useCallback(
    (key: string) => {
      if (busy.current) return;
      const current = pinRef.current;
      if (key === "del") {
        setPin(current.slice(0, -1));
        return;
      }
      if (!/^\d$/.test(key)) return;
      vibrate(8);
      setMessage(null);
      if (current.length >= pinLength) return;
      const next = current + key;
      setPin(next);
      if (next.length === pinLength) void submit(next);
    },
    [pinLength, setPin, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") press("del");
      else if (/^\d$/.test(e.key)) press(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-bg">
      {/* Ambijentalni gradijenti */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-accent opacity-30 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-accent-2 opacity-20 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="pt-safe relative flex flex-1 flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={
            status === "success"
              ? { scale: [1, 1.15, 0.9], opacity: [1, 1, 0], rotate: [0, -8, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={
            status === "success"
              ? { duration: 0.6, ease: "easeInOut" }
              : { type: "spring", stiffness: 260, damping: 20 }
          }
          className="bg-accent-gradient mb-6 grid h-20 w-20 place-items-center rounded-[28px] text-white shadow-[0_20px_50px_-12px_var(--glow)]"
        >
          <ChefHat className="h-10 w-10" strokeWidth={1.7} />
        </motion.div>

        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl font-bold tracking-tight"
        >
          Captain Cook
        </motion.h1>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mt-1.5 flex items-center gap-1.5 text-sm text-muted"
        >
          <Lock className="h-3.5 w-3.5" /> Unesi PIN da otvoriš kuhinju
        </motion.p>

        <motion.div animate={shake} className="mt-10 flex gap-4" aria-label={`Uneto ${pin.length} od ${pinLength} cifara`}>
          {Array.from({ length: pinLength }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <motion.span
                key={i}
                animate={{ scale: filled ? 1 : 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className={[
                  "h-4 w-4 rounded-full border-2 transition-colors duration-200",
                  status === "error"
                    ? "border-danger bg-danger"
                    : status === "success"
                      ? "border-ok bg-ok"
                      : filled
                        ? "bg-accent-gradient border-transparent shadow-[0_0_16px_var(--glow)]"
                        : "border-border bg-transparent",
                ].join(" ")}
              />
            );
          })}
        </motion.div>

        <p className="mt-4 h-5 text-sm font-medium text-danger" role="alert">
          {message}
        </p>
      </div>

      <div className="pb-safe relative mx-auto grid w-full max-w-xs grid-cols-3 gap-4 px-6 pb-8">
        {KEYS.map((key) =>
          key === "" ? (
            <span key="spacer" />
          ) : (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => press(key)}
              aria-label={key === "del" ? "Obriši" : key}
              className={[
                "grid aspect-square place-items-center rounded-full text-2xl font-medium select-none",
                key === "del"
                  ? "text-muted active:bg-surface-2"
                  : "border border-border bg-surface/70 backdrop-blur active:bg-surface-2",
              ].join(" ")}
            >
              {key === "del" ? <Delete className="h-6 w-6" /> : key}
            </motion.button>
          ),
        )}
      </div>
    </div>
  );
}
