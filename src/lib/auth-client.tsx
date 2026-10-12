"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { bumpAuthEpoch } from "./sync";

export interface User {
  id: string;
  email: string;
  name: string;
}

/** Ključevi koji pripadaju nalogu — brišu se sa uređaja pri odjavi (ostaju u bazi). */
export const ACCOUNT_KEYS = ["cc.custom", "cc.selected", "cc.saved", "cc.shopping", "cc.profile"];

interface AuthPrompt {
  reason?: string;
  onSuccess?: () => void;
}

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  /** Trenutni korisnik bez čekanja na re-render (za callback-ove posle prijave). */
  isLoggedIn: () => boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Otvara prijavu sa razlogom; posle uspešne prijave poziva onSuccess. */
  requireAuth: (prompt?: AuthPrompt) => void;
  prompt: AuthPrompt | null;
  closePrompt: () => void;
  /** Šalje link za novu lozinku; vraća grešku ili null. */
  forgotPassword: (email: string) => Promise<string | null>;
  /** Token iz linka u mejlu (?reset=...), dok korisnik ne postavi novu lozinku. */
  resetToken: string | null;
  resetPassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as { ok: boolean; data: { user?: User; error?: string } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState<AuthPrompt | null>(null);
  const userRef = useRef<User | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const setUser = useCallback((u: User | null, changed: boolean) => {
    userRef.current = u;
    setUserState(u);
    if (changed) bumpAuthEpoch();
  }, []);

  useEffect(() => {
    // Link iz mejla za novu lozinku: /?reset=TOKEN → otvori formu i skloni token iz adrese.
    const token = new URLSearchParams(window.location.search).get("reset");
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- čitanje URL-a posle hidracije
      setResetToken(token);
      setPrompt({});
      const url = new URL(window.location.href);
      url.searchParams.delete("reset");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { user: User | null }) => setUser(d.user, !!d.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [setUser]);

  const afterLogin = useCallback(
    (u: User) => {
      setUser(u, true);
      const done = prompt?.onSuccess;
      setPrompt(null);
      // Sačekaj da se stanje primeni, pa nastavi akciju zbog koje je tražena prijava.
      if (done) setTimeout(done, 50);
    },
    [prompt, setUser],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { ok, data } = await post("/api/auth/login", { email, password });
      if (!ok || !data.user) return data.error ?? "Prijava nije uspela.";
      afterLogin(data.user);
      return null;
    },
    [afterLogin],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { ok, data } = await post("/api/auth/register", { email, password, name });
      if (!ok || !data.user) return data.error ?? "Registracija nije uspela.";
      afterLogin(data.user);
      return null;
    },
    [afterLogin],
  );

  const forgotPassword = useCallback(async (email: string) => {
    const { ok, data } = await post("/api/auth/forgot", { email });
    return ok ? null : (data.error ?? "Slanje nije uspelo.");
  }, []);

  const resetPassword = useCallback(
    async (password: string) => {
      if (!resetToken) return "Link nije ispravan.";
      const { ok, data } = await post("/api/auth/reset", { token: resetToken, password });
      if (!ok || !data.user) return data.error ?? "Promena lozinke nije uspela.";
      setResetToken(null);
      afterLogin(data.user);
      return null;
    },
    [resetToken, afterLogin],
  );

  const clearLocal = () => {
    try {
      for (const k of ACCOUNT_KEYS) {
        localStorage.removeItem(k);
        localStorage.removeItem(`${k}:t`);
      }
    } catch {}
  };

  const logout = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    clearLocal();
    setUser(null, true);
  }, [setUser]);

  const deleteAccount = useCallback(async () => {
    await fetch("/api/auth/account", { method: "DELETE" }).catch(() => {});
    clearLocal();
    setUser(null, true);
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      isLoggedIn: () => !!userRef.current,
      login,
      register,
      logout,
      deleteAccount,
      requireAuth: (p) => setPrompt(p ?? {}),
      prompt,
      closePrompt: () => {
        setPrompt(null);
        setResetToken(null);
      },
      forgotPassword,
      resetToken,
      resetPassword,
    }),
    [user, ready, login, register, logout, deleteAccount, prompt, forgotPassword, resetToken, resetPassword],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti unutar AuthProvider-a");
  return ctx;
}
