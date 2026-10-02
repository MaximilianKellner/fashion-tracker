"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { saveItem } from "@/app/actions";
import { CATEGORIES, ITEM_STATUS, PATTERNS, SEASONS } from "@lib/schema.mjs";
import { FORMALITY, label } from "@/lib/labels";
import type { ItemData } from "@/lib/types";
import { Errors, Field, Section } from "./form-bits";

type Props = {
  id?: string;
  data?: Partial<ItemData>;
  body?: string;
  fromWish?: string;
  colorSuggestions: string[];
};

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

export function ItemForm({ id, data = {}, body = "", fromWish, colorSuggestions }: Props) {
  const [state, formAction, pending] = useActionState(saveItem, null);
  // Neue Fotos samt Vorschau-URL; URLs werden beim Entfernen bzw. Verlassen der Seite freigegeben
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [preparing, setPreparing] = useState(false);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []).map((file) => ({ file, url: URL.createObjectURL(file) }));
    picked.forEach((p) => urls.current.add(p.url));
    setFiles((f) => [...f, ...picked]);
  }

  function removeFile(url: string) {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
    setFiles((f) => f.filter((x) => x.url !== url));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Eigenes Submit statt <form action>, damit das Formular bei Validierungsfehlern nicht geleert wird
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    setPreparing(true);
    for (const { file } of files) fd.append("photos", await downscale(file), file.name);
    setPreparing(false);
    startTransition(() => formAction(fd));
  }

  const busy = pending || preparing;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      {fromWish && <input type="hidden" name="fromWish" value={fromWish} />}

      <Section title="Fotos">
        {id && !!data.photos?.length && (
          <div className="flex flex-wrap gap-3">
            {data.photos.map((p) => (
              <label key={p} className="relative block w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/photos/${id}/${p}`} alt="" className="aspect-[3/4] w-24 rounded-lg object-cover" />
                <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" name="removePhotos" value={p} /> entfernen
                </span>
              </label>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {files.map(({ url }) => (
              <div key={url} className="relative w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[3/4] w-24 rounded-lg object-cover" />
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
          <label className="btn-ghost cursor-pointer">
            Aus Galerie
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
        <p className="text-xs text-muted">Tipp: Teil flach vor neutralem Hintergrund bei Tageslicht fotografieren. Ein Foto vom Etikett hilft Claude bei Marke und Material.</p>
      </Section>

      <Section title="Grunddaten">
        <Field label="Name *">
          <input name="name" required defaultValue={data.name} placeholder="z. B. Navy Chino" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategorie *">
            <select name="category" required defaultValue={data.category ?? ""} className="field">
              <option value="" disabled>
                wählen …
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {label(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unterkategorie">
            <input name="subcategory" defaultValue={data.subcategory} placeholder="chino, hemd, sneaker …" className="field" />
          </Field>
        </div>
        <Field label="Farben *" hint="Hauptfarbe zuerst, mit Komma getrennt">
          <input
            name="colors"
            required
            list="color-suggestions"
            defaultValue={data.colors?.join(", ")}
            placeholder="navy, weiss"
            className="field"
          />
          <datalist id="color-suggestions">
            {colorSuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Muster">
            <select name="pattern" defaultValue={data.pattern ?? ""} className="field">
              <option value="">–</option>
              {PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Material">
            <input name="material" defaultValue={data.material} placeholder="baumwolle" className="field" />
          </Field>
        </div>
      </Section>

      <Section title="Passform & Einsatz">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Marke">
            <input name="brand" defaultValue={data.brand} className="field" />
          </Field>
          <Field label="Größe">
            <input name="size" defaultValue={data.size} placeholder="M, 32/32" className="field" />
          </Field>
          <Field label="Schnitt">
            <input name="fit" defaultValue={data.fit} placeholder="slim" className="field" />
          </Field>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Saisons</span>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <label key={s} className="chip cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink">
                <input type="checkbox" name="seasons" value={s} defaultChecked={data.seasons?.includes(s)} className="sr-only" />
                {label(s)}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Formalität">
            <select name="formality" defaultValue={data.formality ?? ""} className="field">
              <option value="">–</option>
              {Object.entries(FORMALITY).map(([n, l]) => (
                <option key={n} value={n}>
                  {n} · {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={data.status ?? "aktiv"} className="field">
              {ITEM_STATUS.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tags" hint="Mit Komma getrennt, z. B. lieblingsteil, buero">
          <input name="tags" defaultValue={data.tags?.join(", ")} className="field" />
        </Field>
      </Section>

      <Section title="Kauf">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Datum">
            <input name="purchaseDate" type="month" defaultValue={data.purchase?.date?.slice(0, 7)} className="field" />
          </Field>
          <Field label="Preis (€)">
            <input name="purchasePrice" inputMode="decimal" defaultValue={data.purchase?.price} placeholder="39,90" className="field" />
          </Field>
          <Field label="Shop">
            <input name="purchaseShop" defaultValue={data.purchase?.shop} className="field" />
          </Field>
        </div>
      </Section>

      <Section title="Notizen">
        <textarea
          name="body"
          rows={4}
          defaultValue={body}
          placeholder="Passform, Pflege, womit es gut aussieht …"
          className="field"
        />
      </Section>

      <Errors errors={state?.errors} />

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <button type="submit" disabled={busy} className="btn-primary w-full py-3 shadow-lg">
          {preparing ? "Fotos werden vorbereitet …" : pending ? "Speichern …" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
