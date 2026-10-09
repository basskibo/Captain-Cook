"use client";

import { useState } from "react";
import type { RecipeImage } from "@/lib/types";

/** Fotografija jela sa fade-in efektom; dok se učitava, pozadina je prosečna boja fotografije. */
export function DishImage({
  image,
  size = "thumb",
  className = "",
}: {
  image: RecipeImage;
  size?: "thumb" | "src";
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`} style={{ backgroundColor: image.color }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Pexels CDN već servira optimizovane veličine */}
      <img
        src={image[size]}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ${loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
      />
    </div>
  );
}
