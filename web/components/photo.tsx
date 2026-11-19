"use client";
/* eslint-disable @next/next/no-img-element -- Fotos sind bereits auf 1024px optimiert, next/image wäre unnötiger Aufwand */
import { useState } from "react";

/**
 * Foto in einem festen Rahmen, ohne es abzuschneiden: Das Bild wird vollständig eingepasst, und die freien
 * Flächen bekommen die Farbe der linken oberen Bildecke (freigestellte Fotos #eeeeee, Shop-Fotos meist Weiß).
 * Lässt sich die Farbe nicht lesen (fremde Seite ohne CORS), bleibt es Weiß. Größe und Seitenverhältnis
 * kommen über className, z. B. "aspect-[3/4] w-24".
 */
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
  const [background, setBackground] = useState("#ffffff");

  function measure(img: HTMLImageElement | null) {
    if (!img?.naturalWidth) return;
    try {
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setBackground(`rgb(${r} ${g} ${b})`);
    } catch {
      // Canvas durch fremdes Bild gesperrt: Weiß behalten
    }
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background }}>
      <img
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : undefined}
        referrerPolicy={remote ? "no-referrer" : undefined}
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
