// Hintergrund eines Fotos durch helles Grau ersetzen („Hintergrund weiß“), lokal im Browser (siehe bg-removal.worker.ts)
import type { Backend, BgRequest, BgResponse } from "./bg-removal.worker";

/** backend: womit gerechnet wird (Grafikkarte per WebGPU oder CPU per WebAssembly) */
export type BgProgress = { stage: "download" | "compute"; percent?: number; backend?: Backend };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void; onProgress?: (p: BgProgress) => void }>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./bg-removal.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<BgResponse>) => {
      const msg = e.data;
      const job = pending.get(msg.id);
      if (!job) return;
      if (msg.type === "progress") return job.onProgress?.({ stage: msg.stage, percent: msg.percent, backend: msg.backend });
      pending.delete(msg.id);
      if (msg.type === "done") job.resolve(msg.image);
      else job.reject(new Error(msg.message));
    };
    worker.onerror = (e) => {
      pending.forEach((job) => job.reject(new Error(e.message || "Freistellen fehlgeschlagen")));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

/** Liefert das Foto als JPEG mit hellgrauem Hintergrund (lange Seite höchstens maxSize Pixel) */
export function whitenBackground(image: Blob, onProgress?: (p: BgProgress) => void, maxSize = 2048): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, image, maxSize } satisfies BgRequest);
  });
}
