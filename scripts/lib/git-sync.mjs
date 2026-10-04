// Automatischer Git-Abgleich für den Server-Betrieb (Home-PC).
// Aktiv nur mit GIT_AUTOSYNC=1: Änderungen der Website werden committet und gepusht.
// Neue Commits (z. B. von Claude) werden nur geholt, wenn die Website benutzt wird, und höchstens alle
// GIT_SYNC_MINUTES Minuten (Standard 15). Ohne Besucher passiert nichts, das schont die SD-Karte.
// Bringt ein Pull neuen Code mit, baut prepare-server.mjs ihn im Hintergrund, während die alte Version weiterläuft.
// Erst nach erfolgreichem Build beendet sich der Server, systemd startet ihn mit dem neuen Build neu.
import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { codeFingerprint } from './code-version.mjs';
import { dataRoot } from './data.mjs';

const run = promisify(execFile);
const DATA_PATHS = ['wardrobe', 'outfits', 'wishlist', 'recommendations', 'profile.md'];
// Exit-Code ungleich 0, damit systemd (Restart=on-failure) den Service neu startet
const RESTART_EXIT_CODE = 75;

export const autosyncEnabled = () => process.env.GIT_AUTOSYNC === '1';
const minIntervalMs = () => (Number(process.env.GIT_SYNC_MINUTES) || 15) * 60_000;

const git = (...args) => run('git', args, { cwd: dataRoot(), timeout: 60_000 });

// Alle Git-Aufrufe nacheinander ausführen, damit sich Commit, Pull und Push nicht überschneiden
let queue = Promise.resolve();
function enqueue(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

let lastSync = Date.now(); // Beim Serverstart hat systemd gerade erst `git pull` ausgeführt

/** Fingerabdruck des Website-Codes (rein lokal, kein Netzwerk) */
const codeVersion = async () => (await codeFingerprint(dataRoot())).codeHash;

/** Startet scripts/prepare-server.mjs im Hintergrund-Modus mit niedriger Priorität; Ergebnis ist der Exit-Code */
function prepareInBackground() {
  const script = path.join(dataRoot(), 'scripts', 'prepare-server.mjs');
  const [cmd, args] =
    process.platform === 'win32' ? [process.execPath, [script, '--background']] : ['nice', ['-n', '10', process.execPath, script, '--background']];
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: dataRoot(), stdio: 'inherit' });
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

async function pullAndPush() {
  lastSync = Date.now();
  const codeBefore = await codeVersion().catch(() => null);
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

  if (codeBefore && codeBefore !== (await codeVersion().catch(() => codeBefore))) await rebuild();
}

/** Committet Datenänderungen mit der Nachricht und pusht sie. Wartet nicht auf GitHub (läuft im Hintergrund). */
export function commitAndPush(message) {
  if (!autosyncEnabled()) return;
  enqueue(async () => {
    await git('add', '--all', '--', ...DATA_PATHS);
    const { stdout } = await git('status', '--porcelain', '--', ...DATA_PATHS);
    if (stdout.trim()) await git('commit', '--quiet', '-m', message);
    await pullAndPush();
  }).catch((err) => console.error('[git-sync] commit fehlgeschlagen:', err.stderr || err.message));
}

/**
 * Beim Aufruf einer Seite: neue Commits holen (und ausstehende pushen), falls der letzte Abgleich
 * länger als das Mindestintervall her ist. Blockiert die Seite nicht; Änderungen erscheinen beim nächsten Laden.
 */
export function syncIfStale() {
  if (!autosyncEnabled() || Date.now() - lastSync < minIntervalMs()) return;
  lastSync = Date.now();
  enqueue(pullAndPush).catch((err) => console.error('[git-sync] sync fehlgeschlagen:', err.stderr || err.message));
}

export function logSyncConfig() {
  if (!autosyncEnabled()) return;
  console.log(`[git-sync] aktiv in ${dataRoot()}: Push nach jeder Änderung, Pull bei Benutzung (max. alle ${minIntervalMs() / 60_000} min)`);
}
