import Link from "next/link";
import type { ReactNode } from "react";
import { ColorDot } from "@/components/item-card";
import { SlidersHorizontal } from "@/components/icons";

export type FilterChip = { href: string; text: string; active: boolean; color?: string };
export type FilterRow = { title: string; chips: FilterChip[] };

/** Link, der einen Parameter setzt bzw. beim erneuten Klick wieder entfernt; alle anderen Parameter bleiben */
export function toggleHref(path: string, params: Record<string, string | undefined>, key: string, value: string) {
  return withParams(path, { ...params, [key]: params[key] === value ? undefined : value });
}

/** Pfad mit allen gesetzten Parametern */
export function withParams(path: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `${path}?${qs}` : path;
}

/** Button für die Werkzeugleiste, schaltet das Panel auf und zu; `count` = Anzahl aktiver Filter */
export function FilterButton({ count }: { count: number }) {
  return (
    <label htmlFor="filter-toggle" className="filter-btn btn-ghost cursor-pointer px-3 py-1.5 text-sm select-none">
      <SlidersHorizontal className="size-4" />
      Filter
      {count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs leading-5 text-accent-ink">{count}</span>}
    </label>
  );
}

/**
 * Werkzeugleiste (children, mit einem FilterButton darin) und darunter das einklappbare Filter-Panel.
 * Der Button setzt eine versteckte Checkbox (ohne JavaScript); bei aktiven Filtern ist das Panel offen.
 */
export function FilterPanel({
  rows,
  active,
  resetHref,
  toolbarClassName = "",
  children,
}: {
  rows: FilterRow[];
  active: number;
  resetHref: string;
  toolbarClassName?: string;
  children: ReactNode;
}) {
  return (
    <>
      <input type="checkbox" id="filter-toggle" className="peer sr-only" defaultChecked={active > 0} />
      {/* py-2 an der Sortierung wie im Suchfeld, damit alles in der Leiste gleich hoch ist */}
      <div
        className={`flex flex-wrap items-stretch gap-2 [&_select]:py-2 peer-checked:[&_.filter-btn]:border-accent peer-focus-visible:[&_.filter-btn]:border-accent ${toolbarClassName}`}
      >
        {children}
      </div>

      <div className="mt-3 hidden rounded-xl border border-line bg-surface p-3 peer-checked:block sm:p-4">
        <div className="space-y-3">
          {rows
            .filter((row) => row.chips.length > 0)
            .map((row) => (
              <div key={row.title} className="sm:flex sm:gap-4">
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase sm:mb-0 sm:w-20 sm:shrink-0 sm:pt-1.5">{row.title}</p>
                {/* Am Handy seitlich scrollen, am Desktop umbrechen */}
                <div className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                  {row.chips.map((c) => (
                    <Link key={c.href + c.text} href={c.href} className={`chip shrink-0 ${c.active ? "chip-active" : ""}`}>
                      {c.color && <ColorDot color={c.color} />} {c.text}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
        {active > 0 && (
          <div className="mt-3 flex justify-end border-t border-line pt-3">
            <Link href={resetHref} className="text-sm text-muted hover:text-ink">
              Filter zurücksetzen
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
