// Aufruf: npm run import -- <ordner> [--prune]
// Übernimmt einen Markdown-Ordner (z. B. einen Export, den Claude bearbeitet hat, oder ein bisheriges Daten-Repo) in den
// eingestellten Speicher. Einträge mit gleicher ID werden überschrieben. Vorher wird der Ordner gegen das Schema geprüft.
// --prune: Einträge im Speicher, die es im Ordner nicht gibt, löschen (der Speicher wird eine genaue Kopie).
import path from 'node:path';
import { dataRoot, storageMode } from './lib/config.mjs';
import { store } from './lib/data.mjs';
import { createFileStore } from './lib/store/files.mjs';
import { describe, transfer } from './lib/transfer.mjs';
import { validateStore } from './lib/validate.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('Aufruf: npm run import -- <ordner> [--prune]');
  process.exit(1);
}
const source = path.resolve(dir);
if (storageMode() === 'files' && source === dataRoot()) {
  console.error('Das ist schon das Datenverzeichnis, nichts zu tun.');
  process.exit(1);
}

const from = createFileStore(source);
const { problems } = await validateStore(from);
if (problems.length) {
  console.error(`Nicht importiert, ${problems.length} Problem(e) in ${source}:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const counts = await transfer(from, store(), { prune: args.includes('--prune') });
console.log(`Importiert aus ${source}: ${describe(counts)}`);
