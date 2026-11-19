"use client";

import { useLayoutEffect, useRef } from "react";
import { FILTER_OPEN_KEY } from "@/lib/filter-open";

function stored() {
  try {
    return localStorage.getItem(FILTER_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Checkbox „aufgeklappt lassen“ im Filter-Panel; öffnet das Panel beim Aufruf, wenn gesetzt */
export function FilterKeepOpen() {
  const ref = useRef<HTMLInputElement>(null);

  // Vor dem Zeichnen (auch beim Seitenwechsel ohne Neuladen): Panel öffnen, Haken setzen, Markierung an <html> lösen
  useLayoutEffect(() => {
    const keep = stored();
    if (ref.current) ref.current.checked = keep;
    const toggle = document.getElementById("filter-toggle") as HTMLInputElement | null;
    if (keep && toggle) toggle.checked = true;
    delete document.documentElement.dataset.filterOpen;
  }, []);

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none hover:text-ink">
      {/* Eigene Checkbox statt der nativen (die ist im Dunkelmodus grell weiß): Rahmen in der Linienfarbe,
          gesetzt mit Haken und Rahmen in der Akzentfarbe */}
      <span className="grid size-4 shrink-0 place-items-center">
        <input
          ref={ref}
          type="checkbox"
          className="peer col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded border border-line bg-surface-2 outline-none transition-colors checked:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          onChange={(e) => {
            try {
              if (e.target.checked) localStorage.setItem(FILTER_OPEN_KEY, "1");
              else localStorage.removeItem(FILTER_OPEN_KEY);
            } catch {}
          }}
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 size-3 text-accent opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      aufgeklappt lassen
    </label>
  );
}
