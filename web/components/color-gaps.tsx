import Link from "next/link";
import { colorGaps } from "@lib/color-gaps.mjs";
import { getItems, getProfile } from "@/lib/data";
import { swatch } from "@/lib/labels";
import { Photo } from "./photo";

/** Welche Farbe würde Hosen, Oberteile, Schuhe und Jacken am meisten ergänzen? Berechnet aus dem Schrank (color-gaps.mjs). */
export async function ColorGaps() {
  const [items, profile] = await Promise.all([getItems(), getProfile()]);
  const groups = colorGaps(items, { palette: profile.data.palette });
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted">Welche Farbe fehlt?</h2>
      <p className="mb-3 mt-0.5 text-xs text-muted">
        Jede Farbe aus deiner Palette als neues Teil gegen alle Kombinationen im Schrank bewertet, wie im Outfit-Builder. Vorne steht,
        was am vielseitigsten ist und sich am deutlichsten von dem unterscheidet, was du schon hast.
      </p>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.slot}>
            <h3 className="mb-1.5 text-sm font-medium">
              {group.label} <span className="font-normal text-muted">· {group.owned} {group.counted}</span>
            </h3>
            {group.suggestions.length === 0 ? (
              <p className="rounded-xl border border-line bg-surface p-3 text-sm text-muted">
                Alle Farben deiner Palette sind hier schon vertreten.
              </p>
            ) : (
              <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
                {group.suggestions.map((s) => {
                  const wish = new URLSearchParams({
                    name: s.name,
                    category: group.slot,
                    fills_gap: `${s.colorLabel} bei ${group.label}`,
                    reason: s.reasons.join(", "),
                  });
                  return (
                    <li key={s.color} className="flex w-60 shrink-0 snap-start flex-col rounded-xl border border-line bg-surface p-3 sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: swatch(s.color) }} />
                        <span className="min-w-0 text-sm font-medium leading-tight">{s.name}</span>
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
                              const item = byId.get(id);
                              const photo = item?.data.photos?.[0];
                              return (
                                <Link key={id} href={`/items/${id}`} title={item?.data.name} className="w-1/4 overflow-hidden rounded-md bg-surface-2">
                                  {photo ? (
                                    <Photo src={`/photos/${id}/${photo}`} alt={item.data.name} className="aspect-square w-full" />
                                  ) : (
                                    <span className="block aspect-square w-full" style={{ backgroundColor: swatch(item?.data.colors?.[0] ?? "") }} />
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
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
