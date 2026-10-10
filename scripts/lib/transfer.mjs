// Kopiert alle Daten von einem Speicher in einen anderen (Export, Import, Umzug zwischen files und sqlite).
import fs from 'node:fs/promises';
import path from 'node:path';
import { KINDS } from './store/common.mjs';

const PHOTO_FILE = /^photo-\d+\.webp$/;

async function copyPhotos(fromDir, toDir, prune) {
  if (path.resolve(fromDir) === path.resolve(toDir)) return 0;
  let files;
  try {
    files = (await fs.readdir(fromDir)).filter((f) => PHOTO_FILE.test(f));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    files = [];
  }
  if (prune) {
    // Nur Fotos entfernen; bei Teilen liegt item.md im selben Ordner
    const old = await fs.readdir(toDir).catch(() => []);
    for (const f of old) if (PHOTO_FILE.test(f) && !files.includes(f)) await fs.rm(path.join(toDir, f));
  }
  if (!files.length) return 0;
  await fs.mkdir(toDir, { recursive: true });
  for (const f of files) await fs.copyFile(path.join(fromDir, f), path.join(toDir, f));
  return files.length;
}

/**
 * Überträgt Einträge, Fotos und Profil von `from` nach `to`. Vorhandene Einträge mit gleicher ID werden überschrieben.
 * prune: Einträge in `to`, die es in `from` nicht gibt, löschen (das Ziel wird eine genaue Kopie).
 * Gibt die Anzahl pro Art zurück, z. B. { items: 53, …, photos: 120, removed: 0 }.
 */
export async function transfer(from, to, { prune = false } = {}) {
  const counts = { photos: 0, removed: 0 };
  for (const [kind, { photos }] of Object.entries(KINDS)) {
    const records = await from.list(kind);
    for (const r of records) {
      await to.put(kind, r.id, r.data, r.body);
      if (photos) counts.photos += await copyPhotos(from.photoDir(kind, r.id), to.photoDir(kind, r.id), prune);
    }
    counts[kind] = records.length;
    if (prune) {
      const keep = new Set(records.map((r) => r.id));
      for (const id of await to.ids(kind)) {
        if (keep.has(id)) continue;
        await to.remove(kind, id);
        counts.removed++;
      }
    }
  }
  const profile = await from.getProfile();
  if (Object.keys(profile.data).length || profile.body) await to.putProfile(profile.data, profile.body);
  return counts;
}

export const describe = (c) =>
  `${c.items} Teile, ${c.outfits} Outfits, ${c.wishlist} Wünsche, ${c.recommendations} Empfehlungen, ${c.photos} Fotos` +
  (c.removed ? `, ${c.removed} gelöscht` : '');
