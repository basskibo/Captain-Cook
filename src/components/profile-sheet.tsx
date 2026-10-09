"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Plus, X } from "lucide-react";
import { EMPTY_PROFILE, type TasteProfile } from "@/lib/types";
import { Sheet } from "./sheet";

const DIETS = [
  { id: "", label: "Sve jedem", emoji: "🍽️" },
  { id: "vegetarijanska", label: "Vegetarijanska", emoji: "🥗" },
  { id: "veganska", label: "Veganska", emoji: "🌱" },
  { id: "posna", label: "Posna", emoji: "⛪" },
  { id: "keto", label: "Keto", emoji: "🥑" },
  { id: "low-carb", label: "Malo UH", emoji: "🥩" },
  { id: "visokoproteinska", label: "Proteinska", emoji: "💪" },
  { id: "bez glutena", label: "Bez glutena", emoji: "🌾" },
];

const ALLERGIES = ["Orašasti plodovi", "Kikiriki", "Laktoza", "Gluten", "Jaja", "Morski plodovi", "Riba", "Soja", "Susam"];
const CUISINES = ["Domaća", "Italijanska", "Mediteranska", "Azijska", "Meksička", "Indijska", "Grčka", "Bliskoistočna"];
const EQUIPMENT = ["Rerna", "Airfryer", "Mikrotalasna", "Multipraktik", "Blender", "Roštilj", "Ekspres lonac", "Wok"];

export function profileSummary(p: TasteProfile) {
  return [
    p.diet,
    p.allergies.length ? `bez: ${p.allergies.join(", ").toLowerCase()}` : "",
    p.dislikes.length ? `ne voli: ${p.dislikes.join(", ").toLowerCase()}` : "",
    p.spice !== "srednje" ? p.spice : "",
    p.cuisines.length ? p.cuisines.join(", ").toLowerCase() : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5">
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{children}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function ToggleChips({
  options,
  value,
  onChange,
  tone = "accent",
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  tone?: "accent" | "danger";
}) {
  const active = tone === "danger" ? "border-danger bg-danger/10 text-danger" : "border-accent bg-accent/10 text-text";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <motion.button
            key={o}
            type="button"
            whileTap={{ scale: 0.93 }}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`flex h-9 items-center gap-1 rounded-full border px-3.5 text-sm font-medium transition-colors ${on ? active : "border-border text-muted"}`}
          >
            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {o}
          </motion.button>
        );
      })}
    </div>
  );
}

function FreeTags({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t.charAt(0).toUpperCase() + t.slice(1)]);
    setDraft("");
  };
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="flex h-8 items-center gap-1 rounded-full bg-surface-2 pr-2 pl-3 text-sm"
              aria-label={`Ukloni ${v}`}
            >
              {v} <X className="h-3.5 w-3.5 text-muted" />
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex h-11 items-center gap-2 rounded-2xl border border-border pr-1 pl-3.5 focus-within:border-accent"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={40}
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Dodaj" className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function ProfileSheet({
  open,
  onClose,
  profile,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  profile: TasteProfile;
  onChange: (update: (p: TasteProfile) => TasteProfile) => void;
}) {
  const set = <K extends keyof TasteProfile>(k: K, v: TasteProfile[K]) => onChange((p) => ({ ...p, [k]: v }));
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/usage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUsage(u?.limit ? u : null))
      .catch(() => {});
  }, [open]);
  const customAllergies = profile.allergies.filter((a) => !ALLERGIES.includes(a));

  return (
    <Sheet open={open} onClose={onClose} label="Moj ukus">
      <div className="space-y-7 px-5 pb-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Moj ukus</h2>
          <p className="mt-1 text-sm text-muted">Šef ovo pamti i uzima u obzir u svakom predlogu.</p>
        </div>

        <section>
          <Label>Ishrana</Label>
          <div className="grid grid-cols-4 gap-2">
            {DIETS.map((d) => {
              const on = profile.diet === d.id;
              return (
                <motion.button
                  key={d.id || "all"}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => set("diet", d.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-[11px] font-semibold transition-colors ${on ? "border-accent bg-accent/10 text-text" : "border-border text-muted"}`}
                >
                  <span className="text-xl">{d.emoji}</span>
                  {d.label}
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <Label hint="Ovo se nikada neće pojaviti u receptu.">Alergije i netolerancije</Label>
          <ToggleChips
            options={ALLERGIES}
            value={profile.allergies.filter((a) => ALLERGIES.includes(a))}
            onChange={(v) => onChange((p) => ({ ...p, allergies: [...v, ...p.allergies.filter((a) => !ALLERGIES.includes(a))] }))}
            tone="danger"
          />
          <div className="mt-3">
            <FreeTags
              value={customAllergies}
              onChange={(v) => onChange((p) => ({ ...p, allergies: [...p.allergies.filter((a) => ALLERGIES.includes(a)), ...v] }))}
              placeholder="Druga alergija…"
            />
          </div>
        </section>

        <section>
          <Label hint="Izbegavaće se kad god je moguće.">Ne volim</Label>
          <FreeTags value={profile.dislikes} onChange={(v) => set("dislikes", v)} placeholder="npr. kim, pečurke, cvekla…" />
        </section>

        <section>
          <Label>Ljutina</Label>
          <div className="flex rounded-2xl bg-surface-2 p-1">
            {(["blago", "srednje", "ljuto"] as const).map((sp) => {
              const on = profile.spice === sp;
              return (
                <button key={sp} type="button" onClick={() => set("spice", sp)} className="relative flex-1 rounded-xl py-2.5 text-sm font-medium">
                  {on && (
                    <motion.span
                      layoutId="spice-pill"
                      className="absolute inset-0 rounded-xl bg-surface shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${on ? "text-text" : "text-muted"}`}>
                    {sp === "blago" ? "🫑 Blago" : sp === "srednje" ? "🌶️ Srednje" : "🔥 Ljuto"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Label hint="Češće će predlagati jela iz ovih kuhinja.">Omiljene kuhinje</Label>
          <ToggleChips options={CUISINES} value={profile.cuisines} onChange={(v) => set("cuisines", v)} />
        </section>

        <section>
          <Label hint="Ako ništa ne označiš, podrazumeva se standardna kuhinja (šporet i rerna).">Oprema u kuhinji</Label>
          <ToggleChips options={EQUIPMENT} value={profile.equipment} onChange={(v) => set("equipment", v)} />
        </section>

        {usage && (
          <section className="rounded-2xl bg-surface-2/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">AI pozivi danas</span>
              <span className="tabular-nums text-muted">
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full ${usage.used >= usage.limit ? "bg-danger" : "bg-accent-gradient"}`}
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">Limit štiti tvoju AI kvotu i resetuje se u ponoć.</p>
          </section>
        )}

        <button type="button" onClick={() => onChange(() => EMPTY_PROFILE)} className="w-full py-2 text-sm font-medium text-muted">
          Resetuj na podrazumevano
        </button>
      </div>
    </Sheet>
  );
}
