"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { Sheet } from "./sheet";

type Mode = "register" | "login" | "forgot";

const BENEFITS = ["AI predlozi jela od tvojih namirnica", "Recepti i lista za kupovinu na svim uređajima", "Tvoj ukus i alergije uvek zapamćeni"];

const input =
  "h-12 w-full rounded-2xl border border-border bg-surface-2/40 px-4 outline-none placeholder:text-muted focus:border-accent";

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  minLength: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className={`${input} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Sakrij lozinku" : "Prikaži lozinku"}
        className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted"
      >
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="bg-accent-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-lg font-semibold text-white disabled:opacity-60"
    >
      {busy && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
      {error}
    </p>
  );
}

export function AuthSheet() {
  const { prompt, closePrompt, login, register, forgotPassword, resetToken, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- očisti stanje pri novom otvaranju
    if (prompt) setError(null);
  }, [prompt]);

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const err = await action();
    setBusy(false);
    if (err) setError(err);
    return !err;
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSentTo(null);
  };

  // ---------- Nova lozinka (link iz mejla) ----------
  if (resetToken) {
    return (
      <Sheet open={!!prompt} onClose={closePrompt} label="Nova lozinka">
        <div className="px-5 pb-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold">Postavi novu lozinku 🔑</h2>
          <p className="mt-1 text-sm text-muted">Posle toga si odmah prijavljen. Stare sesije na drugim uređajima se odjavljuju.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (password !== confirm) return setError("Lozinke se ne poklapaju.");
              if (await run(() => resetPassword(password))) {
                setPassword("");
                setConfirm("");
              }
            }}
            className="mt-5 space-y-3"
          >
            <PasswordInput value={password} onChange={setPassword} placeholder="Nova lozinka (bar 8 karaktera)" autoComplete="new-password" minLength={8} />
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Ponovi novu lozinku" autoComplete="new-password" minLength={8} />
            <ErrorText error={error} />
            <SubmitButton busy={busy}>Sačuvaj novu lozinku</SubmitButton>
          </form>
        </div>
      </Sheet>
    );
  }

  // ---------- Zaboravljena lozinka ----------
  if (mode === "forgot") {
    return (
      <Sheet open={!!prompt} onClose={closePrompt} label="Zaboravljena lozinka">
        <div className="px-5 pb-6 lg:px-8">
          <button type="button" onClick={() => switchMode("login")} className="mb-3 flex items-center gap-1 text-sm font-medium text-muted hover:text-text">
            <ArrowLeft className="h-4 w-4" /> Nazad na prijavu
          </button>
          {sentTo ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok-soft text-ok">
                <MailCheck className="h-7 w-7" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold">Proveri mejl</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Ako postoji nalog za <b className="text-text">{sentTo}</b>, poslali smo link za novu lozinku. Link važi 1 sat. Pogledaj i
                folder za neželjenu poštu.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">Zaboravljena lozinka</h2>
              <p className="mt-1 text-sm text-muted">Unesi email naloga i poslaćemo ti link za novu lozinku.</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => forgotPassword(email))) setSentTo(email.trim());
                }}
                className="mt-5 space-y-3"
              >
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
                <ErrorText error={error} />
                <SubmitButton busy={busy}>Pošalji link</SubmitButton>
              </form>
            </>
          )}
        </div>
      </Sheet>
    );
  }

  // ---------- Registracija / prijava ----------
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

        <div className="mt-5 flex rounded-2xl bg-surface-2 p-1">
          {(["register", "login"] as const).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)} className="relative flex-1 rounded-xl py-2.5 text-sm font-medium">
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
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => (mode === "login" ? login(email, password) : register(email, password, name)));
            if (ok) setPassword("");
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
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder={mode === "register" ? "Lozinka (bar 8 karaktera)" : "Lozinka"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={mode === "register" ? 8 : 1}
          />
          {mode === "login" && (
            <div className="flex justify-end">
              <button type="button" onClick={() => switchMode("forgot")} className="text-sm font-medium text-accent hover:underline">
                Zaboravljena lozinka?
              </button>
            </div>
          )}

          <ErrorText error={error} />
          <SubmitButton busy={busy}>{mode === "login" ? "Prijavi se" : "Napravi nalog"}</SubmitButton>
        </form>

        <p className="mt-4 text-center text-xs text-muted">Bez naloga možeš da biraš namirnice i vodiš listu na ovom uređaju.</p>
      </div>
    </Sheet>
  );
}
