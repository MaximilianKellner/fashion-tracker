import Link from "next/link";
import { ViewTransition } from "react";
import { getItems, getOutfits, getProfile } from "@/lib/data";
import { currentSeason, label, scoreTone } from "@/lib/labels";
import { completeOutfit, differentParts, outfitSlots, scoreOutfit } from "@lib/outfit-match.mjs";
import { OutfitCollage } from "@/components/outfit-collage";
import { SortSelect } from "@/components/sort-select";
import { RerollButton } from "@/components/reroll-button";
import { FilterButton, FilterPanel, toggleHref, withParams } from "@/components/filter-panel";
import { SEASONS } from "@lib/schema.mjs";
import { basicSorts, byId as byAge, byNumber, pickSort, shuffle, sortChoices, type SortOption } from "@/lib/sort";
import type { Item, Outfit } from "@/lib/types";

type Card = Outfit & { parts: Item[]; score: ReturnType<typeof scoreOutfit> };

// Standard ist die bisherige Reihenfolge (nach Erstellung)
const OUTFIT_SORTS: SortOption<Card>[] = [
  ...basicSorts<Card>((o) => o.data.name),
  { id: "punkte", label: "Beste Punktzahl", compare: (a, b) => byNumber(a.score?.score, b.score?.score, -1) || byAge(a, b) },
  { id: "sterne", label: "Meiste Sterne", compare: (a, b) => byNumber(a.data.rating, b.data.rating, -1) || byAge(a, b) },
];

// Spalten der Outfit-Tabelle; die Vorschlagszeile zeigt genau eine Zeile davon
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
// Reihenfolge: neu 1, neu 2, gespeichert 1, gespeichert 2. Ausgeblendet wird, was nicht in die eine Zeile passt,
// sodass vorne immer die neuen und dahinter die gespeicherten stehen:
// 2 Spalten → neu 1, gespeichert 1 · 3 Spalten → neu 1, neu 2, gespeichert 1 · 4 Spalten → alle
const ONLY_FROM = ["", "hidden sm:block", "", "hidden lg:block"];
// Neue Vorschläge: so viele Teile müssen anders sein als in jedem gespeicherten und im anderen neuen Outfit,
// und so oft wird höchstens gewürfelt
const MIN_NEW = 2;
const MAX_TRIES = 30;

