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
      <input
        ref={ref}
        type="checkbox"
        className="size-4 accent-accent"
        onChange={(e) => {
          try {
            if (e.target.checked) localStorage.setItem(FILTER_OPEN_KEY, "1");
            else localStorage.removeItem(FILTER_OPEN_KEY);
          } catch {}
        }}
      />
      aufgeklappt lassen
    </label>
  );
}
