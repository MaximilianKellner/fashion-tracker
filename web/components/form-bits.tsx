import type { ReactNode } from "react";

export function Field({ label, children, hint, auto }: { label: string; children: ReactNode; hint?: string; auto?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        {label}
        {auto && <AutoBadge />}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Markiert ein automatisch vorgeschlagenes Feld (aus Name, Shop-Daten oder Unterkategorie) */
export function AutoBadge() {
  return (
    <span title="Automatisch vorgeschlagen, bitte prüfen" className="rounded-full bg-surface-2 px-1.5 py-px text-[10px] font-normal text-muted">
      Vorschlag
    </span>
  );
}

export function Errors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
      <ul className="list-inside list-disc">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}
