import Link from "next/link";
import { getItems } from "@/lib/data";
import { label } from "@/lib/labels";
import { CATEGORIES, SEASONS } from "@lib/schema.mjs";
import { ColorDot, ItemCard } from "@/components/item-card";
import { SearchField } from "@/components/search-field";
import { SectionRail } from "@/components/section-rail";
import { CATEGORY_VIEWS, categoryRank as rank, groupTitle, pickView } from "@/lib/categories";
import { SortSelect } from "@/components/sort-select";
import { ViewToggle } from "@/components/view-toggle";
import { basicSorts, byId, byNumber, pickSort, sortChoices, type SortOption } from "@/lib/sort";
import type { Item } from "@/lib/types";

// Innerhalb jeder Kategorie; Standard ist die bisherige Reihenfolge (nach Erfassung)
const ITEM_SORTS: SortOption<Item>[] = [
  ...basicSorts<Item>((i) => i.data.name),
  { id: "preis-ab", label: "Teuerste zuerst", compare: (a, b) => byNumber(a.data.purchase?.price, b.data.purchase?.price, -1) || byId(a, b) },
  { id: "preis-auf", label: "Günstigste zuerst", compare: (a, b) => byNumber(a.data.purchase?.price, b.data.purchase?.price, 1) || byId(a, b) },
];

// q, sort und view gehören dazu, damit Filter-Links Suche, Sortierung und Ansicht behalten
type Filters = { q?: string; category?: string; color?: string; season?: string; status?: string; sort?: string; view?: string };

