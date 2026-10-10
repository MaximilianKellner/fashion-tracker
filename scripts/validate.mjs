// Aufruf: npm run validate [-- <ordner>]
// Prüft alle Kleidungsstücke, Outfits, Wünsche, Empfehlungen und das Profil gegen das Schema.
// Ohne Ordner den eingestellten Speicher (.env), mit Ordner einen Markdown-Ordner (z. B. einen Export).
import path from 'node:path';
import { store } from './lib/data.mjs';
import { createFileStore } from './lib/store/files.mjs';
import { validateStore } from './lib/validate.mjs';

const dir = process.argv[2];
const { problems, items } = await validateStore(dir ? createFileStore(path.resolve(dir)) : store());

if (problems.length) {
  console.error(`${problems.length} Problem(e) gefunden:
`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Alles gültig (${items} Teile).`);