export default async function OutfitsPage({ searchParams }: PageProps<"/outfits">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters = { sort: one(sp.sort), color: one(sp.color), season: one(sp.season) };
  const sort = pickSort(OUTFIT_SORTS, filters.sort);
  const [outfits, items, profile] = await Promise.all([getOutfits(), getItems(), getProfile()]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const saved = outfits.map((o) => ({ id: o.id, items: o.data.items, rating: o.data.rating }));
  // Bewertung wie im Builder (mit den Saisons des Outfits); das Outfit selbst zählt nicht als „schon zusammen getragen“
  const scoreOf = (id: string, parts: Item[], seasons?: string[]) =>
    scoreOutfit(parts, { palette: profile.data.palette, outfits: saved.filter((o) => o.id !== id), seasons });
  const cards: Card[] = outfits
    .map((o) => {
      const parts = o.data.items.map((id) => byId.get(id)).filter((i): i is Item => !!i);
      return { ...o, parts, score: scoreOf(o.id, parts, o.data.seasons) };
    })
    .sort(sort.compare);

  // Saisons eines Outfits: die gespeicherten, sonst die, zu denen alle Teile passen (Teile ohne Saison passen immer)
  const seasonsOf = (o: Card) =>
    o.data.seasons?.length ? o.data.seasons : SEASONS.filter((s) => o.parts.every((p) => !p.data.seasons?.length || p.data.seasons.includes(s)));
  const shown = cards.filter(
    (o) =>
      (!filters.color || o.parts.some((p) => p.data.colors?.includes(filters.color!))) &&
      (!filters.season || seasonsOf(o).includes(filters.season)),
  );
  const colors = [...new Set(cards.flatMap((o) => o.parts.flatMap((p) => p.data.colors ?? [])))].sort();
  const activeFilters = [filters.color, filters.season].filter(Boolean).length;
  const chip = (key: "color" | "season", value: string, color?: string) => ({
    href: toggleHref("/outfits", filters, key, value),
    text: label(value),
    color,
    active: filters[key] === value,
  });

  // Vorschlagszeile: zur Hälfte frisch gewürfelte Outfits (wie „Würfeln“ im Builder, für die aktuelle Jahreszeit),
  // zur Hälfte zufällige gespeicherte; erst die neuen, dann die gespeicherten.
  // Neu heißt: mindestens MIN_NEW Teile anders als jedes gespeicherte Outfit und als der andere neue Vorschlag.
  // Findet sich das nicht, lieber weniger neue Vorschläge als Fast-Duplikate.
  const season = currentSeason();
  const context = { palette: profile.data.palette, outfits: saved, seasons: [season] };
  const slots = outfitSlots([season]);
  const pool = items.filter((i) => i.data.status === "aktiv");
  const fresh: { ids: string[]; parts: Item[]; name: string; score: ReturnType<typeof scoreOutfit> }[] = [];
  for (let tries = 0; fresh.length < 2 && tries < MAX_TRIES && pool.length; tries++) {
    const chosen = completeOutfit({}, pool, context, { slots, random: 1 }) as Record<string, Item | undefined>;
    const parts = slots.map((s) => chosen[s]).filter((i): i is Item => !!i);
    const ids = parts.map((p) => p.id);
    const isNew =
      saved.every((o) => differentParts(ids, o.items) >= MIN_NEW) &&
      fresh.every((f) => differentParts(ids, f.ids) >= MIN_NEW && differentParts(f.ids, ids) >= MIN_NEW);
    if (parts.length < 2 || !isNew) continue;
    const name = [chosen.oberteil, chosen.hose].map((i) => i && label(i.data.colors?.[0])).filter(Boolean).join(" & ");
    fresh.push({ ids, parts, name: name || "Vorschlag", score: scoreOutfit(parts, context) });
  }
  const randomSaved = shuffle(cards).slice(0, 2);
  const picks = [fresh[0], fresh[1], randomSaved[0], randomSaved[1]];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Outfits</h1>
        <div className="flex gap-2">
          {/* Am Handy ausgeblendet: drei Buttons passen nicht neben den Titel */}
          <Link href="/outfits/new" className="btn-ghost max-sm:hidden">
            Aus Liste
          </Link>
          <Link href="/outfits/swipen" className="btn-ghost">
            Swipen
          </Link>
          <Link href="/outfits/builder" className="btn-primary">
            Outfit bauen
          </Link>
        </div>
      </div>

      {(fresh.length > 0 || randomSaved.length > 0) && (
        // Hervorgehoben: Akzent-Rahmen und -Tönung, damit sich die Zeile klar von der Liste darunter abhebt
        <section className="mt-4 rounded-2xl border border-accent/50 bg-accent/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <span aria-hidden className="text-accent">✦</span>
              Vorschläge für heute
            </h2>
            <RerollButton />
          </div>
          <div className={GRID}>
            {picks.map((p, i) =>
              !p ? null : "ids" in p ? (
                <OutfitTile
                  key={`neu-${i}`}
                  href={`/outfits/builder?items=${p.ids.join(",")}`}
                  parts={p.parts}
                  score={p.score}
                  name={p.name}
                  meta="Neu gewürfelt · im Builder speichern"
                  metaClass="font-medium text-accent"
                  badge="Neu"
                  className={ONLY_FROM[i]}
                />
              ) : (
                <OutfitTile
                  key={`gespeichert-${p.id}`}
                  href={`/outfits/${p.id}`}
                  parts={p.parts}
                  score={p.score}
                  name={p.data.name}
                  meta="Aus deinen Outfits"
                  rating={p.data.rating}
                  className={ONLY_FROM[i]}
                />
              ),
            )}
          </div>
        </section>
      )}

      {outfits.length > 1 && (
        // Kopf der eigenen Outfits: Titel mit Anzahl, Filter und Sortierung; Zurücksetzen behält die Sortierung
        <FilterPanel
          rows={[
            { title: "Saison", chips: SEASONS.map((x) => chip("season", x)) },
            { title: "Farbe", chips: colors.map((c) => chip("color", c, c)) },
          ]}
          active={activeFilters}
          resetHref={withParams("/outfits", { sort: filters.sort })}
          toolbarClassName="mt-8"
        >
          {/* Am Handy steht der Titel allein, darunter Filter links und Sortierung rechts */}
          <h2 className="flex basis-full items-baseline gap-2 self-center text-lg font-semibold sm:mr-auto sm:basis-auto">
            Deine Outfits
            <span className="text-sm font-normal text-muted">
              {shown.length === cards.length ? cards.length : `${shown.length} von ${cards.length}`}
            </span>
          </h2>
          <FilterButton count={activeFilters} />
          <div className="ml-auto flex sm:ml-0">
            <SortSelect options={sortChoices(OUTFIT_SORTS)} value={sort.id} />
          </div>
        </FilterPanel>
      )}

      {outfits.length === 0 ? (
        <div className="mx-auto max-w-md py-16 text-center text-muted">
          <p>Noch keine Outfits gespeichert.</p>
          <p className="mt-2">
            Stell eins selbst zusammen oder frag Claude im Repo mit <code>/outfit büro</code> nach Vorschlägen.
          </p>
        </div>
      ) : (
        // Neue Filter oder Sortierung: Liste blendet über (globals.css `.swap`)
        <ViewTransition key={JSON.stringify(filters)} enter="swap" exit="swap" default="none">
        {shown.length === 0 ? (
        <p className="py-12 text-center text-muted">Keine Outfits für diese Filter.</p>
      ) : (
        <div className={`mt-4 ${GRID}`}>
          {shown.map((o) => (
            <OutfitTile
              key={o.id}
              href={`/outfits/${o.id}`}
              parts={o.parts}
              score={o.score}
              name={o.data.name}
              meta={[label(o.data.occasion), o.data.source === "claude" ? "von Claude" : ""].filter(Boolean).join(" · ")}
              rating={o.data.rating}
            />
          ))}
        </div>
        )}
        </ViewTransition>
      )}
    </div>
  );
}

