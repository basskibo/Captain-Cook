"use client";

import { useSyncExternalStore } from "react";

/** Globalni tajmeri za kuvanje — rade i kad se zatvori režim kuvanja. */

export interface CookTimer {
  id: string;
  label: string;
  durationMs: number;
  endsAt: number;
  /** Preostalo vreme u trenutku poslednjeg osvežavanja (za čist render). */
  remainingMs: number;
  done: boolean;
}

let timers: CookTimer[] = [];
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;
let audio: AudioContext | null = null;

function emit() {
  const now = Date.now();
  timers = timers.map((t) => ({ ...t, remainingMs: Math.max(0, t.endsAt - now) }));
  listeners.forEach((l) => l());
}

function beep() {
  if (!audio) return;
  const now = audio.currentTime;
  for (let i = 0; i < 6; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = i % 2 ? 880 : 1175;
    gain.gain.setValueAtTime(0.0001, now + i * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.4, now + i * 0.35 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + i * 0.35);
    osc.stop(now + i * 0.35 + 0.32);
  }
}

function alarm(t: CookTimer) {
  beep();
  try {
    navigator.vibrate?.([400, 150, 400, 150, 800]);
  } catch {}
  try {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification("⏰ Tajmer je gotov!", { body: t.label, icon: "/icon.svg", tag: t.id });
    }
  } catch {}
}

function tick() {
  const now = Date.now();
  let changed = false;
  for (const t of timers) {
    if (!t.done && t.endsAt <= now) {
      t.done = true;
      changed = true;
      alarm(t);
    }
  }
  // Svake sekunde osveži prikaz (odbrojavanje)
  if (changed || timers.some((t) => !t.done)) emit();
  if (!timers.some((t) => !t.done) && interval) {
    clearInterval(interval);
    interval = null;
  }
}

export function startTimer(label: string, minutes: number) {
  // Zvuk i obaveštenja moraju da se "otključaju" na korisnikov tap.
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {}
  try {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  } catch {}

  const durationMs = Math.round(minutes * 60_000);
  timers.push({
    id: crypto.randomUUID(),
    label,
    durationMs,
    endsAt: Date.now() + durationMs,
    remainingMs: durationMs,
    done: false,
  });
  emit();
  interval ??= setInterval(tick, 1000);
}

export function removeTimer(id: string) {
  timers = timers.filter((t) => t.id !== id);
  emit();
}

export function addMinute(id: string) {
  const t = timers.find((x) => x.id === id);
  if (!t) return;
  t.endsAt = Math.max(t.endsAt, Date.now()) + 60_000;
  t.durationMs += 60_000;
  t.done = false;
  emit();
  interval ??= setInterval(tick, 1000);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const empty: CookTimer[] = [];

export function useTimers() {
  return useSyncExternalStore(
    subscribe,
    () => timers,
    () => empty,
  );
}

export function formatRemaining(t: CookTimer) {
  const total = Math.ceil(t.remainingMs / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

/** Pronalazi trajanja u tekstu koraka, npr. "kuvajte 10-12 minuta", "pola sata", "1 sat". */
export function findDurations(text: string): { label: string; minutes: number }[] {
  const out: { label: string; minutes: number }[] = [];
  const t = text.toLowerCase();

  if (/\bsat i po\b/.test(t)) out.push({ label: "1 h 30 min", minutes: 90 });
  else if (/\bpola sata\b/.test(t)) out.push({ label: "30 min", minutes: 30 });

  const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|do)\s*(\d+(?:[.,]\d+)?))?\s*(sat[ai]?|h\b|minut[aei]?|min\b|sekund[aei]?|sek\b|s\b)/g;
  for (const m of t.matchAll(re)) {
    const a = parseFloat(m[1].replace(",", "."));
    const b = m[2] ? parseFloat(m[2].replace(",", ".")) : null;
    const unit = m[3];
    const factor = unit.startsWith("sat") || unit === "h" ? 60 : unit.startsWith("s") ? 1 / 60 : 1;
    const minutes = a * factor; // donja granica — bolje proveriti ranije
    if (minutes <= 0 || minutes > 600) continue;
    const short = factor === 60 ? "h" : factor === 1 ? "min" : "s";
    const label = `${m[1]}${b ? `–${m[2]}` : ""} ${short}`;
    if (!out.some((o) => o.minutes === minutes)) out.push({ label, minutes });
  }
  return out;
}
