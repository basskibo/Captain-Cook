"use client";

import { useEffect } from "react";
import { MotionConfig, MotionGlobalConfig } from "motion/react";
import { AuthProvider } from "@/lib/auth-client";
import { Kitchen } from "./kitchen";
import { AuthSheet } from "./auth-sheet";

// Samo za lokalno testiranje: ?noanim isključuje animacije.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production" && location.search.includes("noanim")) {
  MotionGlobalConfig.skipAnimations = true;
}

export function AppShell() {
  useEffect(() => {
    // Service worker samo u produkciji (u dev modu bi keš smetao).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Kitchen />
        <AuthSheet />
      </AuthProvider>
    </MotionConfig>
  );
}
