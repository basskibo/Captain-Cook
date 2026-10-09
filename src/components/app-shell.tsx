"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, MotionGlobalConfig, motion } from "motion/react";
import { ChefHat } from "lucide-react";
import { PinGate } from "./pin-gate";
import { Kitchen } from "./kitchen";

type State = { status: "loading" } | { status: "locked"; pinLength: number } | { status: "open" };

// Samo za lokalno testiranje: ?noanim isključuje animacije.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production" && location.search.includes("noanim")) {
  MotionGlobalConfig.skipAnimations = true;
}

export function AppShell() {
  const [state, setState] = useState<State>({ status: "loading" });

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const data = (await res.json()) as { authed: boolean; pinLength: number };
      setState(data.authed ? { status: "open" } : { status: "locked", pinLength: data.pinLength });
    } catch {
      setState({ status: "locked", pinLength: 4 });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- provera sesije pri učitavanju
    void check();
  }, [check]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {state.status === "loading" && (
          <motion.div key="splash" exit={{ opacity: 0 }} className="fixed inset-0 grid place-items-center bg-bg">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="bg-accent-gradient grid h-16 w-16 place-items-center rounded-3xl text-white"
            >
              <ChefHat className="h-8 w-8" />
            </motion.div>
          </motion.div>
        )}
        {state.status === "locked" && (
          <motion.div key="pin" exit={{ opacity: 0 }}>
            <PinGate pinLength={state.pinLength} onUnlock={() => setState({ status: "open" })} />
          </motion.div>
        )}
        {state.status === "open" && (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Kitchen onLocked={() => void check()} />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
