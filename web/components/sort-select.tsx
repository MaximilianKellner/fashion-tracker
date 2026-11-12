"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Sortier-Auswahl oben rechts in Listen: setzt ?sort= und behält alle anderen Parameter (z.B. Filter) */
export function SortSelect({ options, value }: { options: { id: string; label: string }[]; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(id: string) {
    const url = new URL(window.location.href);
    // Der Standard (erste Option) steht nicht in der URL
    if (id === options[0]?.id) url.searchParams.delete("sort");
    else url.searchParams.set("sort", id);
    startTransition(() => router.replace(url.pathname + url.search, { scroll: false }));
  }

  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
      <span className="hidden sm:inline">Sortieren</span>
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        aria-label="Sortieren"
        // text-base: kleinere Schrift lässt iOS beim Antippen hineinzoomen
        className={`field w-auto py-1.5 pl-2.5 ${pending ? "opacity-60" : ""}`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
