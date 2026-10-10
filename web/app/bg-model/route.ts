// KI-Modell fürs Freistellen (RMBG-1.4 von BRIA, fp16, 88 MB). Der Server lädt es beim ersten Abruf einmalig
// von Hugging Face in den Cache (CACHE_DIR, Standard .cache/, nicht im Git) und liefert es danach selbst aus. Der Browser rechnet damit lokal.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { cacheDir } from "@lib/config.mjs";

// fp16 statt der quantisierten 44-MB-Version: die liefert sichtbar fleckige Masken
const MODEL_URL = "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_fp16.onnx";
const FILE = "rmbg-1.4-fp16.onnx"; // bei einem anderen Modell auch MODEL in lib/bg-removal.worker.ts ändern

let downloading: Promise<string> | null = null;

async function modelPath() {
  const file = path.join(cacheDir(), FILE);
  try {
    await fsp.access(file);
    return file;
  } catch {
    // Mehrere gleichzeitige Abrufe teilen sich einen Download; erst nach vollständigem Download umbenennen
    downloading ??= (async () => {
      const res = await fetch(MODEL_URL);
      if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.part`;
      await fsp.writeFile(tmp, new Uint8Array(await res.arrayBuffer()));
      await fsp.rename(tmp, file);
      return file;
    })().finally(() => {
      downloading = null;
    });
    return downloading;
  }
}

export async function GET() {
  try {
    const file = await modelPath();
    const { size } = await fsp.stat(/*turbopackIgnore: true*/ file);
    return new Response(Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ file)) as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new Response(`Modell nicht verfügbar: ${(e as Error).message}`, { status: 502 });
  }
}
