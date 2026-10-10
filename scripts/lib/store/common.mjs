// Gemeinsames der beiden Speicher (files.mjs, sqlite.mjs): Arten von Einträgen, Feldreihenfolge, Foto-Ordner.
import path from 'node:path';
import { ITEM_FIELDS, OUTFIT_FIELDS, PROFILE_FIELDS, RECOMMENDATION_FIELDS, WISHLIST_FIELDS } from '../schema.mjs';

/**
 * Arten von Einträgen. dir: Ordner im Datenverzeichnis; nested: <dir>/<id>/item.md statt <dir>/<id>.md;
 * photos: Fotos liegen in <dir>/<id>/photo-N.webp (in beiden Speichern als Dateien).
 */
export const KINDS = {
  items: { dir: 'wardrobe', nested: true, photos: true, fields: ITEM_FIELDS },
  outfits: { dir: 'outfits', fields: OUTFIT_FIELDS },
  wishlist: { dir: 'wishlist', photos: true, fields: WISHLIST_FIELDS },
  recommendations: { dir: 'recommendations', fields: RECOMMENDATION_FIELDS },
};
export const PROFILE = { file: 'profile.md', fields: PROFILE_FIELDS };

export function kindOf(kind) {
  const k = KINDS[kind];
  if (!k) throw new Error(`Unbekannte Art "${kind}" (erlaubt: ${Object.keys(KINDS).join(', ')})`);
  return k;
}

/** Ordner mit den Fotos eines Eintrags, z. B. <root>/wardrobe/<id> */
export function photoDir(root, kind, id) {
  // Das Datenverzeichnis steht erst zur Laufzeit fest; ohne den Hinweis nähme Next.js das ganze Projekt in den Build auf
  return path.join(/*turbopackIgnore: true*/ root, kindOf(kind).dir, id);
}

// YAML macht aus 2024-03-15 ein Date-Objekt. Wir arbeiten durchgehend mit Strings.
export function normalize(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

/** Felder in Schema-Reihenfolge, unbekannte dahinter; undefined-Felder entfernen (YAML und JSON können sie nicht speichern) */
export function cleanData(data, fields = {}) {
  const ordered = {};
  for (const key of [...Object.keys(fields), ...Object.keys(data)]) {
    if (!(key in ordered) && data[key] !== undefined) ordered[key] = data[key];
  }
  return JSON.parse(JSON.stringify(ordered));
}

export const byId = (a, b) => a.id.localeCompare(b.id);

export class NotFoundError extends Error {
  code = 'ENOENT';
}
