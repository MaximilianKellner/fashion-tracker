// Papierkorb: Wünsche mit trashed_at (JJJJ-MM-TT) gelten als gelöscht und werden nach TRASH_DAYS Tagen endgültig entfernt.
import { deleteWish, readWishlist } from './data.mjs';

export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** Tage, die ein Eintrag seit dem Verschieben in den Papierkorb dort liegt (null bei ungültigem Datum) */
export function daysInTrash(trashedAt, today = new Date()) {
  const t = Date.parse(`${trashedAt}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - t) / DAY);
}

/** Löscht alle Wünsche, die seit mehr als `days` Tagen im Papierkorb liegen; gibt die gelöschten IDs zurück */
export async function purgeTrash({ days = TRASH_DAYS, today = new Date() } = {}) {
  const purged = [];
  for (const wish of await readWishlist()) {
    const age = wish.data.trashed_at ? daysInTrash(wish.data.trashed_at, today) : null;
    if (age !== null && age > days) {
      await deleteWish(wish.id);
      purged.push(wish.id);
    }
  }
  return purged;
}
