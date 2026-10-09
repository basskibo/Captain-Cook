"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRemote, pushKey, subscribeKey, type SyncEntry } from "./sync";

/**
 * useState koji se čuva u localStorage, a uz `sync: true` i sinhronizuje između uređaja.
 * Vrednost se učitava posle hidracije. Novija izmena (po vremenu) pobeđuje.
 */
export function usePersistentState<T>(key: string, initial: T, opts?: { sync?: boolean }) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const sync = !!opts?.sync;
  const tKey = `${key}:t`;
  // Samo izmene korisnika (preko vraćenog setter-a) se šalju na server.
  const dirty = useRef(false);

  useEffect(() => {
    let hasLocal = false;
    try {
      const raw = localStorage.getItem(key);
      hasLocal = raw !== null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- čitanje spoljnog store-a posle hidracije
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
    if (!sync) return;

    const localT = () => Number(localStorage.getItem(tKey) || 0);
    const apply = (e: SyncEntry) => {
      if (e.t <= localT()) return;
      try {
        localStorage.setItem(tKey, String(e.t));
        localStorage.setItem(key, JSON.stringify(e.v));
      } catch {}
      setValue(e.v as T);
    };

    const unsubscribe = subscribeKey(key, apply);
    void fetchRemote().then((data) => {
      if (!data) return;
      const entry = data[key];
      if (entry && entry.t > localT()) apply(entry);
      else if (hasLocal && (!entry || localT() > entry.t)) {
        // Lokalni podaci su noviji (ili server još nema ništa) → pošalji ih.
        const t = localT() || Date.now();
        localStorage.setItem(tKey, String(t));
        pushKey(key, JSON.parse(localStorage.getItem(key)!), t);
      }
    });
    return unsubscribe;
  }, [key, tKey, sync]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (sync && dirty.current) {
        dirty.current = false;
        const t = Date.now();
        localStorage.setItem(tKey, String(t));
        pushKey(key, value, t);
      }
    } catch {}
  }, [key, tKey, value, hydrated, sync]);

  const update = useCallback((v: T | ((prev: T) => T)) => {
    dirty.current = true;
    setValue(v);
  }, []);
  return [value, update, hydrated] as const;
}
