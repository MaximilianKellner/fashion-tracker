import Link from "next/link";
import { setWishStatus, trashWish } from "@/app/actions";
import { getWishlist } from "@/lib/data";
import { euro, label, PRIORITY } from "@/lib/labels";
import { ConfirmButton } from "@/components/confirm-button";
import { Pencil, ShoppingBag } from "@/components/icons";
import { TrashButton } from "@/components/trash-button";
import { Photo } from "@/components/photo";
import { SectionRail } from "@/components/section-rail";
import { SortSelect } from "@/components/sort-select";
import { ViewToggle } from "@/components/view-toggle";
import { CATEGORY_VIEWS, categoryRank, groupTitle, pickView } from "@/lib/categories";
import { basicSorts, byId, byNumber, pickSort, sortChoices, type SortOption } from "@/lib/sort";
import type { Wish } from "@/lib/types";

// Standard wie bisher: hohe Priorität zuerst (1 = hoch, ohne Angabe mittel)
const WISH_SORTS: SortOption<Wish>[] = [
  { id: "prioritaet", label: "Priorität", compare: (a, b) => (a.data.priority ?? 2) - (b.data.priority ?? 2) || byId(a, b) },
  ...basicSorts<Wish>((w) => w.data.name),
  { id: "preis-auf", label: "Günstigste zuerst", compare: (a, b) => byNumber(a.data.price, b.data.price, 1) || byId(a, b) },
  { id: "preis-ab", label: "Teuerste zuerst", compare: (a, b) => byNumber(a.data.price, b.data.price, -1) || byId(a, b) },
];

function WishCard({ wish }: { wish: Wish }) {
  const { data } = wish;
  const open = data.status === "offen";
  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface ${open ? "" : "opacity-70"}`}>
      <Link href={`/wishlist/${wish.id}/edit`} className="group block aspect-[3/4] overflow-hidden">
        {data.photos?.[0] ? (
          <Photo
            src={`/wish-photos/${wish.id}/${data.photos[0]}`}
            alt={data.name}
            className="h-full w-full transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-surface-2" />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-2.5">
        <div className="line-clamp-2 text-sm font-medium leading-snug">{data.name}</div>
        <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-muted">
          <span className="truncate">
            {[
              !open ? label(data.category) : "",
              data.priority ? `Prio ${PRIORITY[data.priority].toLowerCase()}` : "",
              !open ? label(data.status) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="shrink-0 text-sm font-medium text-ink">{euro(data.price)}</span>
        </div>
        <div className="mt-auto flex gap-1.5 pt-2.5 text-sm">
          {data.link && (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex-1 justify-center px-2 py-1.5"
              title="Im Shop ansehen"
              aria-label="Im Shop ansehen"
            >
              <ShoppingBag className="size-4" />
            </a>
          )}
          <Link
            href={`/wishlist/${wish.id}/edit`}
            className="btn-ghost flex-1 justify-center px-2 py-1.5"
            title="Bearbeiten"
            aria-label="Bearbeiten"
          >
            <Pencil className="size-4" />
          </Link>
          <TrashButton name={data.name} action={trashWish.bind(null, wish.id)} />
        </div>
        {open ? (
          <Link href={`/items/new?fromWish=${wish.id}`} className="btn-primary mt-1.5 w-full justify-center py-1.5 text-sm">
            Gekauft
          </Link>
        ) : (
          <ConfirmButton action={setWishStatus.bind(null, wish.id, "offen")} className="btn-ghost mt-1.5 w-full justify-center py-1.5 text-sm">
            Wieder öffnen
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

/** Raster wie im Kleiderschrank */
function WishGrid({ wishes }: { wishes: Wish[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {wishes.map((w) => (
        <li key={w.id}>
          <WishCard wish={w} />
        </li>
      ))}
    </ul>
  );
}

// Gruppe für Wünsche ohne Kategorie, steht immer ganz unten
const NO_CATEGORY = "ohne";

export default async function WishlistPage({ searchParams }: PageProps<"/wishlist">) {
  const sp = await searchParams;
  const sort = pickSort(WISH_SORTS, sp.sort);
  const view = pickView(sp.view);
  const wishes = (await getWishlist()).sort(sort.compare);
  const open = wishes.filter((w) => w.data.status === "offen");
  const done = wishes.filter((w) => w.data.status !== "offen");
  const total = open.reduce((s, w) => s + (w.data.price ?? 0), 0);
  // Offene Wünsche nach Kategorie gruppieren, Reihenfolge wie im Kleiderschrank, ohne Kategorie zuletzt
  const groups = [...new Set(open.map((w) => w.data.category ?? NO_CATEGORY))]
    .sort((a, b) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : categoryRank(a) - categoryRank(b)))
    .map((c) => ({
      category: c,
      title: c === NO_CATEGORY ? "Ohne Kategorie" : groupTitle(c),
      wishes: open.filter((w) => (w.data.category ?? NO_CATEGORY) === c),
    }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Wunschliste</h1>
        <Link href="/wishlist/new" className="btn-primary">
          Neuer Wunsch
        </Link>
      </div>
      {wishes.length > 1 && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm text-muted">{open.length > 0 && `${open.length} offen · ${euro(total)}`}</span>
          {/* items-stretch: der Umschalter übernimmt die Höhe der Sortierung */}
          <div className="flex items-stretch gap-2">
            <SortSelect options={sortChoices(WISH_SORTS)} value={sort.id} />
            <ViewToggle options={[...CATEGORY_VIEWS]} value={view} />
          </div>
        </div>
      )}
      {wishes.length <= 1 && open.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {open.length} offen · zusammen {euro(total)}
        </p>
      )}

      {wishes.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p>Noch keine Wünsche.</p>
          <p className="mt-2">
            Frag Claude im Repo mit <code>/kaufempfehlung</code>. Die Empfehlungen landen dann hier.
          </p>
        </div>
      ) : view === "raster" ? (
        <div className="mt-4">
          <WishGrid wishes={open} />
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <section key={g.category} id={`kat-${g.category}`} className="scroll-mt-20">
              <h2 className="mb-2 flex items-baseline gap-2 text-lg font-semibold">
                {g.title}
                <span className="text-sm font-normal text-muted">{g.wishes.length}</span>
              </h2>
              <WishGrid wishes={g.wishes} />
            </section>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-muted">Erledigt ({done.length})</summary>
          <div className="mt-3">
            <WishGrid wishes={done} />
          </div>
        </details>
      )}
      {view === "liste" && groups.length > 1 && <SectionRail sections={groups.map((g) => ({ id: `kat-${g.category}`, label: g.title, count: g.wishes.length }))} />}
    </div>
  );
}
