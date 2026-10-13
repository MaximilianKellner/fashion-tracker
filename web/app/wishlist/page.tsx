import Link from "next/link";
import { deleteWish, setWishStatus } from "@/app/actions";
import { getWishlist } from "@/lib/data";
import { euro, label, PRIORITY } from "@/lib/labels";
import { ConfirmButton } from "@/components/confirm-button";
import { WishRemoveButton } from "@/components/wish-remove-button";
import { Photo } from "@/components/photo";
import type { Wish } from "@/lib/types";

function WishRow({ wish }: { wish: Wish }) {
  const { data } = wish;
  const open = data.status === "offen";
  return (
    <li className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface ${open ? "" : "opacity-70"}`}>
      {data.photos?.[0] ? (
        <Photo src={`/wish-photos/${wish.id}/${data.photos[0]}`} alt={data.name} className="aspect-[4/5] w-full" />
      ) : (
        <div className="aspect-[4/5] w-full bg-surface-2" />
      )}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 font-medium leading-snug">{data.name}</div>
          <div className="shrink-0 font-medium">{euro(data.price)}</div>
        </div>
        <div className="mt-0.5 text-sm text-muted">
          {[
            label(data.category),
            data.priority ? `Priorität ${PRIORITY[data.priority].toLowerCase()}` : "",
            !open ? label(data.status) : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-3 text-sm">
          {data.link && (
            <a href={data.link} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5">
              Zum Shop ↗
            </a>
          )}
          {open && (
            <>
              <Link href={`/items/new?fromWish=${wish.id}`} className="btn-primary py-1.5">
                Gekauft – erfassen
              </Link>
              </>
          )}
          {!open && (
            <ConfirmButton action={setWishStatus.bind(null, wish.id, "offen")} className="btn-ghost py-1.5">
              Wieder öffnen
            </ConfirmButton>
          )}
          <Link href={`/wishlist/${wish.id}/edit`} className="btn-ghost py-1.5">
            Bearbeiten
          </Link>
          {open ? (
            <WishRemoveButton
              name={data.name}
              discard={setWishStatus.bind(null, wish.id, "verworfen")}
              remove={deleteWish.bind(null, wish.id)}
            />
          ) : (
            <ConfirmButton action={deleteWish.bind(null, wish.id)} confirm={`"${data.name}" löschen?`} className="btn-ghost py-1.5 text-danger">
              Löschen
            </ConfirmButton>
          )}
        </div>
      </div>
    </li>
  );
}

export default async function WishlistPage() {
  const wishes = await getWishlist();
  const open = wishes.filter((w) => w.data.status === "offen").sort((a, b) => (a.data.priority ?? 2) - (b.data.priority ?? 2));
  const done = wishes.filter((w) => w.data.status !== "offen");
  const total = open.reduce((s, w) => s + (w.data.price ?? 0), 0);

  return (
    <div className="mx-auto max-w-[110rem]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Wunschliste</h1>
        <Link href="/wishlist/new" className="btn-primary">
          Neuer Wunsch
        </Link>
      </div>
      {open.length > 0 && (
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
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {open.map((w) => (
            <WishRow key={w.id} wish={w} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-muted">Erledigt ({done.length})</summary>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {done.map((w) => (
              <WishRow key={w.id} wish={w} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
