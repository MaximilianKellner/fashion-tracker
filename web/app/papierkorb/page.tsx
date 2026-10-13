import { deleteWish, restoreWish } from "@/app/actions";
import { getTrashedWishes } from "@/lib/data";
import { euro, label } from "@/lib/labels";
import { ConfirmButton } from "@/components/confirm-button";
import { Photo } from "@/components/photo";
import { daysInTrash, TRASH_DAYS } from "@lib/trash.mjs";

export const metadata = { title: "Papierkorb" };

export default async function TrashPage() {
  const wishes = await getTrashedWishes();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Papierkorb</h1>
      <p className="mt-1 text-sm text-muted">
        Gelöschte Wünsche liegen {TRASH_DAYS} Tage hier und werden danach beim nächsten Build endgültig gelöscht.
      </p>

      {wishes.length === 0 ? (
        <p className="py-16 text-center text-muted">Der Papierkorb ist leer.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {wishes.map((w) => {
            const left = Math.max(0, TRASH_DAYS - (daysInTrash(w.data.trashed_at) ?? 0));
            return (
              <li key={w.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                {w.data.photos?.[0] && (
                  <Photo
                    src={`/wish-photos/${w.id}/${w.data.photos[0]}`}
                    alt={w.data.name}
                    className="aspect-[3/4] w-14 shrink-0 rounded-lg"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{w.data.name}</div>
                  <div className="text-sm text-muted">
                    {[label(w.data.category), euro(w.data.price)].filter((x) => x && x !== "–").join(" · ")}
                    {" · "}noch {left} {left === 1 ? "Tag" : "Tage"}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 text-sm">
                  <ConfirmButton action={restoreWish.bind(null, w.id)} className="btn-ghost py-1.5">
                    Wiederherstellen
                  </ConfirmButton>
                  <ConfirmButton
                    action={deleteWish.bind(null, w.id)}
                    confirm={`"${w.data.name}" endgültig löschen?`}
                    className="btn-ghost py-1.5 text-danger"
                  >
                    Endgültig löschen
                  </ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
