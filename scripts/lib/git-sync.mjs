// Automatischer Git-Abgleich für den Server-Betrieb (Home-PC).
// Aktiv nur mit GIT_AUTOSYNC=1: Änderungen der Website werden committet und gepusht,
// und regelmäßig werden neue Commits (z. B. von Claude) geholt.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dataRoot } from './data.mjs';

const run = promisify(execFile);
const DATA_PATHS = ['wardrobe', 'outfits', 'wishlist', 'profile.md'];

export const autosyncEnabled = () => process.env.GIT_AUTOSYNC === '1';

const git = (...args) => run('git', args, { cwd: dataRoot(), timeout: 60_000 });

// Alle Git-Aufrufe nacheinander ausführen, damit sich Commit, Pull und Push nicht überschneiden
let queue = Promise.resolve();
function enqueue(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

async function pullAndPush() {
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

/** Holt alle `minutes` Minuten neue Commits und pusht noch ausstehende. */
export function startPeriodicSync(minutes = 5) {
  if (!autosyncEnabled()) return;
  const tick = () =>
    enqueue(pullAndPush).catch((err) => console.error('[git-sync] sync fehlgeschlagen:', err.stderr || err.message));
  tick();
  setInterval(tick, minutes * 60_000).unref();
  console.log(`[git-sync] aktiv, Abgleich alle ${minutes} min in ${dataRoot()}`);
}
