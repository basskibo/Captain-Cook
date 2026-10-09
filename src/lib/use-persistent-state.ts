"use client";

import { useCallback, useEffect, useState } from "react";

/** useState koji se čuva u localStorage. Vrednost se učitava posle hidracije. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- čitanje spoljnog store-a posle hidracije
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, hydrated]);

  const update = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, update, hydrated] as const;
}
