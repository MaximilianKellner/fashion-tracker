// Speicher "sqlite": alle Einträge in einer SQLite-Datei (node:sqlite, ab Node 22.13 ohne Zusatzpaket).
// Ein Eintrag ist eine Zeile mit den Frontmatter-Feldern als JSON und dem Markdown-Text; so passen die Daten 1:1 zum
// Dateiformat (export/import) und das Schema bleibt in scripts/lib/schema.mjs. Fotos liegen wie bei "files" als Dateien
// im Datenverzeichnis (wardrobe/<id>/photo-N.webp), damit die Datenbank klein bleibt.
import fs from 'node:fs';
import path from 'node:path';
import { PROFILE, byId, cleanData, kindOf, photoDir } from './common.mjs';

const SCHEMA_VERSION = 1;
const PROFILE_KEY = ['profile', 'profile'];

function open(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Erst hier laden: im Modus "files" soll node:sqlite gar nicht erst geladen werden. Node 22 warnt beim Laden, dass
  // SQLite "experimental" ist; die Warnung bei jedem Aufruf verdeckt nur die eigentliche Ausgabe.
  const emitWarning = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    if (!String(warning).includes('SQLite')) emitWarning.call(process, warning, ...rest);
  };
  let DatabaseSync;
  try {
    ({ DatabaseSync } = process.getBuiltinModule('node:sqlite'));
  } finally {
    process.emitWarning = emitWarning;
  }
  const db = new DatabaseSync(file);
  // WAL: Website und Kommandozeile (export/import) können gleichzeitig zugreifen
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version > SCHEMA_VERSION) throw new Error(`${file} stammt von einer neueren Version (Schema ${version})`);
  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        kind       TEXT NOT NULL,
        id         TEXT NOT NULL,
        data       TEXT NOT NULL,
        body       TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      ) WITHOUT ROWID;
      PRAGMA user_version = 1;
    `);
  }
  return db;
}

export function createSqliteStore(file, root) {
  const db = open(file);
  const q = {
    ids: db.prepare('SELECT id FROM records WHERE kind = ? ORDER BY id'),
    list: db.prepare('SELECT id, data, body FROM records WHERE kind = ? ORDER BY id'),
    get: db.prepare('SELECT id, data, body FROM records WHERE kind = ? AND id = ?'),
    put: db.prepare(`
      INSERT INTO records (kind, id, data, body, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (kind, id) DO UPDATE SET data = excluded.data, body = excluded.body, updated_at = excluded.updated_at`),
    remove: db.prepare('DELETE FROM records WHERE kind = ? AND id = ?'),
  };
  const toRecord = (row) => row && { id: row.id, data: JSON.parse(row.data), body: row.body };
  const put = (kind, id, data, body, fields) =>
    q.put.run(kind, id, JSON.stringify(cleanData(data, fields)), body.trim(), new Date().toISOString());

  return {
    mode: 'sqlite',
    root,
    file,
    async ids(kind) {
      kindOf(kind);
      return q.ids.all(kind).map((r) => r.id);
    },
    async list(kind) {
      kindOf(kind);
      return q.list.all(kind).map(toRecord).sort(byId);
    },
    async get(kind, id) {
      kindOf(kind);
      return toRecord(q.get.get(kind, id)) ?? null;
    },
    async put(kind, id, data, body = '') {
      put(kind, id, data, body, kindOf(kind).fields);
    },
    async remove(kind, id) {
      q.remove.run(kind, id);
      if (kindOf(kind).photos) fs.rmSync(photoDir(root, kind, id), { recursive: true, force: true });
    },
    async getProfile() {
      const record = toRecord(q.get.get(...PROFILE_KEY));
      return record ? { data: record.data, body: record.body } : { data: {}, body: '' };
    },
    async putProfile(data, body = '') {
      put(...PROFILE_KEY, data, body, PROFILE.fields);
    },
    photoDir: (kind, id) => photoDir(root, kind, id),
    close: () => db.close(),
  };
}
