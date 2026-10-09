"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";

/** Bottom sheet za mobilni: prevuci nadole ili tapni pozadinu da zatvoriš. */
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
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={[
              "absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col rounded-t-[28px] border-t border-border bg-surface shadow-2xl",
              full ? "top-[max(env(safe-area-inset-top),12px)]" : "max-h-[90dvh]",
            ].join(" ")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
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
              className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
