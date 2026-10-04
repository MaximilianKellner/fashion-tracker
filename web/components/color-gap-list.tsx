"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { hideGap, restoreGaps } from "@/app/actions";
import { swatch } from "@/lib/labels";
import { Photo } from "./photo";

export type GapSuggestion = {
  key: string;
  color: string;
  colorLabel: string;
  name: string;
  reasons: string[];
  partners: string[];
};
export type GapGroup = { slot: string; label: string; owned: number; counted: string; hidden: number; suggestions: GapSuggestion[] };
export type PartnerInfo = { name: string; photo?: string; color?: string };

const PAGE = 3;

/** Vorschläge je Kategorie: drei auf einmal, „Andere Vorschläge“ blättert weiter, ✕ blendet dauerhaft aus */
export function ColorGapList({ groups, partners }: { groups: GapGroup[]; partners: Record<string, PartnerInfo> }) {
  // Sofort ausblenden, bis die Seite nach dem Speichern neu geladen ist
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [offsets, setOffsets] = useState<Record<string, number>>({});

  function hide(key: string) {
    setHidden((h) => new Set(h).add(key));
    startTransition(() => hideGap(key));
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const visible = group.suggestions.filter((s) => !hidden.has(s.key));
        const offset = (offsets[group.slot] ?? 0) < visible.length ? (offsets[group.slot] ?? 0) : 0;
        const page = visible.slice(offset, offset + PAGE);
        const pages = Math.ceil(visible.length / PAGE);
        const hiddenCount = group.hidden + group.suggestions.length - visible.length;
        const next = () => setOffsets((o) => ({ ...o, [group.slot]: offset + PAGE < visible.length ? offset + PAGE : 0 }));

        return (
          <div key={group.slot}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-sm font-medium">
                {group.label} <span className="font-normal text-muted">· {group.owned} {group.counted}</span>
              </h3>
              <div className="flex gap-3 text-xs text-muted">
                {hiddenCount > 0 && (
                  <button type="button" onClick={() => startTransition(() => restoreGaps(group.slot))} className="underline underline-offset-2">
                    {hiddenCount} ausgeblendet · zurückholen
                  </button>
                )}
                {pages > 1 && (
                  <button type="button" onClick={next} className="underline underline-offset-2">
                    Andere Vorschläge ({offset / PAGE + 1}/{pages})
                  </button>
                )}
              </div>
            </div>
            {page.length === 0 ? (
              <p className="rounded-xl border border-line bg-surface p-3 text-sm text-muted">
                {hiddenCount ? "Keine weiteren Vorschläge." : "Alle Farben deiner Palette sind hier schon vertreten."}
              </p>
            ) : (
              <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
                {page.map((s) => (
                  <GapCard key={s.key} slot={group.slot} groupLabel={group.label} suggestion={s} partners={partners} onHide={() => hide(s.key)} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GapCard({
  slot,
  groupLabel,
  suggestion: s,
  partners,
  onHide,
}: {
  slot: string;
  groupLabel: string;
  suggestion: GapSuggestion;
  partners: Record<string, PartnerInfo>;
  onHide: () => void;
}) {
  const wish = new URLSearchParams({ name: s.name, category: slot, fills_gap: `${s.colorLabel} bei ${groupLabel}`, reason: s.reasons.join(", ") });
  return (
    <li className="flex w-60 shrink-0 snap-start flex-col rounded-xl border border-line bg-surface p-3 sm:w-auto">
      <div className="flex items-start gap-2">
        <span className="h-7 w-7 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: swatch(s.color) }} />
        <span className="min-w-0 flex-1 self-center text-sm font-medium leading-tight">{s.name}</span>
        <button
          type="button"
          onClick={onHide}
          title="Will ich nicht – ausblenden"
          aria-label={`${s.name} ausblenden`}
          className="-mr-1 -mt-1 shrink-0 rounded-full px-1.5 text-muted hover:bg-surface-2 hover:text-ink"
        >
          ✕
        </button>
      </div>
      <ul className="mt-2 flex-1 space-y-0.5 text-xs text-muted">
        {s.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {s.partners.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[11px] text-muted">passt besonders zu</div>
          <div className="flex gap-1">
            {s.partners.map((id) => {
              const p = partners[id];
              return (
                <Link key={id} href={`/items/${id}`} title={p?.name} className="w-1/4 overflow-hidden rounded-md bg-surface-2">
                  {p?.photo ? (
                    <Photo src={`/photos/${id}/${p.photo}`} alt={p.name} className="aspect-square w-full" />
                  ) : (
                    <span className="block aspect-square w-full" style={{ backgroundColor: swatch(p?.color ?? "") }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <Link href={`/wishlist/new?${wish}`} className="btn-ghost mt-2 py-1 text-center text-xs">
        Auf die Wunschliste
      </Link>
    </li>
  );
}
