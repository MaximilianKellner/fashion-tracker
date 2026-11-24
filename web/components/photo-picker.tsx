"use client";

import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from "react";
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
  /** Freigestellte Fassung; bleibt erhalten, wenn man zum Original zurückschaltet */
  whitened?: { file: File; url: string };
  /** Freigestellte Fassung verwenden (umschaltbar, ohne neu zu rechnen) */
  white?: boolean;
  /** Fortschritt bzw. Fehler beim Weißmachen */
  whitening?: BgProgress;
  error?: string;
  /** Horizontal gespiegelt */
  mirrored?: boolean;
  /** Zuschnitt in Anteilen (0–1) des (gegebenenfalls gespiegelten) Bildes */
  crop?: Crop;
  /** Im Browser berechnete Fassung mit Zuschnitt und Spiegelung; `sig` sagt, für welche Einstellungen sie gilt */
  edited?: { sig: string; file?: File; url?: string };
};

/** Ausschnitt in Anteilen der Bildbreite bzw. -höhe */
export type Crop = { x: number; y: number; w: number; h: number };

const isWhite = (p: PhotoEntry) => !!(p.white && p.whitened);
/** Ausgangsbild vor Zuschnitt und Spiegelung: die freigestellte Fassung oder das Original */
const baseSrc = (p: PhotoEntry) => (p.white && p.whitened ? p.whitened.url : p.src);
/** Kennung der Bearbeitung (null = unbearbeitet); ändert sie sich, muss die Fassung neu berechnet werden */
const editSig = (p: PhotoEntry) =>
  p.mirrored || p.crop
    ? `${baseSrc(p)}|${p.mirrored ? 1 : 0}|${
        p.crop
          ? Object.values(p.crop)
              .map((v) => v.toFixed(4))
              .join(",")
          : ""
      }`
    : null;
const editedFile = (p: PhotoEntry) => {
  const sig = editSig(p);
  return sig && p.edited?.sig === sig ? p.edited : undefined;
};
/** Was angezeigt und gespeichert wird */
const shown = (p: PhotoEntry) => editedFile(p)?.url ?? baseSrc(p);
/** Bild liegt auf einer fremden Seite (keinen Referrer mitschicken) */
const isRemote = (p: PhotoEntry) => p.source.type === "web" && !isWhite(p) && !editedFile(p)?.url;

/** Bild als Datei holen, um es im Browser zu bearbeiten. Shop-Bilder über den eigenen Server (CORS). */
async function loadImage({ source, src }: PhotoEntry): Promise<Blob> {
  if (source.type === "file") return source.file;
  const res = await fetch(source.type === "web" ? `/image-proxy?url=${encodeURIComponent(source.url)}` : src);
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.blob();
}

