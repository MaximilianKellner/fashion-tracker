// Aufruf: npm run photo -- <foto> <item-id> [--delete]
// Legt das Foto verkleinert als wardrobe/<item-id>/photo-N.webp ab. Mit --delete wird das Original danach gelöscht.
import fs from 'node:fs/promises';
import path from 'node:path';
import { dirs } from './lib/data.mjs';
import { processPhoto } from './lib/photo.mjs';

const args = process.argv.slice(2);
const del = args.includes('--delete');
const [input, itemId] = args.filter((a) => a !== '--delete');

if (!input || !itemId) {
  console.error('Aufruf: npm run photo -- <foto> <item-id> [--delete]');
  process.exit(1);
}

const itemDir = path.join(dirs.wardrobe(), itemId);
const name = await processPhoto(path.resolve(input), itemDir);
if (del) await fs.unlink(input);
console.log(`${itemId}/${name}`);
