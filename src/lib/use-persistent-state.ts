"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRemote, getSyncStatus, isEmptyValue, mergeFirstSync, pushKey, subscribeKey, useAuthEpoch, type SyncEntry } from "./sync";

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
  const initialRef = useRef(initial);
  // Pri prijavi/odjavi se sinhronizacija pokreće iznova (za drugog korisnika).
  const epoch = useAuthEpoch();

  useEffect(() => {
    let hasLocal = false;
    try {
      const raw = localStorage.getItem(key);
      hasLocal = raw !== null;
       
      setValue(raw !== null ? (JSON.parse(raw) as T) : initialRef.current);
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
      const lt = localT();
      const local = hasLocal ? (JSON.parse(localStorage.getItem(key)!) as unknown) : undefined;

      if (lt === 0) {
        // Prva sinhronizacija ovog uređaja: spoji, nemoj prepisati.
        if (!entry) {
          if (!isEmptyValue(local)) {
            const t = Date.now();
            localStorage.setItem(tKey, String(t));
            pushKey(key, local, t);
          }
          return;
        }
        const merged = mergeFirstSync(local, entry.v);
        if (JSON.stringify(merged) === JSON.stringify(entry.v)) {
          apply(entry);
        } else {
          const t = Date.now();
          localStorage.setItem(tKey, String(t));
          localStorage.setItem(key, JSON.stringify(merged));
          setValue(merged as T);
          pushKey(key, merged, t);
        }
        return;
      }

      if (entry && entry.t > lt) apply(entry);
      else if (local !== undefined && (!entry || lt > entry.t)) pushKey(key, local, lt);
    });
    return unsubscribe;
  }, [key, tKey, sync, epoch]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Vremenska oznaka samo kad sinhronizacija radi (prijavljen korisnik). Gostove izmene
      // ostaju bez oznake, pa se pri prijavi SPAJAJU sa nalogom umesto da ga prepišu.
      if (sync && dirty.current && getSyncStatus() !== "off") {
        dirty.current = false;
        const t = Date.now();
        localStorage.setItem(tKey, String(t));
        pushKey(key, value, t);
      }
      dirty.current = false;
    } catch {}
  }, [key, tKey, value, hydrated, sync]);

  const update = useCallback((v: T | ((prev: T) => T)) => {
    dirty.current = true;
    setValue(v);
  }, []);
  return [value, update, hydrated] as const;
}