/** Rechnet Zuschnitt und Spiegelung ins Bild (max. 2048px, JPEG) */
async function renderEdited(p: PhotoEntry): Promise<File> {
  const blob = isWhite(p) ? p.whitened!.file : await loadImage(p);
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: "from-image",
  });
  const { width: W, height: H } = bitmap;
  const c = p.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  // Der Zuschnitt gilt fürs gespiegelte Bild, im Original liegt er also gespiegelt
  const sx = (p.mirrored ? 1 - c.x - c.w : c.x) * W;
  const [sy, sw, sh] = [c.y * H, c.w * W, c.h * H];
  const scale = Math.min(1, 2048 / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d")!;
  if (p.mirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const out = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.9));
  const base = p.source.type === "file" ? p.source.file.name.replace(/\.[^.]*$/, "") : "foto";
  return new File([out], `${base}-bearbeitet.jpg`, { type: "image/jpeg" });
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
    const stop = new AbortController();
    const { signal } = stop;
    window.addEventListener("dragenter", onEnter, { signal });
    window.addEventListener("dragleave", onLeave, { signal });
    window.addEventListener("dragover", onOver, { signal });
    window.addEventListener("drop", onDrop, { signal });
    window.addEventListener("paste", onPaste, { signal });
    return () => stop.abort();
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

  /** Stellt das Teil per KI frei und legt es auf weißen Hintergrund (lokal im Browser); schon berechnet: nur umschalten */
  async function whiten(key: string) {
    const photo = entries.find((p) => p.key === key);
    if (!photo || photo.whitening) return;
    if (photo.whitened) return update(key, (p) => ({ ...p, white: true }));
    update(key, (p) => ({ ...p, whitening: { stage: "compute" }, error: undefined }));
    try {
      const blob = await whitenBackground(await loadImage(photo), (whitening) => update(key, (p) => ({ ...p, whitening })));
      const base = photo.source.type === "file" ? photo.source.file.name.replace(/\.[^.]*$/, "") : "foto";
      const file = new File([blob], `${base}-weiss.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      update(key, (p) => ({ ...p, whitened: { file, url }, white: true, whitening: undefined }));
    } catch (e) {
      update(key, (p) => ({ ...p, whitening: undefined, error: (e as Error).message }));
    }
  }

  /** Zurück zum Original; die freigestellte Fassung bleibt für „Hintergrund weiß“ erhalten */
  function restore(key: string) {
    update(key, (p) => ({ ...p, white: false }));
  }

  /** Spiegelt ein Foto horizontal (umschaltbar); ein Zuschnitt behält dabei denselben Bildteil */
  function mirror(key: string) {
    update(key, (p) => ({
      ...p,
      mirrored: !p.mirrored,
      crop: p.crop && { ...p.crop, x: 1 - p.crop.x - p.crop.w },
    }));
  }

  /** Setzt den Zuschnitt (undefined = ganzes Bild) */
  function setCrop(key: string, crop?: Crop) {
    update(key, (p) => ({ ...p, crop }));
  }

  // Vorschau der bearbeiteten Fassungen im Hintergrund berechnen
  const rendering = useRef(new Set<string>());
  useEffect(() => {
    for (const p of entries) {
      const sig = editSig(p);
      if (!sig || p.edited?.sig === sig || rendering.current.has(sig)) continue;
      rendering.current.add(sig);
      renderEdited(p)
        .then((file) => {
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          return { sig, file, url, error: undefined };
        })
        .catch((e: Error) => ({
          sig,
          file: undefined,
          url: undefined,
          error: e.message,
        }))
        .then(({ error, ...edited }) => update(p.key, (q) => (editSig(q) === sig ? { ...q, edited, error } : q)))
        .finally(() => rendering.current.delete(sig));
    }
  }, [entries]);

  /**
   * Schreibt die Auswahl in die Formulardaten: "photoOrder" listet die Fotos in Reihenfolge
   * (saved:<datei>, carried:<datei>, web:<url> oder upload), "photos" enthält die hochzuladenden Dateien in derselben Reihenfolge.
   */
  async function appendTo(fd: FormData) {
    fd.delete("photos");
    fd.delete("photoOrder");
    setPreparing(true);
    try {
      for (const p of entries.filter((e) => e.selected)) await appendPhoto(fd, p);
    } finally {
      setPreparing(false);
    }
  }

  async function appendPhoto(fd: FormData, p: PhotoEntry) {
    const { source, whitened } = p;
    if (editSig(p)) {
      // Zugeschnittene oder gespiegelte Fotos werden wie neue Fotos hochgeladen
      let file = editedFile(p)?.file;
      if (!file) {
        try {
          file = await renderEdited(p);
        } catch (e) {
          update(p.key, (q) => ({ ...q, error: (e as Error).message }));
          throw e; // Speichern abbrechen, sonst ginge das Foto unbearbeitet verloren
        }
      }
      fd.append("photos", file, file.name);
      fd.append("photoOrder", "upload");
    } else if (whitened && isWhite(p)) {
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
    mirror,
    setCrop,
    appendTo,
  };
}

export type PhotoPickerState = ReturnType<typeof usePhotoPicker>;

const roundBtn = "flex size-6 items-center justify-center rounded-full bg-surface/90 text-sm text-ink shadow hover:bg-surface";

/** Fotobereich eines Formulars: sortierbare Liste der Fotos, darunter nicht ausgewählte Bilder zum Hinzufügen */
export function PhotoPicker({ picker, camera = true, tip }: { picker: PhotoPickerState; camera?: boolean; tip?: string }) {
  const { entries, dragging, addFiles, remove, select, move, whiten } = picker;
  const chosen = entries.filter((p) => p.selected);
  const others = entries.filter((p) => !p.selected);
  // Gerade per Drag & Drop verschobenes Foto
  const [sorting, setSorting] = useState<string | null>(null);
  // Foto, dessen Bearbeiten-Dialog offen ist
  const [editing, setEditing] = useState<string | null>(null);
  const editingPhoto = chosen.find((p) => p.key === editing);

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
                  <button
                    type="button"
                    onClick={() => setEditing(p.key)}
                    className="group relative block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    aria-label="Foto bearbeiten"
                    title="Bearbeiten: zuschneiden, spiegeln, Hintergrund entfernen"
                  >
                    <Photo
                      src={shown(p)}
                      remote={isRemote(p)}
                      lazy={false}
                      className={`aspect-[3/4] w-24 rounded-lg ${i === 0 ? "ring-2 ring-accent" : ""}`}
                    />
                    {/* Bearbeiten-Icon: mit Maus beim Überfahren, auf Touch-Geräten (ohne Hover) immer sichtbar */}
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg transition-[opacity,background-color] duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:bg-black/25 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100">
                      <span className="flex size-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow">
                        <PencilIcon />
                      </span>
                    </span>
                  </button>
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
                  {p.whitening && <WhiteningOverlay progress={p.whitening} />}
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
                {p.error && (
                  <p className="mt-1 text-xs text-danger" title={p.error}>
                    Fehlgeschlagen
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs text-muted">Zum Bearbeiten auf ein Foto klicken.</p>
            {chosen.filter((p) => !isWhite(p)).length > 1 && (
              <button
                type="button"
                disabled={chosen.some((p) => p.whitening)}
                onClick={() => chosen.forEach((p) => whiten(p.key))}
                className="btn-ghost text-sm"
              >
                Alle Hintergründe weiß
              </button>
            )}
          </div>
        </div>
      )}
      {editingPhoto && <PhotoEditor photo={editingPhoto} picker={picker} onClose={() => setEditing(null)} />}
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
                  src={shown(p)}
                  remote={isRemote(p)}
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
      {/* Ablagefläche: „Bild hierher ziehen, einfügen oder [Aus Dateien]“; der gestrichelte Rahmen nur am Desktop */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-center sm:rounded-lg sm:border sm:border-dashed sm:border-line sm:p-3">
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
        {/* Text und Knopf bleiben in einer Zeile; am Handy bricht eher der Text um */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 text-sm text-muted">
            Bild hierher ziehen, einfügen<span className="hidden sm:inline"> (Strg+V)</span> oder
          </span>
          <label className={`${camera ? "btn-ghost" : "btn-primary"} shrink-0 cursor-pointer`}>
            {camera ? "Aus Galerie" : "Aus Dateien"}
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
      </div>
      {tip && <p className="text-xs text-muted">{tip}</p>}
    </>
  );
}

function WhiteningOverlay({ progress }: { progress: BgProgress }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-bg/75 px-1 text-center text-xs font-medium">
      <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      {progress.stage === "download"
        ? `KI-Modell lädt${progress.percent !== undefined ? ` ${progress.percent} %` : " …"}`
        : `Wird freigestellt${progress.backend === "webgpu" ? " (GPU)" : ""} …`}
    </div>
  );
}

const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };
const isFull = (c: Crop) => c.x < 0.002 && c.y < 0.002 && c.w > 0.998 && c.h > 0.998;

/** Dialog nach Antippen eines Fotos: zuschneiden, spiegeln, Hintergrund weiß */
function PhotoEditor({ photo: p, picker, onClose }: { photo: PhotoEntry; picker: PhotoPickerState; onClose: () => void }) {
  const { whiten, restore, mirror, setCrop } = picker;
  const dialog = useRef<HTMLDialogElement>(null);
  // Zuschnitt, solange man ihn einstellt
  const [draft, setDraft] = useState<Crop | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // Klick auf den abgedunkelten Hintergrund schließt
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),34rem)] overflow-auto rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{draft ? "Zuschneiden" : "Foto bearbeiten"}</h2>
          <button type="button" onClick={close} className={roundBtn} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="flex justify-center">
          {draft ? (
            <CropArea src={baseSrc(p)} remote={p.source.type === "web" && !isWhite(p)} mirrored={!!p.mirrored} crop={draft} onChange={setDraft} />
          ) : (
            <div className="relative w-[min(100%,20rem)]">
              <Photo src={shown(p)} remote={isRemote(p)} lazy={false} className="aspect-[3/4] w-full rounded-lg" />
              {p.whitening && <WhiteningOverlay progress={p.whitening} />}
            </div>
          )}
        </div>
        {p.error && <p className="text-sm text-danger">Fehlgeschlagen: {p.error}</p>}
        {draft ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCrop(p.key, isFull(draft) ? undefined : draft);
                setDraft(null);
              }}
              className="btn-primary"
            >
              Übernehmen
            </button>
            <button type="button" onClick={() => setDraft(null)} className="btn-ghost">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => setDraft(FULL)}
              disabled={isFull(draft)}
              className={`${iconBtn} ml-auto`}
              aria-label="Zuschnitt zurücksetzen"
              title="Zurücksetzen: ganzes Bild"
            >
              <ResetIcon />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(p.crop ?? FULL)}
                className={`${iconBtn} ${p.crop ? "chip-active" : ""}`}
                aria-label="Zuschneiden"
                title={p.crop ? "Zugeschnitten: Ausschnitt ändern" : "Zuschneiden"}
              >
                <CropIcon />
              </button>
              <button
                type="button"
                onClick={() => mirror(p.key)}
                aria-pressed={!!p.mirrored}
                className={`${iconBtn} ${p.mirrored ? "chip-active" : ""}`}
                aria-label="Spiegeln"
                title={p.mirrored ? "Spiegelung aufheben" : "Spiegeln"}
              >
                <MirrorIcon />
              </button>
              <button
                type="button"
                disabled={!!p.whitening}
                onClick={() => (isWhite(p) ? restore(p.key) : whiten(p.key))}
                aria-pressed={isWhite(p)}
                className={`${iconBtn} ${isWhite(p) ? "chip-active" : ""}`}
                aria-label="Hintergrund entfernen"
                title={isWhite(p) ? "Hintergrund entfernt: wieder das unveränderte Foto verwenden" : "Hintergrund per KI entfernen und weiß machen"}
              >
                <EraseBackgroundIcon />
              </button>
              <button type="button" onClick={close} className="btn-primary ml-auto">
                Fertig
              </button>
            </div>
            <p className="text-xs text-muted">
              „Hintergrund entfernen“ stellt das Teil per KI direkt im Browser frei, ohne fremde Dienste. Mit Grafikkarte (WebGPU, nur über HTTPS)
              dauert das wenige Sekunden, sonst je nach Gerät 10–60 Sekunden; beim ersten Mal wird dafür einmalig ein Modell geladen (88 MB).
              Änderungen werden erst mit dem Formular gespeichert.
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}

type Handle = "move" | "nw" | "ne" | "sw" | "se";
const MIN_CROP = 0.08;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const HANDLE_POS: Record<Exclude<Handle, "move">, string> = {
  nw: "-left-[3px] -top-[3px] cursor-nwse-resize",
  ne: "-right-[3px] -top-[3px] cursor-nesw-resize",
  sw: "-left-[3px] -bottom-[3px] cursor-nesw-resize",
  se: "-right-[3px] -bottom-[3px] cursor-nwse-resize",
};

/** Ausschnitt per Ziehen einstellen: Rahmen verschieben, an den Ecken Größe ändern (Maus und Touch) */
function CropArea({
  src,
  remote,
  mirrored,
  crop,
  onChange,
}: {
  src: string;
  remote: boolean;
  mirrored: boolean;
  crop: Crop;
  onChange: (c: Crop) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    handle: Handle;
    x: number;
    y: number;
    start: Crop;
  } | null>(null);

  function onMove(e: ReactPointerEvent) {
    const d = drag.current;
    const r = box.current?.getBoundingClientRect();
    if (!d || !r) return;
    const dx = (e.clientX - d.x) / r.width;
    const dy = (e.clientY - d.y) / r.height;
    const s = d.start;
    if (d.handle === "move")
      return onChange({
        ...s,
        x: clamp(s.x + dx, 0, 1 - s.w),
        y: clamp(s.y + dy, 0, 1 - s.h),
      });
    let { x, y, w, h } = s;
    if (d.handle.includes("w")) {
      x = clamp(s.x + dx, 0, s.x + s.w - MIN_CROP);
      w = s.x + s.w - x;
    } else w = clamp(s.w + dx, MIN_CROP, 1 - s.x);
    if (d.handle.includes("n")) {
      y = clamp(s.y + dy, 0, s.y + s.h - MIN_CROP);
      h = s.y + s.h - y;
    } else h = clamp(s.h + dy, MIN_CROP, 1 - s.y);
    onChange({ x, y, w, h });
  }
  const end = () => {
    drag.current = null;
  };
  function onDown(e: ReactPointerEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      handle: e.currentTarget.dataset.handle as Handle,
      x: e.clientX,
      y: e.clientY,
      start: crop,
    };
  }
  // Ziehbare Teile; welcher Teil es ist, steht in data-handle
  const handlers = {
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: end,
    onPointerCancel: end,
  };

  const cropBox = { left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` };

  return (
    <div ref={box} className="relative touch-none select-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale bzw. Shop-Vorschau, keine Optimierung nötig */}
      <img
        src={src}
        alt=""
        draggable={false}
        referrerPolicy={remote ? "no-referrer" : undefined}
        className={`block max-h-[min(60dvh,28rem)] max-w-full rounded-lg ${mirrored ? "-scale-x-100" : ""}`}
      />
      {/* Abdunkeln außerhalb des Ausschnitts, auf das (abgerundete) Bild begrenzt; der Rahmen liegt darüber und wird nicht abgeschnitten */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg" aria-hidden>
        <div className="absolute" style={{ ...cropBox, boxShadow: "0 0 0 9999px color-mix(in srgb, var(--bg) 72%, transparent)" }} />
      </div>
      <div
        {...handlers}
        data-handle="move"
        className="absolute cursor-move border border-accent"
        // Schwarzer Schatten am Rahmen, damit er auch auf hellen Fotos sichtbar ist
        style={{ ...cropBox, boxShadow: "0 0 3px rgb(0 0 0 / 0.8)" }}
      >
        {/* Drittel-Raster, ebenfalls mit schwarzem Schatten */}
        <div className="pointer-events-none absolute inset-0 drop-shadow-[0_0_1.5px_rgb(0_0_0/0.9)]" aria-hidden>
          <span className="absolute inset-y-0 left-1/3 border-l border-accent/80" />
          <span className="absolute inset-y-0 left-2/3 border-l border-accent/80" />
          <span className="absolute inset-x-0 top-1/3 border-t border-accent/80" />
          <span className="absolute inset-x-0 top-2/3 border-t border-accent/80" />
        </div>
        {/* Ecken: dickere Winkel, mit großer Greiffläche */}
        {(Object.keys(HANDLE_POS) as (keyof typeof HANDLE_POS)[]).map((h) => (
          <span key={h} {...handlers} data-handle={h} className={`absolute size-8 ${HANDLE_POS[h]}`} aria-hidden>
            <span
              className={`pointer-events-none absolute size-4 border-accent drop-shadow-[0_0_2px_rgb(0_0_0/0.9)] ${
                {
                  nw: "left-0 top-0 rounded-tl-md border-l-4 border-t-4",
                  ne: "right-0 top-0 rounded-tr-md border-r-4 border-t-4",
                  sw: "bottom-0 left-0 rounded-bl-md border-b-4 border-l-4",
                  se: "bottom-0 right-0 rounded-br-md border-b-4 border-r-4",
                }[h]
              }`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

const iconBtn =
  "flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2 disabled:opacity-50";

const iconProps = {
  viewBox: "0 0 24 24",
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function CropIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  );
}

function MirrorIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3v18" strokeDasharray="2.5 2.5" strokeLinecap="butt" />
      <path d="M9 6 3 18h6z" fill="currentColor" />
      <path d="m15 6 6 12h-6z" />
    </svg>
  );
}

/** Bild mit Berg links, rechts Schachbrett (= transparenter Hintergrund) */
function EraseBackgroundIcon() {
  return (
    <svg {...iconProps}>
      <defs>
        <clipPath id="erase-bg-clip">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </clipPath>
      </defs>
      <g clipPath="url(#erase-bg-clip)" fill="currentColor" stroke="none">
        <rect x="12" y="3" width="3" height="3" />
        <rect x="18" y="3" width="3" height="3" />
        <rect x="15" y="6" width="3" height="3" />
        <rect x="12" y="9" width="3" height="3" />
        <rect x="18" y="9" width="3" height="3" />
        <rect x="15" y="12" width="3" height="3" />
        <rect x="12" y="15" width="3" height="3" />
        <rect x="18" y="15" width="3" height="3" />
        <rect x="15" y="18" width="3" height="3" />
      </g>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18" />
      <circle cx="7.5" cy="8" r="1.5" />
      <path d="m3 17 4.5-5 4.5 5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg {...iconProps} className="size-4">
      <path d="M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
