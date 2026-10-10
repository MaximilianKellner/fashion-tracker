"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveProfile } from "@/app/actions";
import { APPEARANCE, MEASUREMENTS, PALETTE, SIZES } from "@lib/schema.mjs";
import type { ProfileData } from "@/lib/types";
import { BodyChart } from "./body-chart";
import { ColorPicker } from "./color-picker";
import { Errors, Field, Section } from "./form-bits";

const toNumber = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

export function ProfileForm({ data, body }: { data: ProfileData; body: string }) {
  const [state, action, pending] = useActionState(saveProfile, null);
  // Eingaben live in der Grafik zeigen
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.keys(MEASUREMENTS).map((k) => [k, data.measurements?.[k]?.toString().replace(".", ",") ?? ""])),
  );
  const [height, setHeight] = useState(data.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(data.weight_kg?.toString() ?? "");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  const measurements = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, toNumber(v)]));
  const entries = Object.entries(MEASUREMENTS) as [string, { label: string; hint: string }][];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Errors errors={state?.errors} />

      <Section title="Körper">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Größe (cm)">
            <input name="height_cm" inputMode="decimal" className="field" value={height} onChange={(e) => setHeight(e.target.value)} />
          </Field>
          <Field label="Gewicht (kg)">
            <input name="weight_kg" inputMode="decimal" className="field" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Geburtsdatum">
            <input name="birthdate" type="date" className="field" defaultValue={data.birthdate ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Typ">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(APPEARANCE) as [string, { label: string; hint: string }][]).map(([k, { label, hint }]) => (
            <Field key={k} label={label}>
              <input name={`a_${k}`} className="field" placeholder={hint} defaultValue={data.appearance?.[k] ?? ""} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Farbpalette">
        {(Object.entries(PALETTE) as [string, { label: string; hint: string }][]).map(([k, { label, hint }]) => (
          <div key={k}>
            <span className="mb-1 block text-sm font-medium">{label}</span>
            <ColorPicker name={`p_${k}`} defaultValue={data.palette?.[k] ?? []} ranked={false} />
            <span className="mt-1 block text-xs text-muted">{hint}</span>
          </div>
        ))}
      </Section>

      <Section title="Körpermaße in cm">
        <p className="text-sm text-muted">Tippe auf ein Maß in der Grafik, um es einzutragen.</p>
        <BodyChart
          measurements={measurements}
          heightCm={toNumber(height)}
          weightKg={toNumber(weight)}
          onPick={(k) => document.getElementById(`m_${k}`)?.focus()}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {entries.map(([k, { label, hint }]) => (
            <Field key={k} label={label} hint={hint}>
              <input
                id={`m_${k}`}
                name={`m_${k}`}
                inputMode="decimal"
                className="field"
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Größen">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.entries(SIZES) as [string, { label: string; hint: string }][]).map(([k, { label, hint }]) => (
            <Field key={k} label={label}>
              <input name={`s_${k}`} className="field" placeholder={hint} defaultValue={data.sizes?.[k] ?? ""} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Stil, Anlässe, Einkaufen">
        <Field label="Text (Markdown)" hint="Claude liest diesen Text vor jeder Empfehlung. Überschriften mit ##, Listen mit -.">
          <textarea name="body" rows={18} className="field font-mono text-sm" defaultValue={body} />
        </Field>
      </Section>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Speichert …" : "Speichern"}
        </button>
        <Link href="/profile" className="btn-ghost">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
