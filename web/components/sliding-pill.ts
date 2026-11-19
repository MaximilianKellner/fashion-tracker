"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Hintergrund, der hinter den Text des gewählten Punkts gleitet (obere Navigation, Ansichts-Umschalter).
 * Der gewählte Punkt trägt `data-active`; die Markierung (`pill`) liegt im selben positionierten Container vor den
 * Punkten, die Punkte selbst sind `relative`, damit ihr Text darüber liegt.
 * Bis die Markierung im Browser platziert ist (bzw. ohne JavaScript), setzt der Container kein `data-pill`, und der
 * gewählte Punkt zeigt seinen eigenen Hintergrund (`group-data-[pill]/pill:bg-transparent` blendet ihn danach aus).
 */
export function useSlidingPill<T extends HTMLElement>(active: unknown) {
  const container = useRef<T>(null);
  const pill = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = container.current;
    const el = pill.current;
    if (!box || !el) return;
    function place() {
      const target = box!.querySelector<HTMLElement>("[data-active]");
      if (!target || !target.offsetWidth) {
        el!.style.opacity = "0";
        return;
      }
      Object.assign(el!.style, {
        opacity: "1",
        transform: `translate(${target.offsetLeft}px, ${target.offsetTop}px)`,
        width: `${target.offsetWidth}px`,
        height: `${target.offsetHeight}px`,
      });
      box!.dataset.pill = "";
      // Erst nach der ersten Platzierung animieren, sonst gleitet die Markierung beim Laden von links herein
      requestAnimationFrame(() => (el!.dataset.ready = ""));
    }
    place();
    // Schrift geladen, Fenster breiter: neu ausmessen
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => observer.disconnect();
  }, [active]);

  return { container, pill };
}

/** Klassen der Markierung; Farbe und Rundung kommen dazu */
export const PILL_CLASS =
  "pointer-events-none absolute left-0 top-0 opacity-0 data-ready:transition-[transform,width,height] data-ready:duration-300 data-ready:ease-[cubic-bezier(0.22,1,0.36,1)]";
