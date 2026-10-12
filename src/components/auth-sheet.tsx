"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { Sheet } from "./sheet";

type Mode = "register" | "login";

const BENEFITS = ["AI predlozi jela od tvojih namirnica", "Recepti i lista za kupovinu na svim uređajima", "Tvoj ukus i alergije uvek zapamćeni"];

export function AuthSheet() {
  const { prompt, closePrompt, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- očisti grešku pri novom otvaranju
    if (prompt) setError(null);
  }, [prompt]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = mode === "login" ? await login(email, password) : await register(email, password, name);
    setBusy(false);
    if (err) setError(err);
    else setPassword("");
  };

  const input =
    "h-12 w-full rounded-2xl border border-border bg-surface-2/40 px-4 outline-none placeholder:text-muted focus:border-accent";

  return (
    <Sheet open={!!prompt} onClose={closePrompt} label={mode === "login" ? "Prijava" : "Registracija"}>
      <div className="px-5 pb-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold">{mode === "login" ? "Dobrodošao nazad 👋" : "Napravi besplatan nalog"}</h2>
        <p className="mt-1 text-sm text-muted">
          {prompt?.reason ?? (mode === "login" ? "Prijavi se da nastaviš gde si stao." : "Traje 10 sekundi.")}
        </p>

        {mode === "register" && (
          <ul className="mt-4 space-y-1.5 rounded-2xl bg-surface-2/50 p-4 text-sm">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-ok">✓</span> {b}
              </li>
            ))}
          </ul>
        )}

        {/* Prijava / registracija */}
        <div className="mt-5 flex rounded-2xl bg-surface-2 p-1">
          {(["register", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className="relative flex-1 rounded-xl py-2.5 text-sm font-medium"
            >
              {mode === m && (
                <motion.span
                  layoutId="auth-mode"
                  className="absolute inset-0 rounded-xl bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className={`relative ${mode === m ? "text-text" : "text-muted"}`}>
                {m === "register" ? "Novi nalog" : "Imam nalog"}
              </span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="mt-4 space-y-3"
        >
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ime (opciono)"
              autoComplete="given-name"
              maxLength={40}
              className={input}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            inputMode="email"
            required
            className={input}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Lozinka (bar 8 karaktera)" : "Lozinka"}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={mode === "register" ? 8 : 1}
              required
              className={`${input} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
              className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>

          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-accent-gradient flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-lg font-semibold text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === "login" ? "Prijavi se" : "Napravi nalog"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Bez naloga možeš da biraš namirnice i vodiš listu na ovom uređaju.
        </p>
      </div>
    </Sheet>
  );
}
