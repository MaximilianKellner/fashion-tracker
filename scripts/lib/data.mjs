// Lesen und Schreiben der Daten, egal ob als Markdown-Dateien (STORAGE=files) oder in SQLite (STORAGE=sqlite).
// Wird von der Website (web/lib/data.ts, web/app/actions.ts) und den Kommandozeilen-Skripten genutzt.
// Einträge haben immer die Form { id, data, body }: data sind die Frontmatter-Felder, body der Markdown-Text.
import path from 'node:path';
import { dataRoot, databaseFile, loadEnv, storageMode } from './config.mjs';
import { NotFoundError } from './store/common.mjs';
import { createFileStore } from './store/files.mjs';
import { createSqliteStore } from './store/sqlite.mjs';

export { dataRoot } from './config.mjs';

// .env aus dem Code-Repo, damit auch `node -e` und die Skripte den eingestellten Speicher nutzen
loadEnv();

let current = null;

/** Der eingestellte Speicher. Wird neu angelegt, wenn sich STORAGE, DATA_DIR oder DATABASE_FILE ändern. */
export function store() {
  const mode = storageMode();
  const key = [mode, dataRoot(), mode === 'sqlite' ? databaseFile() : ''].join('|');
  if (current?.key !== key) {
    current?.store.close();
    const s = mode === 'sqlite' ? createSqliteStore(databaseFile(), dataRoot()) : createFileStore(dataRoot());
    current = { key, store: s };
  }
  return current.store;
}

export const dirs = {
  inbox: () => path.join(dataRoot(), 'inbox'),
};

/** Ordner mit den Fotos eines Teils (kind "items") oder Wunsches (kind "wishlist") */
export const photoDir = (kind, id) => store().photoDir(kind, id);

/** "Navy Chino!" -> "navy-chino" (Umlaute werden ausgeschrieben). */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/** Heutiges Datum in lokaler Zeit als JJJJ-MM-TT. */
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ID im Format JJJJ-MM-TT-slug. Hängt -2, -3 … an, falls die ID in `existing` schon vorkommt. */
export function makeId(name, existing = [], date = today()) {
  const base = `${date}-${slugify(name) || 'teil'}`;
  let id = base;
  for (let n = 2; existing.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** Alle IDs einer Art (items, outfits, wishlist, recommendations) */
export const listIds = (kind) => store().ids(kind);

async function readOne(kind, id) {
  const record = await store().get(kind, id);
  if (!record) throw new NotFoundError(`${kind}/${id} nicht gefunden`);
  return record;
}

// ---------- Kleidungsstücke ----------
export const readItems = () => store().list('items');
export const readItem = (id) => readOne('items', id);
export const writeItem = (id, data, body) => store().put('items', id, data, body);
/** Löscht das Teil samt Fotos */
export const deleteItem = (id) => store().remove('items', id);

// ---------- Outfits ----------
export const readOutfits = () => store().list('outfits');
export const readOutfit = (id) => readOne('outfits', id);
export const writeOutfit = (id, data, body) => store().put('outfits', id, data, body);
export const deleteOutfit = (id) => store().remove('outfits', id);

// ---------- Wunschliste ----------
export const readWishlist = () => store().list('wishlist');
export const readWish = (id) => readOne('wishlist', id);
export const writeWish = (id, data, body) => store().put('wishlist', id, data, body);
/** Löscht den Wunsch samt Fotos */
export const deleteWish = (id) => store().remove('wishlist', id);

// ---------- Empfehlungen ----------
export const readRecommendations = () => store().list('recommendations');
export const readRecommendation = (id) => readOne('recommendations', id);
export const writeRecommendation = (id, data, body) => store().put('recommendations', id, data, body);
export const deleteRecommendation = (id) => store().remove('recommendations', id);

// ---------- Profil (Frontmatter mit Maßen und Größen, Text für Stil, Anlässe, Einkauf) ----------
export const readProfile = () => store().getProfile();
export const writeProfile = (data, body) => store().putProfile(data, body);
