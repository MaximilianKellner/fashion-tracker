"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { label, swatch } from "@/lib/labels";

type Cell = { key: string; value: number; x: number; y: number; w: number; h: number };

// Breite der Fläche in Rechen-Einheiten; die Höhe folgt aus der gemessenen Größe
const W = 100;

/** Squarified Treemap (Bruls et al.): legt Rechtecke mit möglichst quadratischen Kacheln aus. */
function squarify(data: [string, number][], x: number, y: number, w: number, h: number): Cell[] {
  const total = data.reduce((s, [, v]) => s + v, 0);
  if (!total) return [];
  const scale = (w * h) / total;
  const items = data.map(([key, value]) => ({ key, value, area: value * scale }));
  const cells: Cell[] = [];

  const worst = (row: typeof items, side: number) => {
    const sum = row.reduce((s, r) => s + r.area, 0);
    const max = Math.max(...row.map((r) => r.area));
    const min = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  let row: typeof items = [];
  let rest = items;
  while (rest.length) {
    const side = Math.min(w, h);
    const next = rest[0];
    if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      rest = rest.slice(1);
      if (rest.length) continue;
    }
    // Reihe entlang der kurzen Seite ablegen
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      const rw = sum / h;
      let cy = y;
      for (const r of row) {
        const rh = r.area / rw;
        cells.push({ key: r.key, value: r.value, x, y: cy, w: rw, h: rh });
        cy += rh;
      }
      x += rw;
      w -= rw;
    } else {
      const rh = sum / w;
      let cx = x;
      for (const r of row) {
        const cw = r.area / rh;
        cells.push({ key: r.key, value: r.value, x: cx, y, w: cw, h: rh });
        cx += cw;
      }
      y += rh;
      h -= rh;
    }
    row = [];
  }
  return cells;
}

/** Helle Farben bekommen dunkle Schrift, dunkle helle. */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3;
}

/**
 * Farbverteilung des Schranks als Mosaik in den echten Farben. Fläche = Anzahl der Teile.
 * Füllt die Höhe des Elternelements (flex-1); am Handy gilt ein festes Seitenverhältnis.
 */
export function ColorTreemap({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const [active, setActive] = useState<string | null>(null);
  // Tatsächliche Größe in px, damit die Kacheln quadratisch bleiben und Beschriftungen nur dort stehen, wo sie passen
  const [size, setSize] = useState({ w: 460, h: 280 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = (W * size.h) / size.w;
  const px = W / size.w; // Einheiten pro Pixel
  const cells = squarify(entries, 0, 0, W, H);
  const current = active ? cells.find((c) => c.key === active) : null;

  if (!total) return null;

  return (
    <figure className="flex flex-1 flex-col">
      <div
        ref={ref}
        className="relative aspect-[4/3] w-full lg:aspect-auto lg:min-h-64 lg:flex-1"
        onMouseLeave={() => setActive(null)}
        role="img"
        aria-label={`Farbverteilung: ${entries.map(([k, v]) => `${label(k)} ${v}`).join(", ")}`}
      >
        {cells.map((c) => {
          const hex = swatch(c.key);
          const cw = c.w / px;
          const ch = c.h / px;
          // Zahl oben, Name unten – nur, wo Platz ist
          const showNumber = cw >= 26 && ch >= 26;
          const showName = cw >= 64 && ch >= 46;
          const dim = active !== null && active !== c.key;
          return (
            <Link
              key={c.key}
              href={`/?color=${encodeURIComponent(c.key)}`}
              className="absolute block rounded p-px outline-none focus-visible:outline-2 focus-visible:outline-accent"
              style={{
                left: `${(c.x / W) * 100}%`,
                top: `${(c.y / H) * 100}%`,
                width: `${(c.w / W) * 100}%`,
                height: `${(c.h / H) * 100}%`,
              }}
              onMouseEnter={() => setActive(c.key)}
              onFocus={() => setActive(c.key)}
              aria-label={`${label(c.key)}: ${c.value} – im Kleiderschrank anzeigen`}
            >
              <span
                className={`flex h-full w-full flex-col justify-between overflow-hidden rounded p-1.5 text-left ring-1 ring-inset ring-line transition-opacity ${
                  isLight(hex) ? "text-black/75" : "text-white/85"
                } ${dim ? "opacity-40" : ""}`}
                style={{ backgroundColor: hex }}
              >
                {showNumber && (
                  <span className={`font-semibold tabular-nums leading-none ${showName ? "text-lg" : "text-xs"}`}>
                    {c.value}
                  </span>
                )}
                {showName && <span className="truncate text-xs">{label(c.key)}</span>}
              </span>
            </Link>
          );
        })}
      </div>
      <figcaption className="mt-2 min-h-5 text-sm text-muted">
        {current ? (
          <>
            <span className="text-ink">{label(current.key)}</span> · {current.value}{" "}
            {current.value === 1 ? "Teil" : "Teile"} · {Math.round((current.value / total) * 100)} %
          </>
        ) : (
          "Fläche = Anzahl. Antippen zeigt die Teile."
        )}
      </figcaption>
    </figure>
  );
}
