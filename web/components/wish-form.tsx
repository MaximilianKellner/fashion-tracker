"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { saveWish } from "@/app/actions";
import { CATEGORIES, WISHLIST_STATUS } from "@lib/schema.mjs";
import { formatPriceInput, label, PRIORITY } from "@/lib/labels";
import type { WishData } from "@/lib/types";
import { Errors, Field, Section } from "./form-bits";
import { PhotoPicker, usePhotoPicker } from "./photo-picker";

export function WishForm({
  id,
  data = {},
  body = "",
  importedPhotos = [],
}: {
  id?: string;
  data?: Partial<WishData>;
  body?: string;
  /** Produktbilder aus dem Shop-Import, werden beim Speichern vom Server heruntergeladen */
  importedPhotos?: string[];
}) {
  const [state, formAction, pending] = useActionState(saveWish, null);
  const picker = usePhotoPicker(importedPhotos);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await picker.appendTo(fd);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      <Section title="Bilder">
        <PhotoPicker
          picker={picker}
          camera={false}
          existing={id ? (data.photos ?? []).map((p) => ({ name: p, src: `/wish-photos/${id}/${p}` })) : []}
          tip="Tipp: Produktbild aus dem Shop-Tab hierher ziehen, einen Screenshot einfügen (Strg+V) oder ein Foto aus dem Laden hochladen."
        />
      </Section>

      <Section title="Wunsch">
        <Field label="Name *">
          <input name="name" required defaultValue={data.name} placeholder="z. B. Dunkelgrüner Merino-Pullover" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategorie">
            <select name="category" defaultValue={data.category ?? ""} className="field">
              <option value="">–</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {label(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preis (€)">
            <input name="price" inputMode="decimal" defaultValue={formatPriceInput(data.price)} placeholder="39,90" className="field" />
          </Field>
        </div>
        <Field label="Link">
          <input name="link" type="url" defaultValue={data.link} placeholder="https://…" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priorität">
            <select name="priority" defaultValue={data.priority ?? 2} className="field">
              {Object.entries(PRIORITY).map(([n, l]) => (
                <option key={n} value={n}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={data.status ?? "offen"} className="field">
              {WISHLIST_STATUS.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Welche Lücke schließt es?">
          <input name="fills_gap" defaultValue={data.fills_gap} placeholder="warme Schicht fürs Büro" className="field" />
        </Field>
        <Field label="Warum?">
          <input name="reason" defaultValue={data.reason} className="field" />
        </Field>
        <Field label="Notizen">
          <textarea name="body" rows={3} defaultValue={body} className="field" />
        </Field>
      </Section>

      <Errors errors={state?.errors} />

      <button type="submit" disabled={pending || picker.preparing} className="btn-primary w-full py-3">
        {picker.preparing ? "Bilder werden vorbereitet …" : pending ? "Speichern …" : "Speichern"}
      </button>
    </form>
  );
}
