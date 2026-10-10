"use client";

import { useMemo, useState } from "react";
import { MEASUREMENTS } from "@lib/schema.mjs";
import { bodyShape, type MeasureKey } from "@/lib/body-shape";

type Key = MeasureKey;

const ORDER: Key[] = ["neck", "shoulder", "chest", "waist", "hips", "sleeve", "inseam", "foot"];

/**
 * Figur mit den Stellen, an denen die Körpermaße genommen werden. Die Figur selbst folgt den Angaben
 * (Größe, Gewicht, Umfänge, Proportionen), siehe lib/body-shape.ts.
 * Antippen oder Überfahren eines Maßes hebt es in Grafik und Liste hervor; mit onPick (im Formular)
 * springt ein Klick zum passenden Eingabefeld.
 */
export function BodyChart({
  measurements = {},
  heightCm,
  weightKg,
  onPick,
}: {
  measurements?: Record<string, number | undefined>;
  heightCm?: number;
  weightKg?: number;
  onPick?: (key: Key) => void;
}) {
  const [active, setActive] = useState<Key | null>(null);
  const shown = active ?? null;
  const value = (k: Key) => measurements[k];
  const shape = useMemo(() => bodyShape({ measurements, heightCm, weightKg }), [measurements, heightCm, weightKg]);
  const GUIDES = shape.guides;

  const pick = (k: Key) => {
    setActive(k);
    onPick?.(k);
  };

  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5">
      <figure>
      <svg viewBox="0 0 200 445" className="h-auto w-full" role="img" aria-label={`Figur mit Körpermaßen, Statur ${shape.build}`}>
        {/* Körpergröße */}
        <g className="text-muted" stroke="currentColor" strokeWidth={1}>
          <line x1={14} y1={18} x2={14} y2={428} />
          <line x1={9} y1={18} x2={19} y2={18} />
          <line x1={9} y1={428} x2={19} y2={428} />
        </g>
        {heightCm && (
          <text x={22} y={226} className="fill-muted" fontSize={10} transform="rotate(-90 22 226)" textAnchor="middle">
            {heightCm} cm
          </text>
        )}

        {/* Silhouette: erst alle Teile mit Rand, darüber nur die Flächen, so bleibt nur der äußere Umriss sichtbar */}
        <g className="stroke-line" fill="none" strokeWidth={3} strokeLinejoin="round">
          <ellipse {...shape.head} />
          {shape.parts.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="fill-surface-2">
          <ellipse {...shape.head} />
          {shape.parts.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="stroke-line" fill="none" strokeWidth={1.2} strokeLinecap="round">
          {shape.details.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {weightKg && (
          <text x={shape.torsoCenter[0]} y={shape.torsoCenter[1]} className="fill-muted" fontSize={10} textAnchor="middle">
            {weightKg} kg
          </text>
        )}

        {/* Messlinien: durchgezogen = erfasst, gestrichelt = fehlt noch */}
        {ORDER.map((k) => {
          const on = shown === k;
          const has = value(k) !== undefined;
          return (
            <g
              key={k}
              className="cursor-pointer"
              onMouseEnter={() => setActive(k)}
              onMouseLeave={() => setActive(null)}
              onClick={() => pick(k)}
            >
              {/* breite unsichtbare Trefferfläche */}
              <path d={GUIDES[k].d} fill="none" stroke="transparent" strokeWidth={14} />
              <path
                d={GUIDES[k].d}
                fill="none"
                className={on ? "stroke-accent" : has ? "stroke-ink/70" : "stroke-muted/60"}
                strokeWidth={on ? 3 : 2}
                strokeDasharray={has ? undefined : "4 3"}
                strokeLinecap="round"
              />
              {on && (
                <text
                  x={GUIDES[k].labelAt[0]}
                  y={GUIDES[k].labelAt[1]}
                  dy={3}
                  fontSize={11}
                  fontWeight={600}
                  className="fill-ink stroke-surface"
                  strokeWidth={3}
                  paintOrder="stroke"
                  textAnchor={GUIDES[k].labelAt[0] > 160 ? "end" : "start"}
                >
                  {has ? `${value(k)!.toLocaleString("de-DE")} cm` : "?"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
        <figcaption className="mt-1 text-center text-xs text-muted">Statur (geschätzt): {shape.build}</figcaption>
      </figure>

      <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
        {ORDER.map((k) => {
          const on = shown === k;
          const has = value(k) !== undefined;
          return (
            <li key={k}>
              <button
                type="button"
                onMouseEnter={() => setActive(k)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(k)}
                onBlur={() => setActive(null)}
                onClick={() => pick(k)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left ${on ? "bg-surface-2" : ""}`}
              >
                <span className="min-w-0">
                  <span className={`block font-medium ${on ? "text-accent" : ""}`}>{MEASUREMENTS[k].label}</span>
                  {on && <span className="block text-xs text-muted">{MEASUREMENTS[k].hint}</span>}
                </span>
                <span className={`shrink-0 tabular-nums ${has ? "" : "text-muted"}`}>{has ? `${value(k)!.toLocaleString("de-DE")} cm` : "fehlt"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
