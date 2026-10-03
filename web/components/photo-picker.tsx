"use client";

import { useEffect, useRef, useState } from "react";
import { Photo } from "./photo";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;
const isImageFile = (f: File) => f.type.startsWith("image/") || IMAGE_EXT.test(f.name);

/**
 * Bild-URL aus einem Drag aus einem anderen Browser-Tab. Firefox liefert die Bildadresse in einem eigenen Typ;
 * sonst aus dem mitgeschickten HTML (<img src>) oder der URL-Liste. Nur https, der Server prüft den Rest.
 */
function droppedImageUrl(dt: DataTransfer): string | null {
  const candidates = [dt.getData("application/x-moz-file-promise-url")];
  const html = dt.getData("text/html");
  const src = html && new DOMParser().parseFromString(html, "text/html").querySelector("img")?.getAttribute("src");
  if (src) candidates.push(src);
  candidates.push(...dt.getData("text/uri-list").split(/\r?\n/).filter((l) => l && !l.startsWith("#")));
  return candidates.find((u) => /^https:\/\//.test(u ?? "")) ?? null;
}

/** Verkleinert ein Foto im Browser auf max. 2048px (JPEG). Der Server verkleinert danach final auf 1024px WebP. */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.9),
    );
  } catch {
    return file; // Browser kann das Format nicht dekodieren -> Original schicken, der Server versucht es
  }
}

/**
 * Zustand der Fotoauswahl: neue Dateien (Kamera, Galerie, Drag & Drop, Einfügen) und Bilder aus dem Web
 * (Shop-Import oder aus einem anderen Tab gezogen; der Server lädt sie beim Speichern).
 */
export function usePhotoPicker(importedPhotos: string[] = []) {
  // Neue Fotos samt Vorschau-URL; URLs werden beim Entfernen bzw. Verlassen der Seite freigegeben
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [remote, setRemote] = useState(() => importedPhotos.map((url, i) => ({ url, checked: i === 0 })));
  const [dragging, setDragging] = useState(false);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function addFiles(list: FileList | File[] | null) {
    const images = Array.from(list ?? []).filter(isImageFile);
    const picked = images.map((file) => ({ file, url: URL.createObjectURL(file) }));
    picked.forEach((p) => urls.current.add(p.url));
    setFiles((f) => [...f, ...picked]);
    return images.length;
  }
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });

  // Drag & Drop und Einfügen (Strg+V) auf der ganzen Seite
  useEffect(() => {
    let depth = 0;
    const hasPayload = (e: DragEvent) =>
      !!e.dataTransfer && [...e.dataTransfer.types].some((t) => t === "Files" || t === "text/uri-list" || t === "text/html");
    const onEnter = (e: DragEvent) => {
      if (!hasPayload(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasPayload(e)) e.preventDefault(); // sonst öffnet der Browser die Datei statt sie abzulegen
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer || !hasPayload(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (addFilesRef.current(e.dataTransfer.files) > 0) return;
      const url = droppedImageUrl(e.dataTransfer);
      if (url) setRemote((r) => (r.some((x) => x.url === url) ? r : [...r, { url, checked: true }]));
    };
    const onPaste = (e: ClipboardEvent) => {
      const pasted = Array.from(e.clipboardData?.files ?? []);
      if (pasted.some(isImageFile)) {
        e.preventDefault();
        addFilesRef.current(pasted);
      }
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  function removeFile(url: string) {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
    setFiles((f) => f.filter((x) => x.url !== url));
  }

  /** Hängt die neuen Fotos (verkleinert) als Feld "photos" an die Formulardaten */
  async function appendTo(fd: FormData) {
    fd.delete("photos");
    setPreparing(true);
    for (const { file } of files) fd.append("photos", await downscale(file), file.name);
    setPreparing(false);
  }

  return { files, remote, dragging, preparing, addFiles, removeFile, appendTo };
}

export type PhotoPickerState = ReturnType<typeof usePhotoPicker>;

/**
 * Fotobereich eines Formulars. `existing`: schon gespeicherte Fotos (Haken = entfernen);
 * `carried`: Fotos, die aus einem anderen Eintrag übernommen werden können (z. B. vom Wunsch zum gekauften Teil).
 */
export function PhotoPicker({
  picker,
  existing = [],
  carried = [],
  camera = true,
  tip,
}: {
  picker: PhotoPickerState;
  existing?: { name: string; src: string }[];
  carried?: { name: string; src: string; field: string }[];
  camera?: boolean;
  tip?: string;
}) {
  const { files, remote, dragging, addFiles, removeFile } = picker;
  return (
    <>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-accent px-10 py-16 text-center text-lg font-medium text-accent">
            Fotos hier ablegen
          </div>
        </div>
      )}
      {existing.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {existing.map((p) => (
            <label key={p.name} className="relative block w-24">
              <Photo src={p.src} className="aspect-[3/4] w-24 rounded-lg" />
              <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                <input type="checkbox" name="removePhotos" value={p.name} /> entfernen
              </span>
            </label>
          ))}
        </div>
      )}
      {carried.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">Fotos vom Wunsch (angehakte werden übernommen):</p>
          <div className="flex flex-wrap gap-3">
            {carried.map((p) => (
              <label key={p.name} className="block w-24">
                <Photo src={p.src} className="aspect-[3/4] w-24 rounded-lg" />
                <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" name={p.field} value={p.name} defaultChecked /> übernehmen
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      {remote.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">Bilder aus dem Web (angehakte werden beim Speichern geladen):</p>
          <div className="flex flex-wrap gap-3">
            {remote.map(({ url, checked }) => (
              <label key={url} className="block w-24">
                <Photo src={url} remote className="aspect-[3/4] w-24 rounded-lg" />
                <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" name="importPhotos" value={url} defaultChecked={checked} /> übernehmen
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {files.map(({ url }) => (
            <div key={url} className="relative w-24">
              <Photo src={url} lazy={false} className="aspect-[3/4] w-24 rounded-lg" />
              <button
                type="button"
                onClick={() => removeFile(url)}
                className="absolute right-1 top-1 rounded-full bg-surface/90 px-2 text-sm"
                aria-label="Foto entfernen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {camera && (
          <label className="btn-primary cursor-pointer">
            Foto aufnehmen
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <label className={`${camera ? "btn-ghost" : "btn-primary"} cursor-pointer`}>
          {camera ? "Aus Galerie" : "Bild hinzufügen"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="hidden rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted sm:block">
        Fotos hierher ziehen, auch Bilder direkt aus einem Shop-Tab, oder mit Strg+V einfügen
      </p>
      {tip && <p className="text-xs text-muted">{tip}</p>}
    </>
  );
}
