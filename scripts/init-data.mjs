// Aufruf: npm run init-data [-- <ordner>] [--git]
// Legt ein leeres Datenverzeichnis an (Standard: DATA_DIR aus .env bzw. data/): Ordner, Profil-Vorlage und bei
// STORAGE=sqlite die Datenbank. Mit --git wird es ein Git-Repo mit passender .gitignore (für STORAGE=files).
// Vorhandene Dateien bleiben unangetastet.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataRoot, storageMode } from './lib/config.mjs';
import { store } from './lib/data.mjs';
import { KINDS } from './lib/store/common.mjs';

const args = process.argv.slice(2);
const dirArg = args.find((a) => !a.startsWith('--'));
if (dirArg) process.env.DATA_DIR = path.resolve(dirArg);
const root = dataRoot();
const templates = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates', 'data');

const created = [];
const ensureFile = (rel, content) => {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  created.push(rel);
};

fs.mkdirSync(root, { recursive: true });
ensureFile('inbox/.gitkeep', '');
for (const { dir } of Object.values(KINDS)) ensureFile(`${dir}/.gitkeep`, '');

const s = store();
const profile = await s.getProfile();
if (!Object.keys(profile.data).length && !profile.body) {
  await s.putProfile({}, fs.readFileSync(path.join(templates, 'profile.md'), 'utf8'));
  created.push(storageMode() === 'sqlite' ? 'Profil (Datenbank)' : 'profile.md');
}
if (storageMode() === 'sqlite') console.log(`Datenbank: ${s.file}`);

if (args.includes('--git')) {
  ensureFile('.gitignore', fs.readFileSync(path.join(templates, 'gitignore'), 'utf8'));
  ensureFile('README.md', fs.readFileSync(path.join(templates, 'README.md'), 'utf8'));
  if (!fs.existsSync(path.join(root, '.git'))) {
    execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: root });
    created.push('Git-Repo');
  }
}

console.log(`Datenverzeichnis ${root} (STORAGE=${storageMode()})`);
console.log(created.length ? `Angelegt: ${created.join(', ')}` : 'War schon vollständig, nichts geändert.');
