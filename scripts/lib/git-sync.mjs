// Automatischer Git-Abgleich für den Server-Betrieb. Zwei unabhängige Teile:
//
// GIT_AUTOSYNC=1 (nur mit STORAGE=files): Das Datenverzeichnis ist ein eigenes Git-Repo. Änderungen der Website werden
//   sofort committet und gepusht. Neue Commits (z. B. von Claude) werden nur geholt, wenn die Website benutzt wird, und
//   höchstens alle GIT_SYNC_MINUTES Minuten (Standard 15). Ohne Besucher passiert nichts, das schont die SD-Karte.
// CODE_AUTOUPDATE=1: Die Website läuft aus einem Git-Checkout des Codes und holt im selben Takt neuen Code. Bringt ein
//   Pull Änderungen mit, baut prepare-server.mjs sie im Hintergrund, während die alte Version weiterläuft. Erst nach
//   erfolgreichem Build beendet sich der Server, systemd startet ihn mit dem neuen Build neu.
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { codeFingerprint } from './code-version.mjs';
import { codeRoot, dataRoot, storageMode } from './config.mjs';

const run = promisify(execFile);
const DATA_PATHS = ['wardrobe', 'outfits', 'wishlist', 'recommendations', 'profile.md'];
// Exit-Code ungleich 0, damit systemd (Restart=on-failure) den Service neu startet
const RESTART_EXIT_CODE = 75;

export const autosyncEnabled = () => process.env.GIT_AUTOSYNC === '1' && storageMode() === 'files';
export const codeUpdateEnabled = () => process.env.CODE_AUTOUPDATE === '1';
const minIntervalMs = () => (Number(process.env.GIT_SYNC_MINUTES) || 15) * 60_000;

const gitIn = (cwd, ...args) => run('git', args, { cwd, timeout: 60_000 });
const real = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
// Früher lagen Code und Daten im selben Repo; dann holt der Daten-Pull auch den Code
const sameRepo = () => real(dataRoot()) === real(codeRoot());

