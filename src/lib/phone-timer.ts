"use client";

/** Pokretanje sistemskog tajmera telefona (iOS preko Prečica, Android preko sistemske komande). */

export const IOS_SHORTCUT_NAME = "Captain Tajmer";
const SETUP_KEY = "cc.iosShortcut";

export type Platform = "ios" | "android" | "other";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function iosShortcutReady() {
  try {
    return localStorage.getItem(SETUP_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIosShortcutReady() {
  try {
    localStorage.setItem(SETUP_KEY, "1");
  } catch {}
}

export function phoneTimerUrl(platform: Platform, minutes: number, label: string) {
  const seconds = Math.max(1, Math.round(minutes * 60));
  if (platform === "ios") {
    // Prečica prima broj sekundi i pokreće "Start Timer".
    return `shortcuts://run-shortcut?name=${encodeURIComponent(IOS_SHORTCUT_NAME)}&input=text&text=${seconds}`;
  }
  if (platform === "android") {
    return [
      "intent:#Intent",
      "action=android.intent.action.SET_TIMER",
      `i.android.intent.extra.alarm.LENGTH=${seconds}`,
      `S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(label)}`,
      "B.android.intent.extra.alarm.SKIP_UI=false",
      "end",
    ].join(";");
  }
  return null;
}
