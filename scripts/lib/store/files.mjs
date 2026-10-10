// Speicher "files": Markdown-Dateien mit YAML-Frontmatter plus Fotos, z. B. in einem eigenen Git-Repo.
//   wardrobe/<id>/item.md + photo-N.webp, outfits/<id>.md, wishlist/<id>.md + wishlist/<id>/photo-N.webp,
//   recommendations/<id>.md, profile.md
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { PROFILE, byId, cleanData, kindOf, normalize, photoDir } from './common.mjs';

async function readMarkdown(file) {
  const raw = await fs.readFile(file, 'utf8');
  // Optionen übergeben, damit gray-matter nicht cached und Objekte nicht geteilt werden
  const { data, content } = matter(raw, {});
  return { data: normalize(data), body: content.trim() };
}

async function writeMarkdown(file, data, body, fields) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, matter.stringify(body ? `\n${body.trim()}\n` : '', cleanData(data, fields)), 'utf8');
}

async function listDir(dir) {
  try {
    return (await fs.readdir(dir, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

const orNull = (promise) =>
  promise.catch((err) => {
    if (err.code === 'ENOENT') return null;
    throw err;
  });

export function createFileStore(root) {
  const fileOf = (kind, id) => {
    const k = kindOf(kind);
    return k.nested ? path.join(root, k.dir, id, 'item.md') : path.join(root, k.dir, `${id}.md`);
  };

  async function ids(kind) {
    const k = kindOf(kind);
    const entries = await listDir(path.join(root, k.dir));
    if (!k.nested) return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name.slice(0, -3));
    // Nur Ordner mit item.md; ein Ordner nur mit Fotos ist kein Teil
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const exists = await Promise.all(dirs.map((id) => orNull(fs.access(fileOf(kind, id)).then(() => true))));
    return dirs.filter((_, i) => exists[i]);
  }

  async function get(kind, id) {
    const record = await orNull(readMarkdown(fileOf(kind, id)));
    return record && { id, ...record };
  }

  return {
    mode: 'files',
    root,
    ids,
    get,
    async list(kind) {
      const records = [];
      for (const id of await ids(kind)) {
        const record = await get(kind, id);
        if (record) records.push(record);
      }
      return records.sort(byId);
    },
    put: (kind, id, data, body = '') => writeMarkdown(fileOf(kind, id), data, body, kindOf(kind).fields),
    async remove(kind, id) {
      const k = kindOf(kind);
      await fs.rm(fileOf(kind, id), { force: true });
      if (k.photos) await fs.rm(photoDir(root, kind, id), { recursive: true, force: true });
    },
    async getProfile() {
      return (await orNull(readMarkdown(path.join(root, PROFILE.file)))) ?? { data: {}, body: '' };
    },
    putProfile: (data, body = '') => writeMarkdown(path.join(root, PROFILE.file), data, body, PROFILE.fields),
    photoDir: (kind, id) => photoDir(root, kind, id),
    close() {},
  };
}
