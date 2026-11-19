"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { PILL_CLASS, useSlidingPill } from "./sliding-pill";
import { LayoutGrid, Rows } from "@/components/icons";

// Icons per Name, weil Komponenten nicht vom Server an eine Client-Komponente übergeben werden können
const ICONS = { rows: Rows, grid: LayoutGrid };
export type ViewOption = {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
};

/** Umschalter zwischen Ansichten oben rechts (neben der Sortierung): setzt ?view= und behält alle anderen Parameter */
export function ViewToggle({
  options,
  value,
}: {
  options: ViewOption[];
  value: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Die Markierung springt sofort um, während die neue Ansicht noch lädt
  const [shown, setShown] = useOptimistic(value);
  const { container, pill } = useSlidingPill<HTMLDivElement>(shown);

  function change(id: string) {
    const url = new URL(window.location.href);
    // Der Standard (erste Option) steht nicht in der URL
    if (id === options[0]?.id) url.searchParams.delete("view");
    else url.searchParams.set("view", id);
    startTransition(() => {
      setShown(id);
      router.replace(url.pathname + url.search, { scroll: false });
    });
  }

  return (
    <div
      ref={container}
      role="group"
      aria-label="Ansicht"
      className="group/pill relative flex shrink-0 rounded-lg border border-line bg-surface p-0.5"
    >
      {/* Hintergrund der gewählten Ansicht gleitet hinter dem Symbol zur neuen */}
      <span ref={pill} aria-hidden className={`${PILL_CLASS} rounded-md bg-surface-2`} />
      {options.map(({ id, label, icon }) => {
        const Icon = ICONS[icon];
        return (
          <button
            key={id}
            type="button"
            onClick={() => change(id)}
            aria-pressed={shown === id}
            data-active={shown === id || undefined}
            title={label}
            aria-label={label}
            // Quadratisch, unabhängig davon, was daneben steht
            className={`relative flex size-7 items-center justify-center rounded-md transition-colors duration-300 ${shown === id ? "bg-surface-2 text-ink group-data-[pill]/pill:bg-transparent" : "text-muted hover:text-ink"}`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
