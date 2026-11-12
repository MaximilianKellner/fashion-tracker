"use client";

import { useEffect, useRef, useState } from "react";
import { euro } from "@/lib/labels";

type Point = { date: string; count: number; spend: number };
type Key = "count" | "spend";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const DAY = 86_400_000;
// months: Länge des Zeitraums; 0 = alles, -1 = seit Jahresbeginn (YTD)
const RANGES = [
  { id: "alles", label: "Gesamt", title: "Gesamter Zeitraum", months: 0 },
  { id: "ytd", label: "YTD", title: "Seit Jahresbeginn", months: -1 },
  { id: "1j", label: "1 J", title: "Letztes Jahr", months: 12 },
  { id: "6m", label: "6 M", title: "Letzte 6 Monate", months: 6 },
  { id: "3m", label: "3 M", title: "Letzte 3 Monate", months: 3 },
  { id: "1m", label: "1 M", title: "Letzter Monat", months: 1 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const W = 1000;
const H = 300;
const SAMPLES = 240; // Stützstellen pro Linie; gleiche Anzahl in jedem Zeitraum, damit Übergänge morphen

const time = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** Achsenbeschriftung: Jahre, Monate oder Tage je nach Länge, höchstens ~6 Stück */
function ticks(from: number, to: number) {
  const result: { t: number; text: string }[] = [];
  if (!Number.isFinite(from) || !Number.isFinite(to)) return result;
  const d = new Date(from);
  const months = (to - from) / (30 * DAY);
  // Kurze Zeiträume: Tage (1., 8., 15., 22. bzw. jeder 15.)
  if (months < 2.5) {
    const days = months < 1.5 ? [1, 8, 15, 22] : [1, 15];
    for (let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); t <= to; t += DAY) {
      const day = new Date(t);
      if (t >= from && days.includes(day.getUTCDate())) {
        result.push({ t, text: `${day.getUTCDate()}. ${MONTHS[day.getUTCMonth()]}` });
      }
    }
    return result;
  }
  const step = months > 36 ? 12 : months > 18 ? 6 : months > 9 ? 3 : months > 4 ? 2 : 1;
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1; // ab dem nächsten Monatsersten
  for (;;) {
    if (m > 11) [y, m] = [y + 1, m - 12];
    const t = Date.UTC(y, m, 1);
    if (t > to) break;
    if (step === 12 ? m === 0 : m % step === 0) result.push({ t, text: m === 0 ? String(y) : MONTHS[m] });
    m += 1;
  }
  return result;
}

/** Monotone kubische Interpolation (Fritsch–Carlson): glatt, aber ohne Überschwingen über die Datenpunkte */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return () => ys[0] ?? 0;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i] || 1));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (xs[i + 1] < x) i++;
    const h = xs[i + 1] - xs[i];
    const s = (x - xs[i]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1]
    );
  };
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (p: number) => 1 - Math.pow(1 - p, 3);

