"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  function change(id: string) {
    const url = new URL(window.location.href);
    // Der Standard (erste Option) steht nicht in der URL
    if (id === options[0]?.id) url.searchParams.delete("view");
    else url.searchParams.set("view", id);
    startTransition(() =>
      router.replace(url.pathname + url.search, { scroll: false }),
    );
  }

  return (
    <div
      role="group"
      aria-label="Ansicht"
      className={`flex shrink-0 rounded-lg border border-line bg-surface p-0.5 ${pending ? "opacity-60" : ""}`}
    >
      {options.map(({ id, label, icon }) => {
        const Icon = ICONS[icon];
        return (
          <button
            key={id}
            type="button"
            onClick={() => change(id)}
            aria-pressed={value === id}
            title={label}
            aria-label={label}
            className={`flex items-center justify-center rounded-md px-1.5 ${value === id ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
