import type { ReactNode } from "react";
import Link from "next/link";
import { getItems, getOutfits, getWishlist } from "@/lib/data";
import { computeStats } from "@lib/stats.mjs";
import { euro, label } from "@/lib/labels";
import { ColorDot } from "@/components/item-card";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Rangliste mit dünnen Balken. Eine Reihe -> eine Farbe, Werte stehen als Text daneben. */
function BarList({
  title,
  data,
  format = (n) => String(n),
  prefix,
}: {
  title: string;
  data: Record<string, number>;
  format?: (n: number) => string;
  prefix?: (key: string) => ReactNode;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Daten.</p>
      ) : (
        <ul className="space-y-2.5">
          {entries.map(([key, value]) => (
            <li key={key} title={`${label(key)}: ${format(value)}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {prefix?.(key)}
                  <span className="truncate">{label(key)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">{format(value)}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-surface-2">
                <div className="h-2 rounded bg-accent" style={{ width: `${(value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function StatsPage() {
  const [items, outfits, wishlist] = await Promise.all([getItems(), getOutfits(), getWishlist()]);
  const stats = computeStats(items, outfits, wishlist);
  const priced = stats.items.total - stats.value.itemsWithoutPrice;
  const unused = stats.outfits.itemsNotInAnyOutfit as string[];
  const byId = new Map(items.map((i) => [i.id, i]));

  // Jahre chronologisch statt nach Wert sortieren
  const spendByYear = Object.fromEntries(
    Object.entries(stats.value.spendByYear as Record<string, number>).sort(([a], [b]) => b.localeCompare(a)),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Statistik</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Aktive Teile" value={String(stats.items.active)} sub={`${stats.items.total} insgesamt`} />
        <Tile
          label="Wert (aktiv)"
          value={euro(stats.value.totalActive)}
          sub={
            stats.value.itemsWithoutPrice
              ? `${stats.value.itemsWithoutPrice} ${stats.value.itemsWithoutPrice === 1 ? "Teil" : "Teile"} ohne Preis`
              : `alle ${priced} mit Preis`
          }
        />
        <Tile label="Outfits" value={String(stats.outfits.total)} sub={`${unused.length} ${unused.length === 1 ? "Teil" : "Teile"} in keinem Outfit`} />
        <Tile label="Wunschliste" value={String(stats.wishlist.open)} sub={`offen · ${euro(stats.wishlist.openValue)}`} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <BarList title="Kategorien" data={stats.byCategory} />
        <BarList title="Farben" data={stats.byColor} prefix={(c) => <ColorDot color={c} />} />
        <BarList title="Wert pro Kategorie" data={stats.value.byCategory} format={euro} />
        {/* Jahre als eigene Liste, Reihenfolge chronologisch absteigend */}
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-3 font-semibold">Ausgaben pro Jahr</h2>
          {Object.keys(spendByYear).length === 0 ? (
            <p className="text-sm text-muted">Noch keine Preise erfasst.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(spendByYear).map(([year, value]) => (
                  <tr key={year} className="border-b border-line last:border-0">
                    <td className="py-2">{year}</td>
                    <td className="py-2 text-right tabular-nums">{euro(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <BarList title="Saisons" data={stats.bySeason} />
        <BarList title="Marken" data={stats.byBrand} />
      </div>

      {unused.length > 0 && stats.outfits.total > 0 && (
        <section className="mt-4 rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">In keinem Outfit</h2>
          <p className="mt-1 text-sm text-muted">Kandidaten für neue Kombinationen oder fürs Aussortieren.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unused.map((id) => (
              <Link key={id} href={`/items/${id}`} className="chip">
                {byId.get(id)?.data.name ?? id}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
