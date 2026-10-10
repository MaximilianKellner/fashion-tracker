// Einstellungen aus Umgebungsvariablen. Lokal stehen sie in .env im Repo (siehe .env.example), auf dem Server setzt sie
// das NixOS-Modul. Die Website lädt .env in web/next.config.ts, die Kommandozeilen-Skripte über loadEnv().
//
//   STORAGE        files (Standard): Markdown-Dateien + Fotos in DATA_DIR, optional ein Git-Repo
//                  sqlite: Datenbank-Datei (DATABASE_FILE), Fotos als Dateien in DATA_DIR
//   DATA_DIR       Datenverzeichnis, Standard: data/ im Code-Repo
//   DATABASE_FILE  nur bei STORAGE=sqlite, Standard: DATA_DIR/fashion-tracker.db
//   CACHE_DIR      Cache (z. B. KI-Modell fürs Freistellen), Standard: .cache/ im Code-Repo
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Wurzel des Code-Repos. Die Website setzt CODE_DIR in next.config.ts, weil import.meta.url im Bundle nicht stimmt. */
export function codeRoot() {
  if (process.env.CODE_DIR) return path.resolve(process.env.CODE_DIR);
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

/** Lädt <Code-Repo>/.env, ohne schon gesetzte Variablen zu überschreiben. */
export function loadEnv(root = codeRoot()) {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  const before = { ...process.env };
  process.loadEnvFile(file);
  // loadEnvFile überschreibt vorhandene Werte; Werte aus der Umgebung (z. B. vom NixOS-Modul) haben Vorrang
  Object.assign(process.env, before);
}

export const STORAGE_MODES = ['files', 'sqlite'];

export function storageMode() {
  const mode = process.env.STORAGE || 'files';
  if (!STORAGE_MODES.includes(mode)) throw new Error(`STORAGE="${mode}" unbekannt (erlaubt: ${STORAGE_MODES.join(', ')})`);
  return mode;
}

/** Datenverzeichnis; relative Pfade gelten ab dem Code-Repo. */
export function dataRoot() {
  return path.resolve(codeRoot(), process.env.DATA_DIR || 'data');
}

export function databaseFile() {
  return process.env.DATABASE_FILE ? path.resolve(codeRoot(), process.env.DATABASE_FILE) : path.join(dataRoot(), 'fashion-tracker.db');
}

export function cacheDir() {
  return path.resolve(codeRoot(), process.env.CACHE_DIR || '.cache');
}