/** Outfit-Karte: Collage, Punktzahl oben rechts, Name und eine Zeile Zusatzinfo */
function OutfitTile({
  href,
  parts,
  score,
  name,
  meta,
  rating,
  badge,
  metaClass = "",
  className = "",
}: {
  href: string;
  parts: Item[];
  score: ReturnType<typeof scoreOutfit>;
  name: string;
  meta: string;
  rating?: number;
  /** Etikett oben links, z.B. „Neu“ für gewürfelte Vorschläge */
  badge?: string;
  /** Zusätzliche Klassen für die Info-Zeile, z.B. Akzentfarbe bei gewürfelten Vorschlägen */
  metaClass?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`card-lift block overflow-hidden rounded-xl border border-line bg-surface ${className}`}>
      <div className="relative">
        <OutfitCollage items={parts} />
        {badge && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink shadow-sm">{badge}</span>
        )}
        {score && (
          <span
            title={`${score.verdict}${score.problems.length ? `: ${score.problems.join(", ")}` : ""}`}
            className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm ${scoreTone(score.score)}`}
          >
            {score.score}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="mt-0.5 flex justify-between text-xs text-muted">
          <span className={`truncate ${metaClass}`}>{meta}</span>
          {rating && <span className="shrink-0">{"★".repeat(rating)}</span>}
        </div>
      </div>
    </Link>
  );
}
