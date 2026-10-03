// Aufruf: node scripts/prepare-server.mjs   (vom systemd-Service auf dem Home-PC vor dem Start)
// Installiert Abhängigkeiten und baut die Website nur, wenn sich wirklich etwas geändert hat.
// Ein kompletter npm ci + Build schreibt ~600 MB, was eine SD-Karte auf Dauer abnutzt.
// Reine Datenänderungen (neue Teile, Outfits, Wünsche) lösen keinen Neubau aus.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stampFile = path.join(root, 'web', '.next', 'build-stamp.json');
// Alles, was den Build beeinflusst. Daten-Ordner bewusst nicht.
const CODE_PATHS = ['web', 'scripts', 'package.json', 'package-lock.json'];

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
// Unter Windows ist npm ein .cmd-Skript und braucht eine Shell (nur für lokale Tests relevant)
const isWin = process.platform === 'win32';
const npm = (...args) => execFileSync(isWin ? 'npm.cmd' : 'npm', args, { cwd: root, stdio: 'inherit', shell: isWin });

// Fingerabdruck des Codes: Git-Tree-Hashes (ändern sich nur bei Commits in diesen Pfaden) + lokale Änderungen
const trees = CODE_PATHS.map((p) => `${p}:${git('rev-parse', `HEAD:${p}`)}`).join('\n');
const dirty = git('status', '--porcelain', '--', ...CODE_PATHS);
const codeHash = createHash('sha256').update(trees + dirty).digest('hex').slice(0, 16);
const lockHash = git('rev-parse', 'HEAD:package-lock.json') + (dirty.includes('package-lock.json') ? '-dirty' : '');

let stamp = {};
try {
  stamp = JSON.parse(fs.readFileSync(stampFile, 'utf8'));
} catch {}

const hasModules = fs.existsSync(path.join(root, 'node_modules', '.package-lock.json'));
if (!hasModules || stamp.lockHash !== lockHash) {
  console.log('[prepare] Abhängigkeiten haben sich geändert -> npm ci');
  npm('ci', '--no-audit', '--no-fund');
} else {
  console.log('[prepare] Abhängigkeiten unverändert, npm ci übersprungen');
}

const hasBuild = fs.existsSync(path.join(root, 'web', '.next', 'BUILD_ID'));
if (!hasBuild || stamp.codeHash !== codeHash || stamp.lockHash !== lockHash) {
  console.log('[prepare] Code hat sich geändert -> Build');
  npm('run', 'build');
} else {
  console.log('[prepare] Code unverändert, Build übersprungen');
}

fs.writeFileSync(stampFile, JSON.stringify({ codeHash, lockHash, at: new Date().toISOString() }, null, 2));
