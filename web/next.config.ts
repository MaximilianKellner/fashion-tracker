import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_SERVER } from "next/constants";

const repoRoot = path.join(__dirname, "..");

// Einstellungen (STORAGE, DATA_DIR, ...) aus .env im Code-Repo laden, siehe .env.example und scripts/lib/config.mjs.
// Werte aus der Umgebung (z. B. vom NixOS-Modul) haben Vorrang. Läuft bei `next dev`, `next build` und `next start`.
process.env.CODE_DIR ??= repoRoot;
const envFile = path.join(repoRoot, ".env");
if (fs.existsSync(envFile)) {
  const before = { ...process.env };
  process.loadEnvFile(envFile);
  Object.assign(process.env, before);
}

// Alle IPv4-Adressen dieses PCs, damit das Handy im WLAN (http://<PC-IP>:3000) den Dev-Server nutzen darf
const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const nextConfig: NextConfig = {
  // scripts/lib liegt außerhalb von web/ und muss für Turbopack auflösbar sein
  turbopack: { root: repoRoot },
  allowedDevOrigins: lanAddresses,
  // Unten links verdeckt das Symbol sonst die mobile Navigationsleiste
  devIndicators: { position: "top-right" },
  experimental: {
    serverActions: {
      // Handy-Fotos werden im Browser auf 2048px verkleinert, mehrere pro Teil passen so locker rein
      bodySizeLimit: "25mb",
    },
  },
};

/** Build-Ordner, aus dem `next start` läuft. Der Home-PC baut abwechselnd in .next und .next-alt (scripts/prepare-server.mjs). */
function activeDistDir(): string | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, ".build-state.json"), "utf8")).active;
  } catch {
    return undefined;
  }
}

export default function config(phase: string): NextConfig {
  // Beim Bauen gibt prepare-server.mjs den Ordner vor, beim Start gilt der zuletzt erfolgreich gebaute
  const distDir = process.env.NEXT_DIST_DIR || (phase === PHASE_PRODUCTION_SERVER ? activeDistDir() : undefined) || ".next";
  return { ...nextConfig, distDir };
}
