// Aufruf: npm run export -- <ordner> [--prune]
// Schreibt alle Daten des eingestellten Speichers als Markdown-Ordner (gleiches Format wie STORAGE=files), z. B. damit
// Claude im Datenbankmodus damit arbeiten kann, als Backup oder für den Umzug in ein Git-Repo.
// --prune: Einträge im Ordner, die es im Speicher nicht (mehr) gibt, löschen.
import path from 'node:path';
import { dataRoot, storageMode } from './lib/config.mjs';
import { store } from './lib/data.mjs';
import { createFileStore } from './lib/store/files.mjs';
import { describe, transfer } from './lib/transfer.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('Aufruf: npm run export -- <ordner> [--prune]');
  process.exit(1);
}
const target = path.resolve(dir);
if (storageMode() === 'files' && target === dataRoot()) {
  console.error('Das ist schon das Datenverzeichnis, nichts zu tun.');
  process.exit(1);
}

const counts = await transfer(store(), createFileStore(target), { prune: args.includes('--prune') });
console.log(`Exportiert nach ${target}: ${describe(counts)}`);