/** Zahlenreihe weich vom bisherigen zum neuen Stand animieren (startet beim ersten Rendern bei 0) */
function useTween(target: number[], ms: number) {
  const [value, setValue] = useState(() => target.map(() => 0));
  const current = useRef(value);
  const key = target.join(",");
  useEffect(() => {
    const from = current.current;
    const to = key.split(",").map(Number);
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const p = reducedMotion() ? 1 : Math.min(1, (now - t0) / ms);
      const e = ease(p);
      const v = to.map((x, i) => (from[i] ?? 0) + (x - (from[i] ?? 0)) * e);
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [key, ms]);
  return value;
}

/**
 * Bestand und Ausgaben über die Zeit wie ein Kursverlauf: zwei kumulierte Linien, beide als Anteil am Endwert
 * (0–100 %). So liegen sie auf derselben Skala – laufen sie parallel, kamen Teile und Ausgaben gleichmäßig.
 * Die Kurve bleibt bis kurz vor einem Zugang flach und steigt dann weich an.
 */
export function TimelineChart({ data, today }: { data: Point[]; today: string }) {
  const [range, setRange] = useState<RangeId>("alles");
  // Zeitpunkt unter dem Zeiger; bleibt beim Verlassen stehen, damit das Fadenkreuz ausblendet statt zu springen
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const valid = data.length > 0 && data.every((p) => Number.isFinite(time(p.date)));
  const end = valid ? Math.max(time(today), time(data.at(-1)!.date)) : 1;
  const first = valid ? time(data[0].date) : 0;
  const span = end - first;
  const yearStart = Date.UTC(new Date(end).getUTCFullYear(), 0, 1);
  const rangeStart = (months: number) =>
    months === 0 ? first - Math.max(span * 0.03, 7 * DAY) : months < 0 ? yearStart : end - months * 30.44 * DAY;
  // Zeiträume nur anbieten, wenn die Daten weiter zurückreichen
  const ranges = RANGES.filter((r) => r.months === 0 || rangeStart(r.months) > first);
  const start = rangeStart(RANGES.find((r) => r.id === range)?.months ?? 0);

  // Kumulieren ab Beginn des Zeitraums; der Startpunkt liegt bei 0
  const inRange = valid ? data.filter((p) => time(p.date) >= start) : [];
  const series = [{ t: start, count: 0, spend: 0 }];
  for (const p of inRange) {
    const prev = series.at(-1)!;
    series.push({ t: time(p.date), count: prev.count + p.count, spend: prev.spend + p.spend });
  }
  const last = series.at(-1)!;
  const total = { count: last.count || 1, spend: last.spend || 1 };
  const x = (t: number) => ((t - start) / (end - start)) * W;

  // Stützpunkte: flach bis kurz vor dem Zugang, dann weicher Anstieg (Rampe ~1,5 % der Breite)
  const curve = (key: Key) => {
    const ramp = (end - start) * 0.015;
    const xs = [start];
    const ys = [0];
    for (const p of series.slice(1)) {
      const hold = Math.max(p.t - ramp, xs.at(-1)! + (p.t - xs.at(-1)!) / 2);
      if (hold > xs.at(-1)! && hold < p.t) {
        xs.push(hold);
        ys.push(ys.at(-1)!);
      }
      if (p.t > xs.at(-1)!) {
        xs.push(p.t);
        ys.push(p[key] / total[key]);
      } else ys[ys.length - 1] = p[key] / total[key];
    }
    xs.push(Math.max(end, xs.at(-1)! + 1));
    ys.push(ys.at(-1)!);
    return monotone(xs, ys);
  };
  const fCount = curve("count");
  const fSpend = curve("spend");
  const sampleAt = (i: number) => start + (i / (SAMPLES - 1)) * (end - start);
  const target = [
    ...Array.from({ length: SAMPLES }, (_, i) => fCount(sampleAt(i))),
    ...Array.from({ length: SAMPLES }, (_, i) => fSpend(sampleAt(i))),
  ].map((v) => Math.round(v * 10000) / 10000);
  const samples = useTween(target, 650);

  // Letzter Zugang bis zum Zeitpunkt unter dem Zeiger
  const at = (t: number) => {
    let i = 0;
    while (i + 1 < series.length && series[i + 1].t <= t) i++;
    return i;
  };
  const active = hoverT !== null ? at(hoverT) : null;
  const shown = hover && active !== null ? series[active] : last;
  const numbers = useTween([shown.count, shown.spend], 300);

  if (!valid) return <p className="text-sm text-muted">Noch keine Daten.</p>;

  const y = (share: number) => H - share * H;
  const path = (offset: number) =>
    Array.from({ length: SAMPLES }, (_, i) => `${i ? "L" : "M"}${((i / (SAMPLES - 1)) * W).toFixed(1)} ${y(samples[offset + i]).toFixed(1)}`).join(
      "",
    );
  const lines = [
    { key: "count" as const, label: "Teile", color: "var(--chart-1)", value: String(Math.round(numbers[0])), d: path(0), f: fCount },
    { key: "spend" as const, label: "Ausgaben", color: "var(--chart-2)", value: euro(numbers[1]), d: path(SAMPLES), f: fSpend },
  ];

  const pick = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const p = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const t = start + p * (end - start);
    // An den nächstgelegenen echten Zugang andocken
    const events = series.length > 1 ? series.slice(1) : series;
    const near = events.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
    if (near.t !== hoverT) setHoverT(near.t);
    setHover(true);
  };
  const crossT = hoverT ?? end;
  const pct = (t: number) => `${(x(t) / W) * 100}%`;

  return (
    <figure>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Legende = Anzeige der Werte (am Zeiger bzw. aktuell) */}
        <div className="flex gap-5">
          {lines.map((l) => (
            <div key={l.key}>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-0.5 w-3 rounded" style={{ background: l.color }} />
                {l.label}
              </div>
              <div className="text-xl font-semibold tabular-nums tracking-tight">{l.value}</div>
            </div>
          ))}
        </div>
        {ranges.length > 1 && (
          // Am Handy eine gleichmäßige Leiste über die volle Breite
          <div
            className="grid w-full gap-1 sm:flex sm:w-auto"
            style={{ gridTemplateColumns: `repeat(${ranges.length}, minmax(0, 1fr))` }}
          >
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                title={r.title}
                aria-label={r.title}
                aria-pressed={range === r.id}
                onClick={() => {
                  setRange(r.id);
                  setHoverT(null);
                  setHover(false);
                }}
                className={`chip justify-center px-0! text-xs! transition-colors sm:px-3! sm:text-sm! ${range === r.id ? "chip-active" : ""}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {/* y-Achse in Prozent des Endwerts */}
        <div className="relative mb-5.5 w-10 shrink-0 text-right text-xs tabular-nums text-muted">
          {[1, 0.5, 0].map((s) => (
            <span key={s} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(1 - s) * 100}%` }}>
              {s * 100} %
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={ref}
            className="relative h-52 touch-pan-y sm:h-64"
            onPointerMove={(e) => pick(e.clientX)}
            onPointerDown={(e) => pick(e.clientX)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
            role="img"
            aria-label={`Kumuliert seit ${fmtDate(start)}: ${last.count} Teile, ${euro(last.spend)}. Zugänge: ${inRange
              .map((p) => `${fmtDate(time(p.date))} ${p.count} Teile, ${euro(p.spend)}`)
              .join("; ")}`}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <defs>
                {lines.map((l) => (
                  <linearGradient key={l.key} id={`fill-${l.key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={l.color} stopOpacity="0.2" />
                    <stop offset="1" stopColor={l.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {[0, 0.5, 1].map((s) => (
                <line
                  key={s}
                  x1="0"
                  x2={W}
                  y1={y(s)}
                  y2={y(s)}
                  stroke="var(--line)"
                  strokeDasharray={s === 0 ? undefined : "4 4"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {lines.map((l) => (
                <path key={`a-${l.key}`} d={`${l.d}L${W} ${H}L0 ${H}Z`} fill={`url(#fill-${l.key})`} />
              ))}
              {lines.map((l) => (
                <path
                  key={l.key}
                  d={l.d}
                  fill="none"
                  stroke={l.color}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {/* Fadenkreuz dockt an Zugängen an, gleitet weich dazwischen und blendet aus statt zu springen */}
            <div
              className={`pointer-events-none absolute inset-y-0 w-px bg-muted/50 transition-[left,opacity] duration-200 ease-out ${
                hover ? "opacity-100" : "opacity-0"
              }`}
              style={{ left: pct(crossT) }}
            />
            {lines.map((l) => (
              <span
                key={l.key}
                className={`pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-[left,top,opacity,scale] duration-200 ease-out ${
                  hover ? "scale-100 opacity-100" : "scale-50 opacity-0"
                }`}
                style={{ left: pct(crossT), top: `${(1 - l.f(crossT)) * 100}%`, background: l.color }}
              />
            ))}
          </div>
          <div className="relative mt-1.5 h-4 text-xs text-muted">
            {ticks(start, end).map((t) => (
              <span
                key={t.t}
                className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums transition-[left] duration-500 ease-out"
                style={{ left: pct(t.t) }}
              >
                {t.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="mt-2 min-h-5 text-sm text-muted">
        {hover && active !== null && active > 0 ? (
          <>
            <span className="text-ink">{fmtDate(crossT)}</span> ·{" "}
            {fmtDate(crossT) === fmtDate(series[active].t) ? "Zugang" : `letzter Zugang ${fmtDate(series[active].t)}`}: +
            {inRange[active - 1].count} {inRange[active - 1].count === 1 ? "Teil" : "Teile"} für{" "}
            {euro(inRange[active - 1].spend)}
          </>
        ) : (
          "Kumuliert, je Linie in Prozent vom Endwert. Datum = Kaufdatum, sonst Tag der Erfassung."
        )}
      </figcaption>
    </figure>
  );
}
