// Aufruf: npm run validate
// Prüft alle Kleidungsstücke, Outfits und Wunschlisten-Einträge gegen das Schema.
import fs from 'node:fs';
import path from 'node:path';
import { COLORS } from './lib/colors.mjs';
import { readItems, readOutfits, readProfile, readRecommendations, readWishlist } from './lib/data.mjs';
import {
  ITEM_FIELDS,
  APPEARANCE,
  MEASUREMENTS,
  PALETTE,
  OUTFIT_FIELDS,
  PROFILE_FIELDS,
  RECOMMENDATION_FIELDS,
  SIZES,
  WISHLIST_FIELDS,
  isIsoDate,
  isPrice,
  validateFields,
} from './lib/schema.mjs';

const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;
const problems = [];
const report = (where, msg) => problems.push(`${where}: ${msg}`);

const items = await readItems();
const itemIds = new Set(items.map((i) => i.id));

for (const item of items) {
  const where = `wardrobe/${item.id}`;
  if (!ID_PATTERN.test(item.id)) report(where, 'Ordnername entspricht nicht JJJJ-MM-TT-slug');
  for (const e of validateFields(item.data, ITEM_FIELDS)) report(where, e);
  for (const photo of item.data.photos ?? []) {
    if (!fs.existsSync(path.join(path.dirname(item.file), photo))) report(where, `Foto "${photo}" fehlt`);
  }
  const p = item.data.purchase;
  if (p && p.price !== undefined && !isPrice(p.price)) report(where, `"purchase.price" muss eine Zahl mit max. 2 Nachkommastellen sein (ist: ${JSON.stringify(p.price)})`);
  if (p && p.date !== undefined && !isIsoDate(p.date)) report(where, `"purchase.date" muss JJJJ-MM-TT sein (ist: "${p.date}")`);
}

const outfits = await readOutfits();
for (const outfit of outfits) {
  const where = `outfits/${outfit.id}`;
  for (const e of validateFields(outfit.data, OUTFIT_FIELDS)) report(where, e);
  for (const ref of outfit.data.items ?? []) {
    if (!itemIds.has(ref)) report(where, `verweist auf unbekanntes Teil "${ref}"`);
  }
}

const wishes = await readWishlist();
for (const wish of wishes) {
  for (const e of validateFields(wish.data, WISHLIST_FIELDS)) report(`wishlist/${wish.id}`, e);
  for (const photo of wish.data.photos ?? []) {
    if (!fs.existsSync(path.join(path.dirname(wish.file), wish.id, photo))) report(`wishlist/${wish.id}`, `Foto "${photo}" fehlt`);
  }
  if (wish.data.price !== undefined && !isPrice(wish.data.price)) report(`wishlist/${wish.id}`, '"price" muss eine Zahl mit max. 2 Nachkommastellen sein');
}

const recommendations = await readRecommendations();
const recIds = new Set(recommendations.map((r) => r.id));
const known = { items: itemIds, outfits: new Set(outfits.map((o) => o.id)), wishes: new Set(wishes.map((w) => w.id)) };
for (const rec of recommendations) {
  const where = `recommendations/${rec.id}`;
  if (!ID_PATTERN.test(rec.id)) report(where, 'Dateiname entspricht nicht JJJJ-MM-TT-slug');
  for (const e of validateFields(rec.data, RECOMMENDATION_FIELDS)) report(where, e);
  if (rec.data.date !== undefined && !isIsoDate(rec.data.date)) report(where, `"date" muss JJJJ-MM-TT sein (ist: "${rec.data.date}")`);
  if (rec.data.answers && !recIds.has(rec.data.answers)) report(where, `beantwortet unbekannte Frage "${rec.data.answers}"`);
  for (const [key, ids] of Object.entries(known)) {
    for (const ref of rec.data[key] ?? []) if (!ids.has(ref)) report(where, `"${key}" verweist auf Unbekanntes "${ref}"`);
  }
}

const profile = await readProfile();
for (const e of validateFields(profile.data, PROFILE_FIELDS)) report('profile.md', e);
for (const [key, value] of Object.entries(profile.data.measurements ?? {})) {
  if (!(key in MEASUREMENTS)) report('profile.md', `unbekanntes Maß "measurements.${key}" (erlaubt: ${Object.keys(MEASUREMENTS).join(', ')})`);
  else if (typeof value !== 'number' || value <= 0) report('profile.md', `"measurements.${key}" muss eine Zahl in cm sein`);
}
for (const [key, value] of Object.entries(profile.data.appearance ?? {})) {
  if (!(key in APPEARANCE)) report('profile.md', `unbekanntes Feld "appearance.${key}" (erlaubt: ${Object.keys(APPEARANCE).join(', ')})`);
  else if (typeof value !== 'string') report('profile.md', `"appearance.${key}" muss Text sein`);
}
for (const [key, value] of Object.entries(profile.data.palette ?? {})) {
  if (!(key in PALETTE)) report('profile.md', `unbekannte Gruppe "palette.${key}" (erlaubt: ${Object.keys(PALETTE).join(', ')})`);
  else if (!Array.isArray(value)) report('profile.md', `"palette.${key}" muss eine Liste von Farben sein`);
  else for (const c of value) if (!COLORS.some((k) => k.id === c)) report('profile.md', `"palette.${key}": unbekannte Farbe "${c}" (siehe docs/schema.md)`);
}
for (const [key, value] of Object.entries(profile.data.sizes ?? {})) {
  if (!(key in SIZES)) report('profile.md', `unbekannte Größe "sizes.${key}" (erlaubt: ${Object.keys(SIZES).join(', ')})`);
  else if (typeof value !== 'string') report('profile.md', `"sizes.${key}" muss Text in Anführungszeichen sein`);
}

if (problems.length) {
  console.error(`${problems.length} Problem(e) gefunden:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Alles gültig (${items.length} Teile).`);
