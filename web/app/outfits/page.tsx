import Link from "next/link";
import { getItems, getOutfits, getProfile } from "@/lib/data";
import { label, scoreTone } from "@/lib/labels";
import { scoreOutfit } from "@lib/outfit-match.mjs";
import { OutfitCollage } from "@/components/outfit-collage";
import { SortSelect } from "@/components/sort-select";
import { basicSorts, byId as byAge, byNumber, pickSort, sortChoices, type SortOption } from "@/lib/sort";
import type { Item, Outfit } from "@/lib/types";

type Card = Outfit & { parts: Item[]; score: ReturnType<typeof scoreOutfit> };

// Standard ist die bisherige Reihenfolge (nach Erstellung)
const OUTFIT_SORTS: SortOption<Card>[] = [
  ...basicSorts<Card>((o) => o.data.name),
  { id: "punkte", label: "Beste Punktzahl", compare: (a, b) => byNumber(a.score?.score, b.score?.score, -1) || byAge(a, b) },
  { id: "sterne", label: "Meiste Sterne", compare: (a, b) => byNumber(a.data.rating, b.data.rating, -1) || byAge(a, b) },
];

export default async function OutfitsPage({ searchParams }: PageProps<"/outfits">) {
  const sort = pickSort(OUTFIT_SORTS, (await searchParams).sort);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Outfits</h1>
        <div className="flex gap-2">
          <Link href="/outfits/new" className="btn-ghost">
            Aus Liste
          </Link>
          <Link href="/outfits/builder" className="btn-primary">
            Outfit bauen
          </Link>
        </div>
      </div>
      {outfits.length > 1 && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{outfits.length} Outfits</span>
          <SortSelect options={sortChoices(OUTFIT_SORTS)} value={sort.id} />
        </div>
      )}

      {outfits.length === 0 ? (
        <div className="mx-auto max-w-md py-16 text-center text-muted">
          <p>Noch keine Outfits gespeichert.</p>
          <p className="mt-2">
            Stell eins selbst zusammen oder frag Claude im Repo mit <code>/outfit büro</code> nach Vorschlägen.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map(({ parts, score, ...o }) => (
            <Link key={o.id} href={`/outfits/${o.id}`} className="block overflow-hidden rounded-xl border border-line bg-surface">
              <div className="relative">
                <OutfitCollage items={parts} />
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
                <div className="truncate text-sm font-medium">{o.data.name}</div>
                <div className="mt-0.5 flex justify-between text-xs text-muted">
                  <span className="truncate">{[label(o.data.occasion), o.data.source === "claude" ? "von Claude" : ""].filter(Boolean).join(" · ")}</span>
                  {o.data.rating && <span className="shrink-0">{"★".repeat(o.data.rating)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
