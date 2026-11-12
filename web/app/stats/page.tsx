import type { ReactNode } from "react";
import Link from "next/link";
import { getItems, getOutfits, getWishlist } from "@/lib/data";
import { computeStats } from "@lib/stats.mjs";
import { euro, label } from "@/lib/labels";
import { ColorDot } from "@/components/item-card";
import { ColorTreemap } from "@/components/color-treemap";

function Tile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Kachel im Bento-Raster. `className` legt die Spannweite fest. */
function Card({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Rangliste mit dünnen Balken. Eine Reihe -> eine Farbe, Werte stehen als Text daneben.
 * `twoCol` verteilt lange Listen auf zwei Spalten, `limit` klappt den Rest ein (`0` = ganze Liste eingeklappt).
 */
function BarList({
  title,
  data,
  format = (n) => String(n),
  prefix,
  className,
  twoCol = false,
  limit,
  chart,
}: {
  title: string;
  data: Record<string, number>;
  format?: (n: number) => string;
  prefix?: (key: string) => ReactNode;
  className?: string;
  twoCol?: boolean;
  limit?: number;
  /** Grafik über der Liste */
  chart?: ReactNode;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const shown = limit !== undefined ? entries.slice(0, limit) : entries;
  const rest = limit !== undefined ? entries.slice(limit) : [];
  const listClass = twoCol ? "grid grid-cols-2 gap-x-4 gap-y-2.5 sm:gap-x-6" : "space-y-2.5";

  const rows = (list: [string, number][]) =>
    list.map(([key, value]) => (
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
    ));

  return (
    <Card title={title} className={className}>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Daten.</p>
      ) : (
        <>
          {chart}
          {shown.length > 0 && <ul className={listClass}>{rows(shown)}</ul>}
          {rest.length > 0 && (
            <details className="group mt-3">
              <summary className="cursor-pointer text-sm text-muted hover:text-ink">
                <span className="group-open:hidden">
                  {shown.length > 0 ? `${rest.length} weitere anzeigen` : "Als Liste anzeigen"}
                </span>
                <span className="hidden group-open:inline">
                  {shown.length > 0 ? "Weniger anzeigen" : "Liste ausblenden"}
                </span>
              </summary>
              <ul className={`mt-2.5 ${listClass}`}>{rows(rest)}</ul>
            </details>
          )}
        </>
      )}
    </Card>
  );
}

export default async function StatsPage() {
  const [items, outfits, wishlist] = await Promise.all([getItems(), getOutfits(), getWishlist()]);
  const stats = computeStats(items, outfits, wishlist);
  const priced = stats.items.total - stats.value.itemsWithoutPrice;
  const unused = stats.outfits.itemsNotInAnyOutfit as string[];
  const noPrice = stats.value.idsWithoutPrice as string[];
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
            stats.value.itemsWithoutPrice ? (
              <a href="#ohne-preis" className="underline decoration-dotted underline-offset-2 hover:text-ink">
                {stats.value.itemsWithoutPrice} {stats.value.itemsWithoutPrice === 1 ? "Teil" : "Teile"} ohne Preis
              </a>
            ) : (
              `alle ${priced} mit Preis`
            )
          }
        />
        <Tile
          label="Outfits"
          value={String(stats.outfits.total)}
          sub={
            unused.length > 0 && stats.outfits.total > 0 ? (
              <a href="#kein-outfit" className="underline decoration-dotted underline-offset-2 hover:text-ink">
                {unused.length} {unused.length === 1 ? "Teil" : "Teile"} in keinem Outfit
              </a>
            ) : (
              `${unused.length} ${unused.length === 1 ? "Teil" : "Teile"} in keinem Outfit`
            )
          }
        />
        <Tile label="Wunschliste" value={String(stats.wishlist.open)} sub={`offen · ${euro(stats.wishlist.openValue)}`} />
      </div>

      {/*
        Bento-Raster: Farben als große Kachel (Mosaik füllt die Höhe, Liste eingeklappt), daneben die
        kurzen Listen übereinander. Darunter Saisons und Jahre schmal, Marken breit und eingeklappt.
      */}
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <BarList
          title="Farben"
          data={stats.byColor}
          prefix={(c) => <ColorDot color={c} />}
          twoCol
          limit={0}
          chart={<ColorTreemap data={stats.byColor} />}
          className="flex flex-col md:col-span-2 lg:row-span-2"
        />
        <BarList title="Kategorien" data={stats.byCategory} className="lg:col-span-2" />
        <BarList title="Wert pro Kategorie" data={stats.value.byCategory} format={euro} className="lg:col-span-2" />
        <BarList title="Saisons" data={stats.bySeason} />
        {/* Jahre als eigene Liste, Reihenfolge chronologisch absteigend */}
        <Card title="Ausgaben pro Jahr">
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
        </Card>
        <BarList title="Marken" data={stats.byBrand} twoCol limit={8} className="md:col-span-2" />
      </div>

      {noPrice.length > 0 && (
        <section id="ohne-preis" className="mt-4 scroll-mt-20 rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Ohne Preis</h2>
          <p className="mt-1 text-sm text-muted">Fehlen im Wert und in den Ausgaben pro Jahr.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {noPrice.map((id) => (
              <Link key={id} href={`/items/${id}`} className="chip">
                {byId.get(id)?.data.name ?? id}
              </Link>
            ))}
          </div>
        </section>
      )}

      {unused.length > 0 && stats.outfits.total > 0 && (
        <section id="kein-outfit" className="mt-4 scroll-mt-20 rounded-xl border border-line bg-surface p-4">
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
