#!/usr/bin/env node
// Einstiegspunkt `fashion-tracker <befehl>` (Nix-Paket). Entspricht den npm-Skripten im Code-Repo.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const COMMANDS = {
  validate: ['validate.mjs', '[<ordner>]', 'Daten gegen das Schema prüfen'],
  stats: ['stats.mjs', '[--json]', 'Kennzahlen'],
  export: ['export.mjs', '<ordner> [--prune]', 'Daten als Markdown-Ordner exportieren'],
  import: ['import.mjs', '<ordner> [--prune]', 'Markdown-Ordner in den Speicher übernehmen'],
  'init-data': ['init-data.mjs', '[<ordner>] [--git]', 'leeres Datenverzeichnis anlegen'],
  photo: ['process-photo.mjs', '<foto> <item-id> [--delete]', 'Foto verkleinern und ablegen'],
};

const [command, ...rest] = process.argv.slice(2);
if (!COMMANDS[command]) {
  console.error('Aufruf: fashion-tracker <befehl> [argumente]\n');
  for (const [name, [, usage, help]] of Object.entries(COMMANDS)) console.error(`  ${`${name} ${usage}`.padEnd(42)} ${help}`);
  process.exit(command ? 1 : 0);
}
process.argv = [process.argv[0], process.argv[1], ...rest];
await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), COMMANDS[command][0])).href);
