"use client";

import { useSyncExternalStore } from "react";

/** Klijentska strana sinhronizacije između uređaja (preko /api/sync). */

export type SyncEntry = { v: unknown; t: number };
type Remote = Record<string, SyncEntry> | null;

let remote: Promise<Remote> | null = null;
const listeners = new Map<string, Set<(e: SyncEntry) => void>>();
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
const statusListeners = new Set<(s: SyncStatus) => void>();

export type SyncStatus = "off" | "idle" | "saving" | "error";
let status: SyncStatus = "off";

function setStatus(s: SyncStatus) {
  status = s;
  statusListeners.forEach((l) => l(s));
}

export function getSyncStatus() {
  return status;
}

export function onSyncStatus(l: (s: SyncStatus) => void) {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
}

export function fetchRemote(force = false): Promise<Remote> {
  if (!remote || force) {
    remote = fetch("/api/sync", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; data?: Record<string, SyncEntry> } | null) => {
        if (!d?.enabled) {
          setStatus("off");
          return null;
        }
        if (status === "off") setStatus("idle");
        return d.data ?? {};
      })
      .catch(() => null);
  }
  return remote;
}

export function subscribeKey(key: string, fn: (e: SyncEntry) => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
  };
}

/** Povlači najnovije stanje (npr. kad se aplikacija vrati u fokus) i javlja hook-ovima. */
export async function refreshRemote() {
  const data = await fetchRemote(true);
  if (!data) return;
  for (const [key, entry] of Object.entries(data)) listeners.get(key)?.forEach((fn) => fn(entry));
}

export function pushKey(key: string, v: unknown, t: number) {
  if (status === "off") return;
  clearTimeout(pushTimers.get(key));
  pushTimers.set(
    key,
    setTimeout(async () => {
      setStatus("saving");
      try {
        const res = await fetch("/api/sync", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, v, t }),
        });
        setStatus(res.ok ? "idle" : "error");
      } catch {
        setStatus("error");
      }
    }, 800),
  );
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && status !== "off") void refreshRemote();
  });
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => onSyncStatus(l),
    () => status,
    () => "off" as SyncStatus,
  );
}
