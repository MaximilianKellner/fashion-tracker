"use client";

import { useEffect, useRef, useState } from "react";

export type RailSection = { id: string; label: string; count?: number };

/** Durchmesser eines Punkts und Länge der aktiven Pille in px */
const DOT = 8;
const PILL = 24;
/** So lange bleibt der Name nach einem Wechsel sichtbar (Handy) */
const LABEL_MS = 1000;
/** Ab dieser Fingerbewegung in px wird aus einem Tipp ein Wischen über die Leiste */
const SCRUB_START = 6;

/** Weicher Verlauf 0 → 1; smooth(w) + smooth(1 − w) = 1, so bleibt die Leiste beim Morphen gleich lang */
const smooth = (w: number) => w * w * (3 - 2 * w);

/**
 * Sprungmarken am rechten Rand: ein Punkt je Abschnitt. Der aktuelle Punkt wächst zu einer länglichen Pille. Beim
 * Scrollen schrumpft sie fließend zurück, während der nächste Punkt zur Pille wird; eine Feder glättet die Bewegung.
 * Klick scrollt weich zum Abschnitt. Mit dem Finger (oder gedrückter Maus) kann man über die Leiste wischen, die Seite
 * springt dann live mit. Am Desktop erscheint der Name beim Darüberfahren, am Handy kurz nach jedem Wechsel und beim
 * Wischen. Die Abschnitte brauchen ein Element mit der passenden id.
 */
export function SectionRail({ sections }: { sections: RailSection[] }) {
  const key = sections.map((s) => s.id).join(",");
  const [active, setActive] = useState(0);
  // Name am Handy sichtbar (beim Wischen und kurz nach einem Wechsel)
  const [show, setShow] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Nach dem Wischen den Klick beim Loslassen ignorieren
  const suppressClick = useRef(false);

  useEffect(() => {
    // Ziel kommt aus der Scroll-Position (oder beim Wischen vom Finger), die angezeigte Position folgt wie an einer Feder
    let target = 0;
    let pos = 0;
    let vel = 0;
    let frame = 0;
    let shown = -1;
    let hideTimer = 0;
    // Wischen: Zeiger, Startpunkt, ob es schon losging, gewählter Abschnitt
    let pointer: number | null = null;
    let startY = 0;
    let scrubbing = false;
    let scrubIndex = -1;

    const flashLabel = (ms: number) => {
      setShow(true);
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setShow(false), ms);
    };

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
      const idx = Math.round(p);
      if (idx !== shown) {
        // Beim ersten Zeichnen keinen Namen einblenden, nur bei echten Wechseln
        if (shown !== -1 && !scrubbing) flashLabel(LABEL_MS);
        shown = idx;
        setActive(idx);
      }
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

    const animate = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onScroll = () => {
      if (!scrubbing) target = measure();
      animate();
    };

    // Abschnitt, dessen Punkt dem Finger am nächsten ist
    const indexAt = (y: number) => {
      let best = 0;
      let dist = Infinity;
      buttons.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - y);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      return best;
    };

    const scrubTo = (y: number) => {
      const i = indexAt(y);
      if (i === scrubIndex) return;
      scrubIndex = i;
      target = i;
      document.getElementById(sections[i].id)?.scrollIntoView({ behavior: "instant", block: "start" });
      // Kurzes Ticken je Abschnitt, wo das Gerät es kann (Android; iOS kennt kein vibrate)
      navigator.vibrate?.(5);
      animate();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointer = e.pointerId;
      startY = e.clientY;
      scrubbing = false;
      scrubIndex = -1;
      suppressClick.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      if (!scrubbing) {
        if (Math.abs(e.clientY - startY) < SCRUB_START) return;
        scrubbing = true;
        // Auch außerhalb der Leiste weiterwischen; scheitert nur, wenn der Zeiger schon weg ist
        try {
          nav.current?.setPointerCapture(e.pointerId);
        } catch {}
        clearTimeout(hideTimer);
        setShow(true);
      }
      scrubTo(e.clientY);
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (!scrubbing) return;
      scrubbing = false;
      suppressClick.current = true;
      flashLabel(LABEL_MS * 0.7);
      // Ab jetzt wieder der Scroll-Position folgen
      target = measure();
      animate();
    };

    target = pos = measure();
    paint();
    const el = nav.current;
    el?.addEventListener("pointerdown", onPointerDown);
    el?.addEventListener("pointermove", onPointerMove);
    el?.addEventListener("pointerup", onPointerEnd);
    el?.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hideTimer);
      el?.removeEventListener("pointerdown", onPointerDown);
      el?.removeEventListener("pointermove", onPointerMove);
      el?.removeEventListener("pointerup", onPointerEnd);
      el?.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sections wird bei jedem Render neu gebaut, der Inhalt steckt im Schlüssel
  }, [key]);

  if (sections.length < 2) return null;
  return (
    // touch-none: Wischen über die Leiste scrollt nicht die Seite, sondern wählt den Abschnitt
    <nav
      ref={nav}
      aria-label="Zu Kategorie springen"
      className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 touch-none select-none flex-col items-end [-webkit-touch-callout:none] sm:right-3"
    >
      {sections.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s.id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-current={on ? "true" : undefined}
            onClick={() => {
              if (suppressClick.current) return;
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            // Am Handy eine große, unsichtbare Tippfläche (≈ 44 × 32 px) bis an den Rand
            className="group relative flex items-center gap-2 py-3 pl-6 pr-2 sm:py-2 sm:pl-3 sm:pr-0"
          >
            <span
              className={`pointer-events-none absolute right-full top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface px-3 py-1 text-sm shadow ring-1 ring-line transition-opacity duration-300 sm:pointer-events-auto sm:static sm:translate-y-0 sm:px-2 sm:py-0.5 sm:text-xs ${
                on && show ? "opacity-100" : "opacity-0"
              } ${on ? "sm:opacity-100" : "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"}`}
            >
              {s.label}
              {s.count != null && <span className="ml-1.5 text-muted">{s.count}</span>}
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