// Alle Git-Aufrufe nacheinander ausführen, damit sich Commit, Pull und Push nicht überschneiden
let queue = Promise.resolve();
function enqueue(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

let lastSync = Date.now(); // Beim Serverstart hat systemd gerade erst `git pull` ausgeführt

/**
 * Das Datenverzeichnis muss selbst die Wurzel eines Git-Repos sein. Sonst würde git den nächsten Elternordner nehmen,
 * z. B. das öffentliche Code-Repo, wenn data/ darin liegt.
 */
let dataRepoChecked = null;
async function dataRepoOk() {
  dataRepoChecked ??= gitIn(dataRoot(), 'rev-parse', '--show-toplevel').then(
    ({ stdout }) => {
      if (real(stdout.trim()) === real(dataRoot())) return true;
      console.error(`[git-sync] ${dataRoot()} ist kein eigenes Git-Repo (liegt in ${stdout.trim()}), Abgleich aus`);
      return false;
    },
    (err) => {
      console.error(`[git-sync] ${dataRoot()} ist kein Git-Repo, Abgleich aus:`, err.stderr || err.message);
      return false;
    },
  );
  return dataRepoChecked;
}

/** Fingerabdruck des Website-Codes (rein lokal, kein Netzwerk) */
const codeVersion = async () => (await codeFingerprint(codeRoot())).codeHash;

/** Startet scripts/prepare-server.mjs im Hintergrund-Modus mit niedriger Priorität; Ergebnis ist der Exit-Code */
function prepareInBackground() {
  const script = path.join(codeRoot(), 'scripts', 'prepare-server.mjs');
  const [cmd, args] =
    process.platform === 'win32' ? [process.execPath, [script, '--background']] : ['nice', ['-n', '10', process.execPath, script, '--background']];
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: codeRoot(), stdio: 'inherit' });
    child.on('error', (err) => {
      console.error('[git-sync] Build konnte nicht starten:', err.message);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/** Server beenden, sobald die Git-Warteschlange leer ist (noch ausstehende Commits gehen vorher raus) */
function restartWhenIdle(reason) {
  console.log(`[git-sync] ${reason}, Server startet neu`);
  // Kurz warten, damit laufende Anfragen noch fertig werden
  enqueue(() => new Promise((resolve) => setTimeout(resolve, 3000))).finally(() => process.exit(RESTART_EXIT_CODE));
}

/**
 * Neuer Code ist da: im Hintergrund in den freien Build-Ordner bauen, die Website läuft solange weiter.
 * Läuft innerhalb der Git-Warteschlange, damit kein Pull die Dateien während des Builds ändert.
 */
async function rebuild() {
  console.log('[git-sync] neuer Code geholt, baue im Hintergrund (die Website läuft weiter)');
  const code = await prepareInBackground();
  if (code === 0) restartWhenIdle('neuer Build fertig');
  else if (code === 2) restartWhenIdle('Abhängigkeiten geändert, Installation und Build beim Start');
  else if (code === 1) console.error('[git-sync] Build fehlgeschlagen, die bisherige Version läuft weiter');
}

/** Daten-Repo: neue Commits holen, eigene pushen */
async function syncData() {
  const git = (...args) => gitIn(dataRoot(), ...args);
  try {
    await git('pull', '--rebase', '--autostash', '--quiet');
  } catch (err) {
    // Konflikt: Rebase abbrechen, lokale Commits bleiben erhalten und werden beim nächsten Mal erneut versucht
    await git('rebase', '--abort').catch(() => {});
    console.error('[git-sync] pull fehlgeschlagen:', err.stderr || err.message);
    return;
  }
  const { stdout } = await git('rev-list', '--count', '@{u}..HEAD');
  if (Number(stdout.trim()) > 0) await git('push', '--quiet');
}

/** Daten abgleichen und neuen Code holen; ist neuer Code da, im Hintergrund bauen */
async function syncAll() {
  lastSync = Date.now();
  const codeBefore = codeUpdateEnabled() ? await codeVersion().catch(() => null) : null;
  if (autosyncEnabled() && (await dataRepoOk())) await syncData();
  if (codeUpdateEnabled() && !(autosyncEnabled() && sameRepo())) {
    // Der Code-Checkout hat keine eigenen Commits, also nur vorspulen
    await gitIn(codeRoot(), 'pull', '--ff-only', '--quiet').catch((err) =>
      console.error('[git-sync] Code-Update fehlgeschlagen:', err.stderr || err.message),
    );
  }
  if (codeBefore && codeBefore !== (await codeVersion().catch(() => codeBefore))) await rebuild();
}

/** Committet Datenänderungen mit der Nachricht und pusht sie. Wartet nicht auf GitHub (läuft im Hintergrund). */
export function commitAndPush(message) {
  if (!autosyncEnabled()) return;
  enqueue(async () => {
    if (!(await dataRepoOk())) return;
    const git = (...args) => gitIn(dataRoot(), ...args);
    const paths = DATA_PATHS.filter((p) => fs.existsSync(path.join(/*turbopackIgnore: true*/ dataRoot(), p)));
    if (!paths.length) return;
    await git('add', '--all', '--', ...paths);
    const { stdout } = await git('status', '--porcelain', '--', ...paths);
    if (stdout.trim()) await git('commit', '--quiet', '-m', message);
    await syncAll();
  }).catch((err) => console.error('[git-sync] commit fehlgeschlagen:', err.stderr || err.message));
}

/**
 * Beim Aufruf einer Seite: neue Commits holen (und ausstehende pushen), falls der letzte Abgleich
 * länger als das Mindestintervall her ist. Blockiert die Seite nicht; Änderungen erscheinen beim nächsten Laden.
 */
export function syncIfStale() {
  if (!(autosyncEnabled() || codeUpdateEnabled()) || Date.now() - lastSync < minIntervalMs()) return;
  lastSync = Date.now();
  enqueue(syncAll).catch((err) => console.error('[git-sync] sync fehlgeschlagen:', err.stderr || err.message));
}

export function logSyncConfig() {
  const where = storageMode() === 'sqlite' ? `SQLite, Fotos in ${dataRoot()}` : `Dateien in ${dataRoot()}`;
  console.log(`[daten] Speicher: ${where}`);
  if (process.env.GIT_AUTOSYNC === '1' && !autosyncEnabled()) console.log('[git-sync] GIT_AUTOSYNC gilt nur für STORAGE=files');
  const every = `max. alle ${minIntervalMs() / 60_000} min`;
  if (autosyncEnabled()) console.log(`[git-sync] Daten: Push nach jeder Änderung, Pull bei Benutzung (${every})`);
  if (codeUpdateEnabled()) console.log(`[git-sync] Code-Update aus ${codeRoot()} bei Benutzung (${every})`);
}
