"use client";

import { useEffect, useRef, useState } from "react";

export type RailSection = { id: string; label: string };

/** Durchmesser eines Punkts und Länge der aktiven Pille in px */
const DOT = 8;
const PILL = 24;

/** Weicher Verlauf 0 → 1; smooth(w) + smooth(1 − w) = 1, so bleibt die Leiste beim Morphen gleich lang */
const smooth = (w: number) => w * w * (3 - 2 * w);

/**
 * Sprungmarken am rechten Rand: ein Punkt je Abschnitt. Der aktuelle Punkt wächst zu einer länglichen Pille. Beim
 * Scrollen schrumpft sie fließend zurück, während der nächste Punkt zur Pille wird; eine Feder glättet die Bewegung.
 * Klick scrollt weich zum Abschnitt, beim Darüberfahren erscheint der Name. Die Abschnitte brauchen ein Element mit
 * der passenden id.
 */
export function SectionRail({ sections }: { sections: RailSection[] }) {
  const key = sections.map((s) => s.id).join(",");
  const [active, setActive] = useState(0);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // Ziel kommt aus der Scroll-Position, die angezeigte Position folgt ihm wie an einer Feder
    let target = 0;
    let pos = 0;
    let vel = 0;
    let frame = 0;

    const measure = () => {
      const vh = window.innerHeight;
      // Bezugslinie im oberen Drittel. Auf der letzten halben Bildschirmhöhe wandert sie nach unten, damit auch kurze
      // letzte Abschnitte fließend erreicht werden.
      const remaining = document.documentElement.scrollHeight - vh - window.scrollY;
      const nearEnd = 1 - Math.min(1, Math.max(0, remaining) / (vh / 2));
      const line = vh / 3 + (vh - vh / 3) * nearEnd;
      // Übergangszone vor jeder Abschnittsgrenze: dort wandert die Pille zum nächsten Punkt
      const zone = vh * 0.4;
      const tops = sections.map((s) => document.getElementById(s.id)?.getBoundingClientRect().top ?? Infinity);
      let p = 0;
      for (let i = 1; i < tops.length; i++) {
        const t = (line + zone - tops[i]) / zone;
        if (t <= 0) break;
        p = i - 1 + Math.min(1, t);
      }
      return p;
    };

    const paint = () => {
      const p = Math.min(sections.length - 1, Math.max(0, pos));
      dots.current.forEach((el, i) => {
        if (!el) return;
        const w = smooth(Math.max(0, 1 - Math.abs(p - i)));
        el.style.height = `${DOT + (PILL - DOT) * w}px`;
        el.style.setProperty("--on", String(w));
      });
      setActive(Math.round(p));
    };

    const step = () => {
      // Leicht unterdämpfte Feder: folgt zügig, schwingt kaum nach
      vel = (vel + (target - pos) * 0.14) * 0.7;
      pos += vel;
      if (Math.abs(target - pos) < 0.001 && Math.abs(vel) < 0.001) {
        pos = target;
        frame = 0;
      } else {
        frame = requestAnimationFrame(step);
      }
      paint();
    };

    const onScroll = () => {
      target = measure();
      if (!frame) frame = requestAnimationFrame(step);
    };

    target = pos = measure();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sections wird bei jedem Render neu gebaut, der Inhalt steckt im Schlüssel
  }, [key]);

  if (sections.length < 2) return null;
  return (
    // Am Handy weiter oben als die untere Navigationsleiste
    <nav
      aria-label="Zu Kategorie springen"
      className="fixed right-1.5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end sm:right-3"
    >
      {sections.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s.id}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-current={on ? "true" : undefined}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="group flex items-center gap-2 py-2 pl-3"
          >
            <span
              className={`hidden rounded-full bg-surface px-2 py-0.5 text-xs shadow ring-1 ring-line transition-opacity duration-300 sm:block ${
                on ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              {s.label}
            </span>
            <span className="flex w-3 justify-center">
              {/* Höhe und Anteil Akzentfarbe (--on, 0–1) setzt die Animation direkt */}
              <span
                ref={(el) => {
                  dots.current[i] = el;
                }}
                className="relative block w-2 overflow-hidden rounded-full bg-muted/50 transition-colors group-hover:bg-muted"
                style={{ height: DOT }}
              >
                <span className="absolute inset-0 rounded-full bg-accent" style={{ opacity: "var(--on, 0)" }} />
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
