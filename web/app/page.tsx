import Link from "next/link";
import { getItems } from "@/lib/data";
import { label } from "@/lib/labels";
import { CATEGORIES, SEASONS } from "@lib/schema.mjs";
import { ColorDot, ItemCard } from "@/components/item-card";

// Reihenfolge im Kleiderschrank: von oben nach unten wie ein Outfit, dann der Rest
const CATEGORY_ORDER = ["jacke", "oberteil", "kleid", "hose", "schuhe", "accessoire", "sport", "unterwaesche"];
const GROUP_TITLES: Record<string, string> = {
  jacke: "Jacken & Mäntel",
  oberteil: "Oberteile",
  kleid: "Kleider",
  hose: "Hosen",
  schuhe: "Schuhe",
  accessoire: "Accessoires",
  sport: "Sport",
  unterwaesche: "Unterwäsche",
};
const rank = (c: string) => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

type Filters = { category?: string; color?: string; season?: string; status?: string };

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
    category: one(sp.category),
    color: one(sp.color),
    season: one(sp.season),
    status: one(sp.status),
  };
  const status = filters.status ?? "aktiv";

  const all = await getItems();
  const items = all.filter(
    (i) =>
      (status === "alle" || i.data.status === status) &&
      (!filters.category || i.data.category === filters.category) &&
      (!filters.color || i.data.colors?.includes(filters.color)) &&
      (!filters.season || i.data.seasons?.includes(filters.season)),
  );

  // Nur Filter anbieten, die im Bestand vorkommen
  const categories = CATEGORIES.filter((c) => all.some((i) => i.data.category === c)).sort((a, b) => rank(a) - rank(b));
  // Gefilterte Teile nach Kategorie gruppieren (Filter wirken also weiterhin)
  const groups = [...new Set(items.map((i) => i.data.category))]
    .sort((a, b) => rank(a) - rank(b))
    .map((c) => ({ category: c, items: items.filter((i) => i.data.category === c) }));
  const colors = [...new Set(all.flatMap((i) => i.data.colors ?? []))].sort();
  const hasOtherStatus = all.some((i) => i.data.status !== "aktiv");

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
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kleiderschrank</h1>
        <span className="text-sm text-muted">
          {items.length} von {all.length} Teilen
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((c) => (
            <Link key={c} href={filterHref(filters, "category", c)} className={`chip shrink-0 ${filters.category === c ? "chip-active" : ""}`}>
              {label(c)}
            </Link>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
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
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <section key={g.category}>
              <h2 className="mb-2 flex items-baseline gap-2 text-lg font-semibold">
                {GROUP_TITLES[g.category] ?? label(g.category)}
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
  );
}
