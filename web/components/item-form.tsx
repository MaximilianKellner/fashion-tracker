"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { saveItem } from "@/app/actions";
import { CATEGORIES, ITEM_STATUS, PATTERNS, SEASONS, SUBCATEGORIES, normalizeDate } from "@lib/schema.mjs";
import { guessDefaults, guessFromText } from "@lib/item-guess.mjs";
import { FORMALITY, formatPriceInput, label } from "@/lib/labels";
import type { ItemData } from "@/lib/types";
import { ColorPicker } from "./color-picker";
import { PhotoPicker, usePhotoPicker } from "./photo-picker";
import { AutoBadge, Errors, Field, Section } from "./form-bits";

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

// Felder, die das Formular aus Name, Unterkategorie und Material vorschlagen kann
type Values = {
  category: string;
  subcategory: string;
  colors: string[];
  pattern: string;
  material: string;
  fit: string;
  formality: string;
  seasons: string[];
};
type Key = keyof Values;
// Aus den übrigen Feldern abgeleitet: bleiben Vorschlag, bis man sie selbst ändert, auch wenn der Shop-Import sie schon setzt
const DERIVED: Key[] = ["pattern", "formality", "seasons"];

const isEmpty = (v: string | string[]) => v.length === 0;
const subcategoriesOf = (category: string): Record<string, string> =>
  (SUBCATEGORIES as Record<string, Record<string, string>>)[category] ?? {};

/**
 * Was das Formular anzeigt: eigene Werte bleiben, leere bzw. noch nicht angefasste Felder bekommen einen Vorschlag
 * aus dem Namen (Kategorie, Farben, Material …) und daraus abgeleitet Formalität, Saisons und Muster.
 */
function withSuggestions(name: string, values: Values, own: Set<Key>) {
  const shown = { ...values };
  const auto = new Set<Key>();
  const take = <K extends Key>(key: K, value: Values[K] | undefined) => {
    if (own.has(key) || value === undefined || isEmpty(value)) return;
    shown[key] = value;
    auto.add(key);
  };

  const found = guessFromText(name);
  take("category", found.category);
  if (found.subcategory && subcategoriesOf(shown.category)[found.subcategory]) take("subcategory", found.subcategory);
  take("colors", found.colors);
  take("material", found.material);
  take("fit", found.fit);
  take("pattern", found.pattern);

  const defaults = guessDefaults({ ...shown, name });
  if (!shown.pattern) take("pattern", defaults.pattern);
  take("formality", defaults.formality ? String(defaults.formality) : undefined);
  take("seasons", defaults.seasons);
  return { shown, auto };
}

export function ItemForm({ id, data = {}, body = "", fromWish, colorSuggestions, importedPhotos = [], wishPhotos = [] }: Props) {
  const [state, formAction, pending] = useActionState(saveItem, null);
  const picker = usePhotoPicker(importedPhotos);

  const [name, setName] = useState(data.name ?? "");
  const [values, setValues] = useState<Values>(() => ({
    category: data.category ?? "",
    subcategory: data.subcategory ?? "",
    colors: data.colors ?? [],
    pattern: data.pattern ?? "",
    material: data.material ?? "",
    fit: data.fit ?? "",
    formality: data.formality ? String(data.formality) : "",
    seasons: data.seasons ?? [],
  }));
  // Felder mit eigenem Wert werden nie automatisch überschrieben: beim Bearbeiten alles Gespeicherte,
  // bei neuen Teilen, was Shop oder Wunschliste geliefert haben (außer den abgeleiteten Feldern), und alles von Hand Geänderte
  const [own, setOwn] = useState<Set<Key>>(
    () => new Set((Object.keys(values) as Key[]).filter((k) => !isEmpty(values[k]) && (id || !DERIVED.includes(k)))),
  );
  const { shown, auto } = useMemo(() => withSuggestions(name, values, own), [name, values, own]);

  function set<K extends Key>(key: K, value: Values[K], extra: Partial<Values> = {}) {
    setValues((v) => ({ ...v, ...extra, [key]: value }));
    setOwn((o) => {
      const next = new Set(o).add(key);
      for (const k of Object.keys(extra) as Key[]) next.delete(k); // zurückgesetzte Felder dürfen wieder vorgeschlagen werden
      return next;
    });
  }

  const subOptions = subcategoriesOf(shown.category);

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
        <Field
          label="Name *"
          hint={id ? undefined : "Aus dem Namen werden Kategorie, Farben, Material, Formalität und Saisons vorgeschlagen (markiert mit „Vorschlag“)."}
        >
          <input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Navy Leinenhemd" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategorie *" auto={auto.has("category")}>
            <select
              name="category"
              required
              value={shown.category}
              onChange={(e) => set("category", e.target.value, { subcategory: "" })}
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
          <Field label="Unterkategorie" auto={auto.has("subcategory")}>
            <select
              name="subcategory"
              value={shown.subcategory}
              onChange={(e) => set("subcategory", e.target.value)}
              disabled={!shown.category}
              className="field"
            >
              <option value="">{shown.category ? "keine" : "erst Kategorie wählen"}</option>
              {Object.entries(subOptions).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
              {/* Alter Freitext-Wert, der nicht in der Liste steht: anzeigen, damit er beim Speichern nicht verloren geht */}
              {shown.subcategory && !subOptions[shown.subcategory] && <option value={shown.subcategory}>{shown.subcategory}</option>}
            </select>
          </Field>
        </div>
        <div>
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            Farben *{auto.has("colors") && <AutoBadge />}
          </span>
          <ColorPicker name="colors" value={shown.colors} onChange={(c) => set("colors", c)} extra={colorSuggestions} />
          <span className="mt-1 block text-xs text-muted">Die erste Farbe ist die Hauptfarbe. Klick auf eine gewählte Farbe macht sie zur Hauptfarbe.</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Muster" auto={auto.has("pattern")}>
            <select name="pattern" value={shown.pattern} onChange={(e) => set("pattern", e.target.value)} className="field">
              <option value="">–</option>
              {PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Material" auto={auto.has("material")}>
            <input name="material" value={shown.material} onChange={(e) => set("material", e.target.value)} placeholder="baumwolle" className="field" />
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
          <Field label="Schnitt" auto={auto.has("fit")}>
            <input name="fit" value={shown.fit} onChange={(e) => set("fit", e.target.value)} placeholder="relaxed" className="field" />
          </Field>
        </div>
        <div>
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            Saisons{auto.has("seasons") && <AutoBadge />}
          </span>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <label key={s} className="chip cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink">
                <input
                  type="checkbox"
                  name="seasons"
                  value={s}
                  checked={shown.seasons.includes(s)}
                  onChange={(e) =>
                    set("seasons", e.target.checked ? SEASONS.filter((x) => x === s || shown.seasons.includes(x)) : shown.seasons.filter((x) => x !== s))
                  }
                  className="sr-only"
                />
                {label(s)}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Formalität" auto={auto.has("formality")}>
            <select name="formality" value={shown.formality} onChange={(e) => set("formality", e.target.value)} className="field">
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
