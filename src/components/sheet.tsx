"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useIsDesktop } from "@/lib/use-media-query";

/**
 * Mobilni: bottom sheet (prevuci nadole ili tapni pozadinu da zatvoriš).
 * Desktop: centriran prozor sa dugmetom za zatvaranje.
 */
export function Sheet({
  open,
  onClose,
  children,
  full = false,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
  label: string;
}) {
  const drag = useDragControls();
  const desktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center lg:items-center lg:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={[
              "relative flex w-full flex-col overflow-hidden border-t border-border bg-surface shadow-2xl",
              "rounded-t-[28px] lg:rounded-[28px] lg:border",
              full
                ? "h-[calc(100dvh-max(env(safe-area-inset-top),12px))] max-w-lg lg:h-[min(88dvh,900px)] lg:max-w-5xl"
                : "max-h-[90dvh] max-w-lg lg:max-h-[85dvh] lg:max-w-xl",
            ].join(" ")}
            initial={desktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: "100%" }}
            transition={desktop ? { duration: 0.2, ease: "easeOut" } : { type: "spring", stiffness: 380, damping: 38 }}
            drag={desktop ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Ručka za prevlačenje — samo ona pokreće drag, da skrol sadržaja radi normalno */}
            <div
              className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 lg:hidden"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zatvori"
              className="absolute top-4 right-4 z-10 hidden h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-text lg:grid"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain lg:pt-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
