// Lesen und Schreiben der Markdown-Daten. Wird von den CLI-Skripten und später von der Website genutzt.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { ITEM_FIELDS, OUTFIT_FIELDS, WISHLIST_FIELDS } from './schema.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Wurzelverzeichnis der Daten. Über DATA_DIR überschreibbar (z. B. für die Website in web/). */
export function dataRoot() {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : REPO_ROOT;
}

export const dirs = {
  wardrobe: () => path.join(dataRoot(), 'wardrobe'),
  outfits: () => path.join(dataRoot(), 'outfits'),
  wishlist: () => path.join(dataRoot(), 'wishlist'),
  inbox: () => path.join(dataRoot(), 'inbox'),
};

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

// YAML macht aus 2024-03-15 ein Date-Objekt. Wir arbeiten durchgehend mit Strings.
function normalize(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

async function readMarkdown(file) {
  const raw = await fs.readFile(file, 'utf8');
  // Optionen übergeben, damit gray-matter nicht cached und Objekte nicht geteilt werden
  const { data, content } = matter(raw, {});
  return { data: normalize(data), body: content.trim() };
}

async function writeMarkdown(file, data, body = '', fields = {}) {
  // Felder in Schema-Reihenfolge, unbekannte Felder dahinter; undefined-Felder entfernen (js-yaml kann sie nicht serialisieren)
  const ordered = {};
  for (const key of [...Object.keys(fields), ...Object.keys(data)]) {
    if (!(key in ordered) && data[key] !== undefined) ordered[key] = data[key];
  }
  const clean = JSON.parse(JSON.stringify(ordered));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, matter.stringify(body ? `\n${body.trim()}\n` : '', clean), 'utf8');
}

async function listDir(dir) {
  try {
    return (await fs.readdir(dir, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// ---------- Kleidungsstücke: wardrobe/<id>/item.md ----------

export async function readItems() {
  const entries = await listDir(dirs.wardrobe());
  const items = [];
  for (const e of entries.filter((e) => e.isDirectory())) {
    const file = path.join(dirs.wardrobe(), e.name, 'item.md');
    try {
      items.push({ id: e.name, file, ...(await readMarkdown(file)) });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

export async function readItem(id) {
  const file = path.join(dirs.wardrobe(), id, 'item.md');
  return { id, file, ...(await readMarkdown(file)) };
}

export async function writeItem(id, data, body) {
  await writeMarkdown(path.join(dirs.wardrobe(), id, 'item.md'), data, body, ITEM_FIELDS);
}

// ---------- Outfits und Wunschliste: <ordner>/<id>.md ----------

async function readFlat(dir) {
  const entries = await listDir(dir);
  const result = [];
  for (const e of entries.filter((e) => e.isFile() && e.name.endsWith('.md'))) {
    const file = path.join(dir, e.name);
    result.push({ id: e.name.replace(/\.md$/, ''), file, ...(await readMarkdown(file)) });
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

export const readOutfits = () => readFlat(dirs.outfits());
export const readWishlist = () => readFlat(dirs.wishlist());

export const readOutfit = async (id) => {
  const file = path.join(dirs.outfits(), `${id}.md`);
  return { id, file, ...(await readMarkdown(file)) };
};
export const readWish = async (id) => {
  const file = path.join(dirs.wishlist(), `${id}.md`);
  return { id, file, ...(await readMarkdown(file)) };
};

export const writeOutfit = (id, data, body) => writeMarkdown(path.join(dirs.outfits(), `${id}.md`), data, body, OUTFIT_FIELDS);
export const writeWish = (id, data, body) => writeMarkdown(path.join(dirs.wishlist(), `${id}.md`), data, body, WISHLIST_FIELDS);
