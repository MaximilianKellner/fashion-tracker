// Fingerabdruck des Website-Codes: Nur wenn er sich ändert, muss der Server neu bauen.
// Genutzt von scripts/prepare-server.mjs (Build) und scripts/lib/git-sync.mjs (neuen Code nach einem Pull erkennen).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

// Was in die Website eingeht: web/, aus scripts/ nur lib/ (die Website importiert es als @lib) und die Abhängigkeiten.
// Kommandozeilen-Skripte wie scripts/stats.mjs und Markdown-Dateien (Doku, AGENTS.md) ändern am Build nichts.
export const CODE_PATHS = ['web', 'scripts/lib', 'package.json', 'package-lock.json'];
const affectsBuild = (file) => !file.endsWith('.md');

const lines = (text) => text.split('\n').filter(Boolean);

/**
 * { codeHash, lockHash } für den Stand im Repo `root`.
 * codeHash: Git-Blob-Hashes aller relevanten Dateien in HEAD plus Inhalt lokal geänderter Dateien.
 * lockHash: Blob-Hash von package-lock.json (wie `git rev-parse HEAD:package-lock.json`), "-dirty" bei lokalen Änderungen.
 */
export async function codeFingerprint(root) {
  const git = async (...args) => (await run('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 })).stdout;
  // Zeilen der Form "<mode> blob <hash>\t<pfad>"
  const files = lines(await git('ls-tree', '-r', 'HEAD', '--', ...CODE_PATHS)).filter((l) => affectsBuild(l.split('\t')[1]));
  const dirty = lines(await git('status', '--porcelain', '--', ...CODE_PATHS)).filter((l) => affectsBuild(l.slice(3)));
  const hash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 16);
  // Bei lokal geänderten Dateien zählt der Inhalt, sonst fiele eine weitere Änderung an derselben Datei nicht auf
  const dirtyContent = dirty.map((l) => {
    const file = l.slice(3).split(' -> ').pop();
    try {
      return `${l} ${hash(fs.readFileSync(path.join(root, file)))}`;
    } catch {
      return l; // gelöscht oder ein Ordner
    }
  });
  const lock = files.find((l) => l.endsWith('\tpackage-lock.json'))?.split(/\s/)[2] ?? '';
  const lockDirty = dirty.some((l) => l.endsWith('package-lock.json'));
  return { codeHash: hash([...files, ...dirtyContent].join('\n')), lockHash: lock + (lockDirty ? '-dirty' : '') };
}
