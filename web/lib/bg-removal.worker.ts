// Web Worker: stellt ein Foto mit RMBG-1.4 frei und legt es auf weißen Hintergrund. Läuft komplett im Browser
// (onnxruntime-web, WebAssembly), damit die Seite während der Berechnung bedienbar bleibt.
import * as ort from "onnxruntime-web/wasm";

export type BgRequest = { id: number; image: Blob; maxSize: number };
export type BgResponse =
  | { id: number; type: "progress"; stage: "download" | "compute"; percent?: number }
  | { id: number; type: "done"; image: Blob }
  | { id: number; type: "error"; message: string };

const SIZE = 1024; // feste Eingabegröße des Modells
const MODEL = "rmbg-1.4-fp16"; // muss zur Datei in app/bg-model/route.ts passen

/** Modell-Cache in IndexedDB: Der HTTP-Cache behält 88 MB oft nicht, und die Cache-API fehlt ohne HTTPS (Handy im WLAN) */
function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("bg-removal", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("models");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = run(open.result.transaction("models", mode).objectStore("models"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

async function download(onProgress: (percent?: number) => void) {
  const res = await fetch("/bg-model");
  if (!res.ok || !res.body) throw new Error(await res.text());
  const total = Number(res.headers.get("Content-Length")) || 0;
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (const reader = res.body.getReader(); ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(total ? Math.round((loaded / total) * 100) : undefined);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes;
}

let session: Promise<ort.InferenceSession> | null = null;

function getSession(onProgress: (percent?: number) => void) {
  session ??= (async () => {
    let bytes = await idb<Uint8Array | undefined>("readonly", (s) => s.get(MODEL)).catch(() => undefined);
    if (!bytes) {
      bytes = await download(onProgress);
      // Ältere Modellversionen entfernen; schlägt das Speichern fehl (z. B. privater Modus), wird eben nächstes Mal neu geladen
      await idb("readwrite", (s) => s.clear()).catch(() => {});
      await idb("readwrite", (s) => s.put(bytes, MODEL)).catch(() => {});
    }
    // Ohne Cross-Origin-Isolation (HTTP im WLAN) gibt es keine Threads
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    return ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  })();
  session.catch(() => (session = null)); // nach einem Fehler beim nächsten Versuch neu laden
  return session;
}

function canvas(w: number, h: number) {
  const c = new OffscreenCanvas(w, h);
  return [c, c.getContext("2d")!] as const;
}

async function whiten({ id, image, maxSize }: BgRequest): Promise<Blob> {
  const post = (msg: BgResponse) => self.postMessage(msg);
  const bitmap = await createImageBitmap(image, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Dieses Bildformat kann der Browser nicht öffnen.");
  });
  const model = await getSession((percent) => post({ id, type: "progress", stage: "download", percent }));
  post({ id, type: "progress", stage: "compute" });

  // Eingabe: 1024×1024 RGB, Werte 0…1 minus 0,5 (Normalisierung von RMBG-1.4)
  const [, small] = canvas(SIZE, SIZE);
  small.drawImage(bitmap, 0, 0, SIZE, SIZE);
  const rgba = small.getImageData(0, 0, SIZE, SIZE).data;
  const plane = SIZE * SIZE;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    input[i] = rgba[i * 4] / 255 - 0.5;
    input[i + plane] = rgba[i * 4 + 1] / 255 - 0.5;
    input[i + 2 * plane] = rgba[i * 4 + 2] / 255 - 0.5;
  }
  const out = await model.run({ [model.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const mask = out[model.outputNames[0]].data as Float32Array;

  // Maske auf 0…1 strecken und als Alphakanal ablegen
  let min = Infinity;
  let max = -Infinity;
  for (const v of mask) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const [maskCanvas, maskCtx] = canvas(SIZE, SIZE);
  const maskData = maskCtx.createImageData(SIZE, SIZE);
  for (let i = 0; i < plane; i++) maskData.data[i * 4 + 3] = Math.round(((mask[i] - min) / range) * 255);
  maskCtx.putImageData(maskData, 0, 0);

  // Original (höchstens maxSize) mit der hochskalierten Maske ausschneiden und auf Weiß legen
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const [cut, cutCtx] = canvas(w, h);
  cutCtx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  cutCtx.globalCompositeOperation = "destination-in";
  cutCtx.imageSmoothingQuality = "high";
  cutCtx.drawImage(maskCanvas, 0, 0, w, h);

  const [result, ctx] = canvas(w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(cut, 0, 0);
  return result.convertToBlob({ type: "image/jpeg", quality: 0.92 });
}

// Anfragen nacheinander abarbeiten, eine WASM-Session rechnet nicht parallel
let queue = Promise.resolve();
self.onmessage = (e: MessageEvent<BgRequest>) => {
  const req = e.data;
  queue = queue.then(async () => {
    try {
      self.postMessage({ id: req.id, type: "done", image: await whiten(req) } satisfies BgResponse);
    } catch (err) {
      self.postMessage({ id: req.id, type: "error", message: (err as Error).message } satisfies BgResponse);
    }
  });
};
