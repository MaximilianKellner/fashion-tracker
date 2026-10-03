"use client";
/* eslint-disable @next/next/no-img-element -- Fotos sind bereits auf 1024px optimiert, next/image wäre unnötiger Aufwand */
import { useState } from "react";

/**
 * Foto in einem festen Rahmen, ohne es abzuschneiden: Das Bild wird vollständig eingepasst, und die freien
 * Flächen füllt der verlängerte, weichgezeichnete Bildrand. Bei Produktfotos mit einfarbigem Hintergrund
 * sieht das nahtlos aus. Größe und Seitenverhältnis kommen über className, z. B. "aspect-[3/4] w-24".
 */
// Weichzeichnung blendet an den Kanten ins Dunkle aus; so weit ragt die Fläche über den Rahmen hinaus
const BLEED = 24;

export function Photo({
  src,
  alt = "",
  className = "",
  remote = false,
  lazy = true,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Bild von einer fremden Seite: keinen Referrer mitschicken */
  remote?: boolean;
  lazy?: boolean;
}) {
  // Breiter als der Rahmen: oben/unten ist Platz frei, sonst links/rechts (Normalfall bei Hochkant-Fotos)
  const [wide, setWide] = useState(false);
  const shared = {
    src,
    loading: lazy ? ("lazy" as const) : undefined,
    referrerPolicy: remote ? ("no-referrer" as const) : undefined,
  };

  function measure(img: HTMLImageElement | null) {
    if (!img?.naturalWidth) return;
    const box = img.parentElement!.getBoundingClientRect();
    setWide(img.naturalWidth / img.naturalHeight > box.width / box.height);
  }

  // Jede Hälfte zeigt nur den äußersten Streifen des Bildes, stark in die Länge gezogen
  const edge = (side: "start" | "end") => (
    <div
      aria-hidden
      className={`absolute overflow-hidden ${wide ? "inset-x-0 h-1/2" : "inset-y-0 w-1/2"} ${
        side === "start" ? "left-0 top-0" : wide ? "bottom-0 left-0" : "right-0 top-0"
      }`}
    >
      <img
        {...shared}
        alt=""
        className="absolute max-w-none blur-md"
        style={{
          objectFit: "fill",
          ...(wide
            ? {
                left: -BLEED,
                width: `calc(100% + ${2 * BLEED}px)`,
                height: "5000%",
                [side === "start" ? "top" : "bottom"]: -BLEED,
              }
            : {
                top: -BLEED,
                height: `calc(100% + ${2 * BLEED}px)`,
                width: "5000%",
                [side === "start" ? "left" : "right"]: -BLEED,
              }),
        }}
      />
    </div>
  );

  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {edge("start")}
      {edge("end")}
      <img
        {...shared}
        alt={alt}
        onLoad={(e) => measure(e.currentTarget)}
        // Schon geladen, bevor React übernommen hat (Cache): dann gleich messen
        ref={(img) => {
          if (img?.complete) measure(img);
        }}
        className="relative h-full w-full object-contain"
      />
    </div>
  );
}
