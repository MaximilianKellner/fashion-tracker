"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveItem } from "@/app/actions";
import { CATEGORIES, ITEM_STATUS, PATTERNS, SEASONS, SUBCATEGORIES, normalizeDate } from "@lib/schema.mjs";
import { FORMALITY, formatPriceInput, label } from "@/lib/labels";
import type { ItemData } from "@/lib/types";
import { ColorPicker } from "./color-picker";
import { PhotoPicker, usePhotoPicker } from "./photo-picker";
import { Errors, Field, Section } from "./form-bits";

type Props = {
  id?: string;
  data?: Partial<ItemData>;
  body?: string;
  fromWish?: string;
  colorSuggestions: string[];
  /** Produktbilder aus dem Shop-Import, werden beim Speichern vom Server heruntergeladen */
  importedPhotos?: string[];
  /** Fotos des Wunsches, aus dem das Teil gekauft wurde (werden auf Wunsch übernommen) */
  wishPhotos?: string[];
};

export function ItemForm({ id, data = {}, body = "", fromWish, colorSuggestions, importedPhotos = [], wishPhotos = [] }: Props) {
  const [state, formAction, pending] = useActionState(saveItem, null);
  const picker = usePhotoPicker(importedPhotos);
  const [category, setCategory] = useState(data.category ?? "");
  const [subcategory, setSubcategory] = useState(data.subcategory ?? "");
  const subOptions: Record<string, string> = (SUBCATEGORIES as Record<string, Record<string, string>>)[category] ?? {};

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Eigenes Submit statt <form action>, damit das Formular bei Validierungsfehlern nicht geleert wird
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await picker.appendTo(fd);
    startTransition(() => formAction(fd));
  }

  const busy = pending || picker.preparing;
  const preparing = picker.preparing;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      {fromWish && <input type="hidden" name="fromWish" value={fromWish} />}

      <Section title="Fotos">
        <PhotoPicker
          picker={picker}
          existing={id ? (data.photos ?? []).map((p) => ({ name: p, src: `/photos/${id}/${p}` })) : []}
          carried={wishPhotos.map((p) => ({ name: p, src: `/wish-photos/${fromWish}/${p}`, field: "wishPhotos" }))}
          tip="Tipp: Teil flach vor neutralem Hintergrund bei Tageslicht fotografieren. Ein Foto vom Etikett hilft Claude bei Marke und Material."
        />
      </Section>

      <Section title="Grunddaten">
        <Field label="Name *">
          <input name="name" required defaultValue={data.name} placeholder="z. B. Navy Chino" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategorie *">
            <select
              name="category"
              required
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
              className="field"
            >
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
            <select
              name="subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!category}
              className="field"
            >
              <option value="">{category ? "keine" : "erst Kategorie wählen"}</option>
              {Object.entries(subOptions).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
              {/* Alter Freitext-Wert, der nicht in der Liste steht: anzeigen, damit er beim Speichern nicht verloren geht */}
              {subcategory && !subOptions[subcategory] && <option value={subcategory}>{subcategory}</option>}
            </select>
          </Field>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Farben *</span>
          <ColorPicker name="colors" defaultValue={data.colors} extra={colorSuggestions} />
          <span className="mt-1 block text-xs text-muted">Die erste Farbe ist die Hauptfarbe. Klick auf eine gewählte Farbe macht sie zur Hauptfarbe.</span>
        </div>
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
            <input name="purchaseDate" type="date" defaultValue={normalizeDate(data.purchase?.date) ?? ""} className="field" />
          </Field>
          <Field label="Preis (€)">
            <input name="purchasePrice" inputMode="decimal" defaultValue={formatPriceInput(data.purchase?.price)} placeholder="39,90" className="field" />
          </Field>
          <Field label="Shop">
            <input name="purchaseShop" defaultValue={data.purchase?.shop} className="field" />
          </Field>
        </div>
        <Field label="Produkt-Link">
          <input name="link" type="url" defaultValue={data.link} placeholder="https://…" className="field" />
        </Field>
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
