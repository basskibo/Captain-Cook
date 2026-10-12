"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop raspored (Tailwind `lg`, ≥ 1024px). */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
