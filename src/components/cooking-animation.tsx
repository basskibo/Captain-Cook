"use client";

import { motion, useReducedMotion } from "motion/react";

const FALLBACK = ["🥕", "🧅", "🍅", "🥔", "🌶️", "🧄"];
const TOSS = 1.8; // trajanje jednog "bacanja" tiganja u sekundama

// Putanje kojima namirnice lete iz tiganja (x pomeraj, visina, rotacija)
const ARCS = [
  { x: -46, y: -118, r: -320 },
  { x: 28, y: -140, r: 360 },
  { x: -12, y: -96, r: 220 },
  { x: 54, y: -110, r: -260 },
  { x: -64, y: -84, r: 300 },
];

function Flame({ delay, scale, x }: { delay: number; scale: number; x: number }) {
  return (
    <motion.span
      className="bg-accent-gradient absolute bottom-0 block h-9 w-5 origin-bottom"
      style={{
        left: `calc(50% + ${x}px)`,
        borderRadius: "50% 50% 50% 50% / 65% 65% 35% 35%",
        filter: "blur(0.5px)",
        boxShadow: "0 0 18px var(--glow)",
      }}
      animate={{ scaleY: [scale, scale * 1.35, scale * 0.85, scale], scaleX: [1, 0.85, 1.1, 1], opacity: [0.85, 1, 0.75, 0.85] }}
      transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function Steam({ x, delay }: { x: number; delay: number }) {
  return (
    <motion.svg
      viewBox="0 0 20 60"
      className="absolute h-14 w-5 text-muted"
      style={{ left: `calc(50% + ${x}px)`, bottom: 118 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: [0, 0.5, 0], y: [10, -26] }}
      transition={{ duration: 2.6, repeat: Infinity, delay, ease: "easeOut" }}
    >
      <path
        d="M10 58 C2 48, 18 40, 10 30 S2 12, 10 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

export function CookingAnimation({ emojis }: { emojis: string[] }) {
  const reduce = useReducedMotion();
  const items = [...new Set(emojis.length ? emojis : FALLBACK)].slice(0, ARCS.length);
  while (items.length < 3) items.push(FALLBACK[items.length]);

  return (
    <div className="relative h-64 overflow-hidden rounded-3xl border border-border bg-surface" aria-hidden>
      {/* Topli sjaj iza ringle */}
      <div className="absolute bottom-0 left-1/2 h-40 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent opacity-20 blur-3xl" />

      {/* Para */}
      {!reduce && [-34, 0, 30].map((x, i) => <Steam key={x} x={x} delay={i * 0.8} />)}

      {/* Tiganj + namirnice */}
      <motion.div
        className="absolute bottom-[58px] left-1/2 w-0"
        animate={reduce ? undefined : { y: [0, -10, 0, 0], rotate: [0, -7, 2, 0] }}
        transition={{ duration: TOSS, repeat: Infinity, times: [0, 0.18, 0.45, 1], ease: "easeInOut" }}
      >
        {/* Namirnice — iza prednje ivice tiganja, pa izgleda kao da izleću iz njega */}
        {items.map((e, i) => {
          const arc = ARCS[i];
          return (
            <motion.span
              key={e + i}
              className="absolute bottom-6 -ml-4 block w-8 text-center text-3xl"
              style={{ left: (i - (items.length - 1) / 2) * 18 }}
              animate={
                reduce
                  ? undefined
                  : { x: [0, arc.x, arc.x * 0.4, 0], y: [0, arc.y, -10, 0], rotate: [0, arc.r * 0.6, arc.r, arc.r] }
              }
              transition={{
                duration: TOSS,
                repeat: Infinity,
                delay: 0.12 + i * 0.07,
                times: [0, 0.42, 0.78, 1],
                ease: ["easeOut", "easeIn", "easeOut"],
              }}
            >
              {e}
            </motion.span>
          );
        })}

        {/* Telo tiganja */}
        <svg viewBox="0 0 260 70" className="absolute bottom-0 -left-[86px] w-[260px] overflow-visible">
          <defs>
            <linearGradient id="pan-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3330" />
              <stop offset="1" stopColor="#151210" />
            </linearGradient>
            <linearGradient id="pan-handle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a4a40" />
              <stop offset="1" stopColor="#2a211c" />
            </linearGradient>
          </defs>
          {/* Drška */}
          <rect x="166" y="14" width="92" height="13" rx="6.5" fill="url(#pan-handle)" />
          <rect x="160" y="15" width="16" height="11" rx="3" fill="#2a2421" />
          {/* Posuda */}
          <path d="M6 14 H176 L164 52 Q160 62 148 62 H34 Q22 62 18 52 Z" fill="url(#pan-body)" />
          {/* Ivica (rim) */}
          <ellipse cx="91" cy="14" rx="86" ry="7" fill="#4a413c" />
          <ellipse cx="91" cy="14" rx="80" ry="4.5" fill="#1b1715" />
          {/* Odsjaj */}
          <path d="M28 24 Q30 46 44 54" stroke="rgba(255,255,255,0.12)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Plamen */}
      <div className="absolute bottom-[26px] left-0 h-10 w-full">
        {[-44, -22, 0, 22, 44].map((x, i) => (
          <Flame key={x} x={x - 10} delay={i * 0.13} scale={i === 2 ? 1.1 : i % 2 ? 0.95 : 0.75} />
        ))}
      </div>

      {/* Ringla */}
      <div className="absolute bottom-5 left-1/2 h-2 w-44 -translate-x-1/2 rounded-full bg-border" />
      <div className="absolute bottom-3 left-1/2 h-2 w-56 -translate-x-1/2 rounded-full bg-surface-2" />
    </div>
  );
}
