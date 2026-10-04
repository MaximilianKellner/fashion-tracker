// Aufruf: node scripts/prepare-server.mjs                (vom systemd-Service auf dem Home-PC vor dem Start)
//         node scripts/prepare-server.mjs --background   (von git-sync, während der Server weiterläuft)
// Installiert Abhängigkeiten und baut die Website nur, wenn sich wirklich etwas geändert hat.
// Ein kompletter npm ci + Build schreibt ~600 MB, was eine SD-Karte auf Dauer abnutzt.
// Reine Datenänderungen (neue Teile, Outfits, Wünsche) lösen keinen Neubau aus.
//
// Gebaut wird abwechselnd in zwei Ordner (web/.next und web/.next-alt): immer in den, aus dem der Server gerade nicht
// läuft. Erst ein erfolgreicher Build wird aktiv (web/.build-state.json, gelesen von web/next.config.ts). So läuft die
// alte Version weiter, solange gebaut wird, und ein fehlgeschlagener Build legt die Website nicht lahm.
//
// Exit-Codes im Hintergrund-Modus: 0 neuer Build aktiv (Server neu starten), 1 Build fehlgeschlagen (weiterlaufen),
// 2 Abhängigkeiten geändert (Server neu starten, der Start installiert und baut), 3 nichts zu tun.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeFingerprint } from './lib/code-version.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'web');
const background = process.argv.includes('--background');
const SLOTS = ['.next', '.next-alt'];
const stateFile = path.join(web, '.build-state.json');

// Unter Windows ist npm ein .cmd-Skript und braucht eine Shell (nur für lokale Tests relevant)
const isWin = process.platform === 'win32';
const npm = (args, env = {}) =>
  execFileSync(isWin ? 'npm.cmd' : 'npm', args, { cwd: root, stdio: 'inherit', shell: isWin, env: { ...process.env, ...env } });
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const log = (msg) => console.log(`[prepare${background ? ' im Hintergrund' : ''}] ${msg}`);

// state: { active: Ordner, aus dem der Server läuft; modules: lockHash der installierten Abhängigkeiten;
//          failedHash/failedAt: Code, dessen Build schon fehlgeschlagen ist }
const state = { active: '.next', ...readJson(stateFile) };
const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
const stampOf = (slot) => readJson(path.join(web, slot, 'build-stamp.json'));
const hasBuild = (slot) => fs.existsSync(path.join(web, slot, 'BUILD_ID'));

const { codeHash, lockHash } = await codeFingerprint(root);
const ready = (slot) => hasBuild(slot) && stampOf(slot)?.codeHash === codeHash && stampOf(slot)?.lockHash === lockHash;
const other = SLOTS.find((s) => s !== state.active);

// 1. Aktiver Build passt schon
if (ready(state.active)) {
  log(`Code unverändert, Build in web/${state.active} ist aktuell`);
  process.exit(background ? 3 : 0);
}
// 2. Der andere Ordner wurde schon für diesen Code gebaut (z. B. im Hintergrund vor dem Neustart): nur umschalten
if (ready(other)) {
  log(`fertiger Build in web/${other} wird aktiv`);
  state.active = other;
  saveState();
  process.exit(0);
}

// Für diesen Code ist der Build schon fehlgeschlagen: nicht bei jedem Neustart erneut ~600 MB schreiben.
// Erst ein neuer Commit (anderer Hash) versucht es wieder.
const modulesLock = state.modules ?? stampOf(state.active)?.lockHash; // Fallback für Builds von vor den zwei Ordnern
const depsChanged = !fs.existsSync(path.join(root, 'node_modules', '.package-lock.json')) || modulesLock !== lockHash;
// Die alte Version weiterlaufen lassen geht nur, solange ihre Abhängigkeiten noch installiert sind
const keepOld = () => {
  if (!depsChanged && hasBuild(state.active)) {
    log(background ? `die bisherige Version aus web/${state.active} läuft weiter` : `starte die bisherige Version aus web/${state.active}`);
    process.exit(background ? 1 : 0);
  }
  process.exit(1);
};
if (state.failedHash === codeHash) {
  console.error(`[prepare] Build für diesen Code ist schon fehlgeschlagen (${state.failedAt}), warte auf neuen Commit`);
  keepOld();
}
const fail = (err) => {
  state.failedHash = codeHash;
  state.failedAt = new Date().toISOString();
  saveState();
  console.error('[prepare] fehlgeschlagen:', err.message);
  keepOld();
};

// 3. Abhängigkeiten: npm ci tauscht node_modules aus, das geht nicht unter dem laufenden Server
if (depsChanged) {
  if (background) {
    log('Abhängigkeiten haben sich geändert, Server muss für npm ci neu starten');
    process.exit(2);
  }
  log('Abhängigkeiten haben sich geändert -> npm ci');
  try {
    npm(['ci', '--no-audit', '--no-fund']);
  } catch (err) {
    fail(err);
  }
  state.modules = lockHash;
  saveState();
} else {
  log('Abhängigkeiten unverändert, npm ci übersprungen');
}

// 4. In den freien Ordner bauen und erst bei Erfolg umschalten
log(`Code hat sich geändert -> Build in web/${other}`);
try {
  npm(['run', 'build'], { NEXT_DIST_DIR: other });
} catch (err) {
  fail(err);
}
fs.writeFileSync(path.join(web, other, 'build-stamp.json'), JSON.stringify({ codeHash, lockHash, at: new Date().toISOString() }, null, 2));
state.active = other;
delete state.failedHash;
delete state.failedAt;
saveState();
log(`Build fertig, web/${other} ist aktiv`);
