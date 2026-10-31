"use client";

import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { whitenBackground, type BgProgress } from "@/lib/bg-removal";
import { Photo } from "./photo";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;
const isImageFile = (f: File) => f.type.startsWith("image/") || IMAGE_EXT.test(f.name);

// Eigener Typ beim Umsortieren per Drag & Drop, damit die Ablage-Fläche für neue Fotos dabei nicht erscheint
const SORT_TYPE = "application/x-kleiderschrank-foto";

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
 * Woher ein Foto stammt: schon gespeichert, von einem anderen Eintrag übernommen (z. B. vom Wunsch zum gekauften Teil),
 * aus dem Web (Shop-Import oder aus einem anderen Tab gezogen; der Server lädt es beim Speichern) oder neu hochgeladen.
 */
type Source =
  | { type: "saved"; name: string }
  | { type: "carried"; name: string }
  | { type: "web"; url: string }
  | { type: "file"; file: File };

type PhotoEntry = {
  key: string;
  source: Source;
  /** Vorschau der Quelle */
  src: string;
  /** Nur ausgewählte Fotos werden gespeichert; die übrigen stehen unter „Weitere Bilder“ zum Hinzufügen bereit */
  selected: boolean;
  /** Freigestellte Fassung; „Original“ verwirft sie wieder */
  whitened?: { file: File; url: string };
  /** Fortschritt bzw. Fehler beim Weißmachen */
  whitening?: BgProgress;
  error?: string;
};

/** Bild als Datei holen, um es im Browser zu bearbeiten. Shop-Bilder über den eigenen Server (CORS). */
async function loadImage({ source, src }: PhotoEntry): Promise<Blob> {
  if (source.type === "file") return source.file;
  const res = await fetch(source.type === "web" ? `/image-proxy?url=${encodeURIComponent(source.url)}` : src);
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.blob();
}

/**
 * Zustand der Fotoauswahl als eine Liste in Speicher-Reihenfolge: das erste ausgewählte Foto ist das Hauptfoto.
 * `saved`: schon gespeicherte Fotos mit Vorschau-URL; `carried`: Fotos eines anderen Eintrags (vorausgewählt);
 * `imported`: Bilder aus dem Shop-Import (nur das erste vorausgewählt).
 */
