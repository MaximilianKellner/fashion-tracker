// Automatischer Git-Abgleich für den Server-Betrieb (Home-PC).
// Aktiv nur mit GIT_AUTOSYNC=1: Änderungen der Website werden committet und gepusht.
// Neue Commits (z. B. von Claude) werden nur geholt, wenn die Website benutzt wird, und höchstens alle
// GIT_SYNC_MINUTES Minuten (Standard 15). Ohne Besucher passiert nichts, das schont die SD-Karte.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dataRoot } from './data.mjs';

const run = promisify(execFile);
const DATA_PATHS = ['wardrobe', 'outfits', 'wishlist', 'profile.md'];

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

async function pullAndPush() {
  lastSync = Date.now();
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
