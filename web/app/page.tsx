import Form from "next/form";
import Link from "next/link";
import { ViewTransition } from "react";
import { getItems } from "@/lib/data";
import { label } from "@/lib/labels";
import { CATEGORIES, SEASONS } from "@lib/schema.mjs";
import { ItemCard } from "@/components/item-card";
import { FilterButton, FilterPanel, toggleHref, withParams } from "@/components/filter-panel";
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

  const chip = (key: keyof Filters, value: string, text: string, color?: string) => ({
    href: toggleHref("/", filters, key, value),
    text,
    color,
    active: (key === "status" ? status : filters[key]) === value,
  });
  const filterRows = [
    { title: "Kategorie", chips: categories.map((c) => chip("category", c, label(c))) },
    { title: "Saison", chips: SEASONS.map((s) => chip("season", s, label(s))) },
    { title: "Farbe", chips: colors.map((c) => chip("color", c, label(c), c)) },
    { title: "Status", chips: hasOtherStatus ? [chip("status", "alle", "inkl. aussortierte")] : [] },
  ];

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kleiderschrank</h1>
          <p className="mt-1 text-sm text-muted">
            {items.length === all.length ? `${all.length} Teile` : `${items.length} von ${all.length} Teilen`}
          </p>
        </div>
        <ViewToggle options={[...CATEGORY_VIEWS]} value={view} />
      </div>

      {/* Werkzeugleiste: am Handy steht die Suche allein in der ersten Zeile; Zurücksetzen behält Suche, Sortierung und Ansicht */}
      <FilterPanel
        rows={filterRows}
        active={activeFilters}
        resetHref={withParams("/", { q: filters.q, sort: filters.sort, view: filters.view })}
        toolbarClassName="mt-4"
      >
        {/* next/form: Suchen wechselt ohne Neuladen wie die Filter (Liste blendet über, Scrollposition bleibt) */}
        <Form action="/" scroll={false} className="flex basis-full sm:basis-0 sm:flex-1">
          {Object.entries(filters).map(([k, v]) => v && k !== "q" && <input key={k} type="hidden" name={k} value={v} />)}
          {/* Vorschläge beim Tippen: Namen, Marken, Tags und Farben aller Teile; Enter sucht */}
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
        </Form>
        <FilterButton count={activeFilters} />
        <div className="ml-auto flex">
          <SortSelect options={sortChoices(ITEM_SORTS)} value={sort.id} />
        </div>
      </FilterPanel>

      {/* Neue Filter, Sortierung oder Ansicht: Liste blendet über, Karten, die bleiben, gleiten an ihren neuen Platz */}
      <ViewTransition key={JSON.stringify(filters)} enter="swap" exit="swap" default="none">
      <div>
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
      </div>
      </ViewTransition>
      {view === "liste" && (
        <SectionRail sections={groups.map((g) => ({ id: `kat-${g.category}`, label: groupTitle(g.category), category: g.category, count: g.items.length }))} />
      )}
    </div>
  );
}
