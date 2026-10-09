"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimalni tipovi za Web Speech API (nije u svim TS lib-ovima).
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Prepoznavanje govora na srpskom. onFinal dobija ceo izgovoreni tekst kad korisnik završi. */
export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  useEffect(() => {
    // Provera tek posle hidracije, da server i klijent renderuju isto.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detekcija mogućnosti browsera
    setSupported(!!getCtor());
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    const rec = new Ctor();
    rec.lang = "sr-RS";
    rec.interimResults = true;
    rec.continuous = false;
    finalRef.current = "";
    setInterim("");
    setError(null);

    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else live += r[0].transcript;
      }
      setInterim((finalRef.current + live).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("Dozvoli pristup mikrofonu.");
      else if (e.error === "no-speech") setError("Nisam ništa čuo. Probaj ponovo.");
      else if (e.error !== "aborted") setError("Prepoznavanje govora nije uspelo.");
      setTimeout(() => setError(null), 4000);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      const text = finalRef.current.trim();
      if (text) onFinalRef.current(text);
    };

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
