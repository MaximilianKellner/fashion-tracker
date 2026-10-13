"use client";

import { useEffect, useState } from "react";

export type RailSection = { id: string; label: string };

/**
 * Sprungmarken am rechten Rand: ein Punkt je Abschnitt, der aktuelle ist hervorgehoben. Klick scrollt weich zum
 * Abschnitt, beim Darüberfahren erscheint der Name. Die Abschnitte brauchen ein Element mit der passenden id.
 */
export function SectionRail({ sections }: { sections: RailSection[] }) {
  const key = sections.map((s) => s.id).join(",");
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const update = () => {
      // Aktiv ist der letzte Abschnitt, dessen Oberkante im oberen Drittel des Fensters angekommen ist
      const line = window.innerHeight / 3;
      let current = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // Ganz unten ist der letzte Abschnitt aktiv, auch wenn er zu kurz für die Linie ist
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1)?.id ?? current;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sections wird bei jedem Render neu gebaut, der Inhalt steckt im Schlüssel
  }, [key]);

  if (sections.length < 2) return null;
  return (
    // Am Handy weiter oben als die untere Navigationsleiste
    <nav
      aria-label="Zu Kategorie springen"
      className="fixed right-1.5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-0.5 sm:right-3"
    >
      {sections.map((s) => {
        const on = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-current={on ? "true" : undefined}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="group flex items-center gap-2 py-1.5 pl-3"
          >
            <span
              className={`hidden rounded-full bg-surface px-2 py-0.5 text-xs shadow ring-1 ring-line transition-opacity sm:block ${
                on ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              {s.label}
            </span>
            <span
              className={`block rounded-full transition-all ${on ? "h-3 w-3 bg-accent" : "h-2 w-2 bg-muted/50 group-hover:bg-muted"}`}
            />
          </button>
        );
      })}
    </nav>
  );
}
