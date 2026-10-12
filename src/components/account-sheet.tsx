"use client";

import { useEffect, useState } from "react";
import { ChevronRight, LogOut, SlidersHorizontal, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useSyncStatus } from "@/lib/sync";
import { Sheet } from "./sheet";

export function Avatar({ name, className = "h-10 w-10 text-base" }: { name: string; className?: string }) {
  return (
    <span className={`bg-accent-gradient grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function AccountSheet({
  open,
  onClose,
  onEditProfile,
}: {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
}) {
  const { user, logout, deleteAccount } = useAuth();
  const sync = useSyncStatus();
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset potvrde pri otvaranju
    setConfirmDelete(false);
    fetch("/api/usage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUsage(u?.limit ? u : null))
      .catch(() => {});
  }, [open, user]);

  if (!user) return null;

  return (
    <Sheet open={open} onClose={onClose} label="Nalog">
      <div className="space-y-5 px-5 pb-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} className="h-14 w-14 text-xl" />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className={`mt-0.5 text-xs ${sync === "error" ? "text-danger" : "text-ok"}`}>
              {sync === "error" ? "Sinhronizacija trenutno ne radi" : "Podaci se čuvaju na nalogu"}
            </p>
          </div>
        </div>

        {usage && (
          <section className="rounded-2xl bg-surface-2/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">AI predlozi danas</span>
              <span className="text-muted tabular-nums">
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full ${usage.used >= usage.limit ? "bg-danger" : "bg-accent-gradient"}`}
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">Limit se resetuje u ponoć.</p>
          </section>
        )}

        <div className="overflow-hidden rounded-2xl border border-border">
          <button
            type="button"
            onClick={onEditProfile}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2/50"
          >
            <SlidersHorizontal className="h-5 w-5 text-muted" />
            <span className="flex-1">
              <span className="block font-medium">Moj ukus</span>
              <span className="block text-xs text-muted">Ishrana, alergije, oprema</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3.5 text-left hover:bg-surface-2/50"
          >
            <LogOut className="h-5 w-5 text-muted" />
            <span className="flex-1 font-medium">Odjavi se</span>
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true);
            await deleteAccount();
            onClose();
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium ${confirmDelete ? "bg-danger text-white" : "text-muted hover:text-danger"}`}
        >
          <Trash2 className="h-4 w-4" />
          {confirmDelete ? "Sigurno? Klikni ponovo — briše nalog i sve podatke" : "Obriši nalog"}
        </button>
      </div>
    </Sheet>
  );
}