/** Link, der einen Filter setzt bzw. beim erneuten Klick wieder entfernt */
function filterHref(current: Filters, key: keyof Filters, value: string) {
  const next = { ...current, [key]: current[key] === value ? undefined : value };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/?${qs}` : "/";
}

export default async function WardrobePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters: Filters = {
    q: one(sp.q)?.trim() || undefined,
    category: one(sp.category),
    color: one(sp.color),
    season: one(sp.season),
    status: one(sp.status),
    sort: one(sp.sort),
    view: one(sp.view),
  };
  const status = filters.status ?? "aktiv";
  const sort = pickSort(ITEM_SORTS, filters.sort);
  const view = pickView(filters.view);

  const all = await getItems();
  // Suche: alle Wörter müssen in Name, Marke, Unterkategorie, Farben oder Tags vorkommen
  const words = filters.q?.toLowerCase().split(/\s+/) ?? [];
  const searchText = (i: Item) =>
    [i.data.name, i.data.brand, i.data.subcategory, ...(i.data.colors ?? []).flatMap((c) => [c, label(c)]), ...(i.data.tags ?? [])]
      .join(" ")
      .toLowerCase();
  const items = all.filter(
    (i) =>
      (status === "alle" || i.data.status === status) &&
      (!filters.category || i.data.category === filters.category) &&
      (!filters.color || i.data.colors?.includes(filters.color)) &&
      (!filters.season || i.data.seasons?.includes(filters.season)) &&
      words.every((w) => searchText(i).includes(w)),
  ).sort(sort.compare);

  // Nur Filter anbieten, die im Bestand vorkommen
  const categories = CATEGORIES.filter((c) => all.some((i) => i.data.category === c)).sort((a, b) => rank(a) - rank(b));
  // Gefilterte Teile nach Kategorie gruppieren (Filter wirken also weiterhin)
  const groups = [...new Set(items.map((i) => i.data.category))]
    .sort((a, b) => rank(a) - rank(b))
    .map((c) => ({ category: c, items: items.filter((i) => i.data.category === c) }));
  const colors = [...new Set(all.flatMap((i) => i.data.colors ?? []))].sort();
  const hasOtherStatus = all.some((i) => i.data.status !== "aktiv");
  const activeFilters = [filters.category, filters.color, filters.season, filters.status].filter(Boolean).length;

  if (all.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold">Dein Kleiderschrank ist noch leer</h1>
        <p className="mt-3 text-muted">
          Erfasse dein erstes Teil mit Foto. Alternativ legst du Fotos in den Ordner <code>inbox/</code> und lässt Claude
          mit <code>/neues-teil</code> die Beschreibung schreiben.
        </p>
        <Link href="/items/new" className="btn-primary mt-6">
          Erstes Teil erfassen
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* flex-wrap: am Handy rutschen Sortierung und Ansicht unter den Titel */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kleiderschrank</h1>
          <p className="mt-1 text-sm text-muted">
            {items.length} von {all.length} Teilen
          </p>
        </div>
        {/* items-stretch: der Umschalter übernimmt die Höhe der Sortierung */}
        <div className="ml-auto flex items-stretch gap-2">
          <SortSelect options={sortChoices(ITEM_SORTS)} value={sort.id} />
          <ViewToggle options={[...CATEGORY_VIEWS]} value={view} />
        </div>
      </div>

      <form className="mt-4 flex gap-2">
        {Object.entries(filters).map(([k, v]) => v && k !== "q" && <input key={k} type="hidden" name={k} value={v} />)}
        {/* Vorschläge beim Tippen: Namen, Marken, Tags und Farben aller Teile */}
        <SearchField
          defaultValue={filters.q}
          suggestions={[
            ...new Set(
              all
                .flatMap((i) => [i.data.name, i.data.brand, ...(i.data.tags ?? [])])
                .concat(colors.map((c) => label(c)))
                .filter((s): s is string => !!s),
            ),
          ].sort()}
        />
        <button type="submit" className="btn-primary shrink-0">
          Suchen
        </button>
      </form>

      {/* Filter einklappbar: der Schalter setzt eine versteckte Checkbox (ohne JavaScript), bei aktiven Filtern offen */}
      <input type="checkbox" id="filter-toggle" className="peer sr-only" defaultChecked={activeFilters > 0} />
      <label htmlFor="filter-toggle" className="mt-2 inline-flex cursor-pointer items-center gap-1 text-sm text-muted peer-checked:[&>span]:rotate-180">
        Filter{activeFilters > 0 && ` (${activeFilters})`}
        <span className="transition-transform">▾</span>
      </label>
      {activeFilters > 0 && (
        // Alle Filter löschen, Suche, Sortierung und Ansicht bleiben
        <Link
          href={`/?${new URLSearchParams(Object.entries({ q: filters.q, sort: filters.sort, view: filters.view }).filter(([, v]) => v) as [string, string][])}`}
          title="Filter zurücksetzen"
          aria-label="Filter zurücksetzen"
          className="ml-2 text-sm text-muted hover:text-ink"
        >
          ↺
        </Link>
      )}

      <div className="mt-2 hidden space-y-2 peer-checked:block">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((c) => (
            <Link key={c} href={filterHref(filters, "category", c)} className={`chip shrink-0 ${filters.category === c ? "chip-active" : ""}`}>
              {label(c)}
            </Link>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
          {SEASONS.map((s) => (
            <Link key={s} href={filterHref(filters, "season", s)} className={`chip shrink-0 ${filters.season === s ? "chip-active" : ""}`}>
              {label(s)}
            </Link>
          ))}
          {colors.map((c) => (
            <Link key={c} href={filterHref(filters, "color", c)} className={`chip shrink-0 ${filters.color === c ? "chip-active" : ""}`}>
              <ColorDot color={c} /> {label(c)}
            </Link>
          ))}
          {hasOtherStatus && (
            <Link href={filterHref(filters, "status", "alle")} className={`chip shrink-0 ${status === "alle" ? "chip-active" : ""}`}>
              inkl. aussortierte
            </Link>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted">Keine Teile für diese Filter.</p>
      ) : view === "raster" ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <section key={g.category} id={`kat-${g.category}`} className="scroll-mt-20">
              <h2 className="mb-2 flex items-baseline gap-2 text-lg font-semibold">
                {groupTitle(g.category)}
                <span className="text-sm font-normal text-muted">{g.items.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {g.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {view === "liste" && (
        <SectionRail sections={groups.map((g) => ({ id: `kat-${g.category}`, label: groupTitle(g.category), count: g.items.length }))} />
      )}
    </div>
  );
}
