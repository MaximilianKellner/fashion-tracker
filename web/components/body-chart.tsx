"use client";

import { useState } from "react";
import { MEASUREMENTS } from "@lib/schema.mjs";

type Key = keyof typeof MEASUREMENTS;

// Wo jedes Maß an der Figur genommen wird (viewBox 0 0 200 445)
const GUIDES: Record<Key, { d: string; labelAt: [number, number] }> = {
  neck: { d: "M88 73 Q100 79 112 73", labelAt: [118, 70] },
  shoulder: { d: "M58 91 L142 91", labelAt: [146, 88] },
  chest: { d: "M62 124 L138 124", labelAt: [146, 124] },
  waist: { d: "M68 194 L132 194", labelAt: [146, 194] },
  hips: { d: "M65 232 L135 232", labelAt: [146, 232] },
  sleeve: { d: "M143 92 Q157 100 159 122 L169 230", labelAt: [172, 168] },
  inseam: { d: "M107 258 L108 412", labelAt: [112, 340] },
  foot: { d: "M104 437 L139 437", labelAt: [142, 440] },
};

const ORDER = Object.keys(GUIDES) as Key[];

/**
 * Figur mit den Stellen, an denen die Körpermaße genommen werden.
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

  const pick = (k: Key) => {
    setActive(k);
    onPick?.(k);
  };

  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5">
      <svg viewBox="0 0 200 445" className="h-auto w-full" role="img" aria-label="Figur mit Körpermaßen">
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

        {/* Silhouette */}
        <g className="fill-surface-2 stroke-line" strokeWidth={1.5} strokeLinejoin="round">
          <circle cx={100} cy={40} r={22} />
          <rect x={91} y={58} width={18} height={22} rx={4} />
          <path d="M58 90 Q100 80 142 90 L138 150 Q131 185 132 200 L136 250 L64 250 L68 200 Q69 185 62 150 Z" />
          <path d="M142 90 Q157 97 159 120 L171 231 L159 235 L146 140 Z" />
          <path d="M58 90 Q43 97 41 120 L29 231 L41 235 L54 140 Z" />
          <circle cx={166} cy={242} r={8} />
          <circle cx={34} cy={242} r={8} />
          <path d="M64 249 L99 249 L97 415 L74 415 Z" />
          <path d="M101 249 L136 249 L126 415 L103 415 Z" />
          <path d="M74 415 L97 415 L97 428 L60 428 Q61 418 74 415 Z" />
          <path d="M103 415 L126 415 Q139 418 140 428 L103 428 Z" />
        </g>
        {weightKg && (
          <text x={100} y={168} className="fill-muted" fontSize={10} textAnchor="middle">
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
                  className="fill-ink"
                  textAnchor={GUIDES[k].labelAt[0] > 160 ? "end" : "start"}
                >
                  {has ? `${value(k)!.toLocaleString("de-DE")} cm` : "?"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

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