export function usePhotoPicker({
  saved = [],
  carried = [],
  imported = [],
}: {
  saved?: { name: string; src: string }[];
  carried?: { name: string; src: string }[];
  imported?: string[];
} = {}) {
  const [entries, setEntries] = useState<PhotoEntry[]>(() => [
    ...saved.map(({ name, src }) => ({ key: `saved:${name}`, source: { type: "saved", name } as const, src, selected: true })),
    ...carried.map(({ name, src }) => ({ key: `carried:${name}`, source: { type: "carried", name } as const, src, selected: true })),
    ...imported.map((url, i) => ({ key: `web:${url}`, source: { type: "web", url } as const, src: url, selected: i === 0 })),
  ]);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Vorschau-URLs neuer bzw. freigestellter Fotos; werden beim Entfernen bzw. Verlassen der Seite freigegeben
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function addFiles(list: FileList | File[] | null) {
    const images = Array.from(list ?? []).filter(isImageFile);
    const picked = images.map((file): PhotoEntry => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { key: url, source: { type: "file", file }, src: url, selected: true };
    });
    setEntries((e) => [...e.filter((p) => p.selected), ...picked, ...e.filter((p) => !p.selected)]);
    return images.length;
  }
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });

  /** Bild aus dem Web ans Ende der Auswahl (schon vorhandenes wird nur ausgewählt) */
  function addUrl(url: string) {
    const key = `web:${url}`;
    setEntries((e) => {
      const rest = e.filter((p) => p.key !== key);
      const entry = e.find((p) => p.key === key) ?? { key, source: { type: "web", url } as const, src: url };
      return [...rest.filter((p) => p.selected), { ...entry, selected: true }, ...rest.filter((p) => !p.selected)];
    });
  }

  // Drag & Drop und Einfügen (Strg+V) auf der ganzen Seite
  useEffect(() => {
    let depth = 0;
    const hasPayload = (e: DragEvent) => {
      const types = [...(e.dataTransfer?.types ?? [])];
      return !types.includes(SORT_TYPE) && types.some((t) => t === "Files" || t === "text/uri-list" || t === "text/html");
    };
    const onEnter = (e: DragEvent) => {
      if (!hasPayload(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasPayload(e)) return;
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
      if (url) addUrlRef.current(url);
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
  const addUrlRef = useRef(addUrl);
  useEffect(() => {
    addUrlRef.current = addUrl;
  });

  function release(...list: (string | undefined)[]) {
    for (const url of list) {
      if (!url) continue;
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  }

  const update = (key: string, change: (p: PhotoEntry) => PhotoEntry) =>
    setEntries((e) => e.map((p) => (p.key === key ? change(p) : p)));

  /** Neue Dateien fallen ganz weg, alles andere wandert zu „Weitere Bilder“ */
  function remove(key: string) {
    const photo = entries.find((p) => p.key === key);
    if (photo?.source.type === "file") {
      release(photo.src, photo.whitened?.url);
      setEntries((e) => e.filter((p) => p.key !== key));
    } else {
      setEntries((e) => [...e.filter((p) => p.key !== key), ...e.filter((p) => p.key === key).map((p) => ({ ...p, selected: false }))]);
    }
  }

  /** Aus „Weitere Bilder“ ans Ende der Auswahl */
  function select(key: string) {
    setEntries((e) => {
      const photo = e.find((p) => p.key === key);
      if (!photo) return e;
      const rest = e.filter((p) => p.key !== key);
      return [...rest.filter((p) => p.selected), { ...photo, selected: true }, ...rest.filter((p) => !p.selected)];
    });
  }

  /** Verschiebt ein ausgewähltes Foto an Stelle `to` (0 = Hauptfoto) */
  function move(key: string, to: number) {
    setEntries((e) => {
      const chosen = e.filter((p) => p.selected);
      const from = chosen.findIndex((p) => p.key === key);
      if (from < 0 || from === to || to < 0 || to >= chosen.length) return e;
      const [photo] = chosen.splice(from, 1);
      chosen.splice(to, 0, photo);
      return [...chosen, ...e.filter((p) => !p.selected)];
    });
  }

  /** Stellt das Teil per KI frei und legt es auf weißen Hintergrund (lokal im Browser) */
  async function whiten(key: string) {
    const photo = entries.find((p) => p.key === key);
    if (!photo || photo.whitened || photo.whitening) return;
    update(key, (p) => ({ ...p, whitening: { stage: "compute" }, error: undefined }));
    try {
      const blob = await whitenBackground(await loadImage(photo), (whitening) => update(key, (p) => ({ ...p, whitening })));
      const base = photo.source.type === "file" ? photo.source.file.name.replace(/\.[^.]*$/, "") : "foto";
      const file = new File([blob], `${base}-weiss.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      update(key, (p) => ({ ...p, whitened: { file, url }, whitening: undefined }));
    } catch (e) {
      update(key, (p) => ({ ...p, whitening: undefined, error: (e as Error).message }));
    }
  }

  function restore(key: string) {
    const photo = entries.find((p) => p.key === key);
    if (!photo?.whitened) return;
    release(photo.whitened.url);
    update(key, (p) => ({ ...p, whitened: undefined }));
  }

  /**
   * Schreibt die Auswahl in die Formulardaten: "photoOrder" listet die Fotos in Reihenfolge
   * (saved:<datei>, carried:<datei>, web:<url> oder upload), "photos" enthält die hochzuladenden Dateien in derselben Reihenfolge.
   */
  async function appendTo(fd: FormData) {
    fd.delete("photos");
    fd.delete("photoOrder");
    setPreparing(true);
    for (const { source, whitened } of entries.filter((p) => p.selected)) {
      if (whitened) {
        // Freigestellte Fotos sind schon verkleinert
        fd.append("photos", whitened.file, whitened.file.name);
        fd.append("photoOrder", "upload");
      } else if (source.type === "file") {
        fd.append("photos", await downscale(source.file), source.file.name);
        fd.append("photoOrder", "upload");
      } else {
        fd.append("photoOrder", source.type === "web" ? `web:${source.url}` : `${source.type}:${source.name}`);
      }
    }
    setPreparing(false);
  }

  return {
    entries,
    dragging,
    // Solange ein Foto freigestellt wird, kann das Formular nicht gespeichert werden
    preparing: preparing || entries.some((p) => p.whitening),
    addFiles,
    remove,
    select,
    move,
    whiten,
    restore,
    appendTo,
  };
}

export type PhotoPickerState = ReturnType<typeof usePhotoPicker>;

const roundBtn = "flex size-6 items-center justify-center rounded-full bg-surface/90 text-sm text-ink shadow hover:bg-surface";

/** Fotobereich eines Formulars: sortierbare Liste der Fotos, darunter nicht ausgewählte Bilder zum Hinzufügen */
export function PhotoPicker({ picker, camera = true, tip }: { picker: PhotoPickerState; camera?: boolean; tip?: string }) {
  const { entries, dragging, addFiles, remove, select, move, whiten, restore } = picker;
  const chosen = entries.filter((p) => p.selected);
  const others = entries.filter((p) => !p.selected);
  // Gerade per Drag & Drop verschobenes Foto
  const [sorting, setSorting] = useState<string | null>(null);

  const sortHandlers = (key: string, index: number) => ({
    draggable: true,
    onDragStart: (e: ReactDragEvent) => {
      e.dataTransfer.setData(SORT_TYPE, key);
      e.dataTransfer.effectAllowed = "move";
      setSorting(key);
    },
    onDragEnter: () => sorting && sorting !== key && move(sorting, index),
    onDragOver: (e: ReactDragEvent) => {
      if (sorting) e.preventDefault();
    },
    onDrop: (e: ReactDragEvent) => {
      if (sorting) e.preventDefault();
    },
    onDragEnd: () => setSorting(null),
  });

  return (
    <>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-accent px-10 py-16 text-center text-lg font-medium text-accent">
            Fotos hier ablegen
          </div>
        </div>
      )}
      {chosen.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            {chosen.map((p, i) => (
              <div
                key={p.key}
                {...sortHandlers(p.key, i)}
                className={`w-24 cursor-grab active:cursor-grabbing ${sorting === p.key ? "opacity-40" : ""}`}
              >
                <div className="relative">
                  <Photo
                    src={p.whitened?.url ?? p.src}
                    remote={p.source.type === "web" && !p.whitened}
                    lazy={false}
                    className={`aspect-[3/4] w-24 rounded-lg ${i === 0 ? "ring-2 ring-accent" : ""}`}
                  />
                  {i === 0 && chosen.length > 1 && (
                    <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 text-[10px] font-medium text-accent-ink">
                      Hauptfoto
                    </span>
                  )}
                  {p.source.type === "web" && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-surface/90 px-1.5 text-[10px] text-muted" title={p.source.url}>
                      Shop
                    </span>
                  )}
                  {p.whitening && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-bg/75 px-1 text-center text-xs font-medium">
                      <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      {p.whitening.stage === "download"
                        ? `KI-Modell lädt${p.whitening.percent !== undefined ? ` ${p.whitening.percent} %` : " …"}`
                        : `Wird freigestellt${p.whitening.backend === "webgpu" ? " (GPU)" : ""} …`}
                    </div>
                  )}
                  <button type="button" onClick={() => remove(p.key)} className={`absolute right-1 top-1 ${roundBtn}`} aria-label="Foto entfernen">
                    ×
                  </button>
                  {chosen.length > 1 && (
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      {i > 0 && (
                        <button type="button" onClick={() => move(p.key, i - 1)} className={roundBtn} aria-label="Nach vorn" title="Nach vorn">
                          ‹
                        </button>
                      )}
                      {i < chosen.length - 1 && (
                        <button type="button" onClick={() => move(p.key, i + 1)} className={roundBtn} aria-label="Nach hinten" title="Nach hinten">
                          ›
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!!p.whitening}
                  onClick={() => (p.whitened ? restore(p.key) : whiten(p.key))}
                  title={p.whitened ? "Wieder das unveränderte Foto verwenden" : "Hintergrund per KI entfernen und weiß machen"}
                  className="mt-1 w-full rounded-md border border-line px-1 py-0.5 text-xs text-muted hover:bg-surface-2 disabled:opacity-50"
                >
                  {p.whitened ? "Original" : "Hintergrund weiß"}
                </button>
                {p.error && (
                  <p className="mt-1 text-xs text-danger" title={p.error}>
                    Fehlgeschlagen
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chosen.filter((p) => !p.whitened).length > 1 && (
              <button
                type="button"
                disabled={chosen.some((p) => p.whitening)}
                onClick={() => chosen.forEach((p) => whiten(p.key))}
                className="btn-ghost text-sm"
              >
                Alle Hintergründe weiß
              </button>
            )}
            {chosen.length > 1 && (
              <span className="text-xs text-muted">Das erste Foto ist das Hauptfoto. Zum Umsortieren ziehen oder die Pfeile nutzen.</span>
            )}
          </div>
          <p className="text-xs text-muted">
            „Hintergrund weiß“ stellt das Teil per KI direkt im Browser frei, ohne fremde Dienste. Mit Grafikkarte (WebGPU, nur
            über HTTPS) dauert das wenige Sekunden, sonst je nach Gerät 10–60 Sekunden; beim ersten Mal wird dafür einmalig ein Modell geladen (88 MB).
          </p>
        </div>
      )}
      {others.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">Weitere Bilder (antippen zum Hinzufügen):</p>
          <div className="flex flex-wrap gap-2">
            {others.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => select(p.key)}
                className="group relative w-16 rounded-lg focus-visible:outline-2 focus-visible:outline-accent"
                aria-label="Bild hinzufügen"
                title={p.source.type === "saved" ? "Entferntes Foto wieder hinzufügen" : "Hinzufügen"}
              >
                <Photo
                  src={p.whitened?.url ?? p.src}
                  remote={p.source.type === "web" && !p.whitened}
                  className="aspect-[3/4] w-16 rounded-lg opacity-60 transition-opacity group-hover:opacity-100"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-7 items-center justify-center rounded-full bg-accent text-lg leading-none text-accent-ink shadow">+</span>
                </span>
              </button>
            ))}
          </div>
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
