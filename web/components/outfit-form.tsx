"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { saveOutfit } from "@/app/actions";
import { CATEGORIES, OUTFIT_SOURCES, SEASONS } from "@lib/schema.mjs";
import { label } from "@/lib/labels";
import type { Item, OutfitData } from "@/lib/types";
import { Errors, Field, Section } from "./form-bits";
import { Photo } from "./photo";

type Props = { id?: string; data?: Partial<OutfitData>; body?: string; items: Item[] };

export function OutfitForm({ id, data = {}, body = "", items }: Props) {
  const [state, formAction, pending] = useActionState(saveOutfit, null);
  const [selected, setSelected] = useState<string[]>(data.items ?? []);
  const [category, setCategory] = useState<string | null>(null);

  const visible = useMemo(
    () => items.filter((i) => (i.data.status === "aktiv" || selected.includes(i.id)) && (!category || i.data.category === category)),
    [items, category, selected],
  );
  const byId = new Map(items.map((i) => [i.id, i]));

  function toggle(itemId: string) {
    setSelected((s) => (s.includes(itemId) ? s.filter((x) => x !== itemId) : [...s, itemId]));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const itemId of selected) fd.append("items", itemId);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}

      <Section title={`Teile (${selected.length} ausgewählt)`}>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => {
              const item = byId.get(s);
              return (
                <button key={s} type="button" onClick={() => toggle(s)} className="chip chip-active">
                  {item?.data.name ?? s} ×
                </button>
              );
            })}
          </div>
        )}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => setCategory(null)} className={`chip shrink-0 ${!category ? "chip-active" : ""}`}>
            Alle
          </button>
          {CATEGORIES.filter((c) => items.some((i) => i.data.category === c)).map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={`chip shrink-0 ${category === c ? "chip-active" : ""}`}>
              {label(c)}
            </button>
          ))}
        </div>
        <div className="grid max-h-[28rem] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {visible.map((item) => {
            const on = selected.includes(item.id);
            const photo = item.data.photos?.[0];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={on}
                className={`overflow-hidden rounded-lg border-2 text-left ${on ? "border-accent" : "border-transparent"}`}
              >
                <div className="aspect-[3/4] bg-surface-2">
                  {photo && <Photo src={`/photos/${item.id}/${photo}`} className="h-full w-full" />}
                </div>
                <div className="truncate px-1 py-1 text-xs">{item.data.name}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Details">
        <Field label="Name *">
          <input name="name" required defaultValue={data.name} placeholder="z. B. Büro Herbst" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Anlass">
            <input name="occasion" defaultValue={data.occasion} placeholder="buero, date, freizeit" className="field" />
          </Field>
          <Field label="Bewertung">
            <select name="rating" defaultValue={data.rating ?? ""} className="field">
              <option value="">–</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
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
        <Field label="Zusammengestellt von">
          <select name="source" defaultValue={data.source ?? "ich"} className="field">
            {OUTFIT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notizen">
          <textarea name="body" rows={3} defaultValue={body} className="field" />
        </Field>
      </Section>

      <Errors errors={state?.errors} />

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <button type="submit" disabled={pending} className="btn-primary w-full py-3 shadow-lg">
          {pending ? "Speichern …" : "Outfit speichern"}
        </button>
      </div>
    </form>
  );
}
