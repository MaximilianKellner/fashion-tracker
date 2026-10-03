// Aufruf: npm run validate
// Prüft alle Kleidungsstücke, Outfits und Wunschlisten-Einträge gegen das Schema.
import fs from 'node:fs';
import path from 'node:path';
import { readItems, readOutfits, readWishlist } from './lib/data.mjs';
import { ITEM_FIELDS, OUTFIT_FIELDS, WISHLIST_FIELDS, isIsoDate, isPrice, validateFields } from './lib/schema.mjs';

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

for (const outfit of await readOutfits()) {
  const where = `outfits/${outfit.id}`;
  for (const e of validateFields(outfit.data, OUTFIT_FIELDS)) report(where, e);
  for (const ref of outfit.data.items ?? []) {
    if (!itemIds.has(ref)) report(where, `verweist auf unbekanntes Teil "${ref}"`);
  }
}

for (const wish of await readWishlist()) {
  for (const e of validateFields(wish.data, WISHLIST_FIELDS)) report(`wishlist/${wish.id}`, e);
  if (wish.data.price !== undefined && !isPrice(wish.data.price)) report(`wishlist/${wish.id}`, '"price" muss eine Zahl mit max. 2 Nachkommastellen sein');
}

if (problems.length) {
  console.error(`${problems.length} Problem(e) gefunden:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Alles gültig (${items.length} Teile).`);
