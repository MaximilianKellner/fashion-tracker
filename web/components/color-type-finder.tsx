"use client";

import { useState } from "react";
import { COLOR_TYPE_QUESTIONS, colorType } from "@lib/color-type.mjs";
import { label, swatch } from "@/lib/labels";

type Result = NonNullable<ReturnType<typeof colorType>>;
type Question = { label: string; hint: string; options: Record<string, string> };

/**
 * Farbtyp-Test im Profil-Formular: vier Fragen, daraus Farbtyp und Startpalette (scripts/lib/color-type.mjs).
 * „Übernehmen“ gibt das Ergebnis samt Antworten ans Formular, das damit Typ-Felder und Farbpalette füllt.
 */
export function ColorTypeFinder({ onApply }: { onApply: (result: Result, answers: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const result = colorType(answers);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full border-dashed">
        Farbtyp bestimmen: 4 kurze Fragen, danach ist die Palette vorausgefüllt
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface-2/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">
          Am besten bei Tageslicht, ungeschminkt und vor einem Spiegel. Das Ergebnis ist ein Startpunkt, den du danach anpassen kannst.
        </p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Farbtyp-Test schließen" className="text-muted hover:text-ink">
          ×
        </button>
      </div>

      {(Object.entries(COLOR_TYPE_QUESTIONS) as [string, Question][]).map(([k, q]) => (
        <div key={k} role="radiogroup" aria-label={q.label}>
          <span className="block text-sm font-medium">{q.label}</span>
          <span className="mb-1.5 block text-xs text-muted">{q.hint}</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(q.options).map(([value, text]) => {
              const on = answers[k] === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setAnswers((a) => ({ ...a, [k]: value }))}
                  className={`chip ${on ? "chip-active" : ""}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {result ? (
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-sm">
            Du bist wahrscheinlich ein <span className="font-semibold">{result.label}typ</span>: {result.description}.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {result.palette.best.map((c) => (
              <li key={c} title={label(c)} className="h-6 w-6 rounded-full border border-black/15" style={{ backgroundColor: swatch(c) }} />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              onApply(result, answers);
              setOpen(false);
            }}
            className="btn-primary mt-3"
          >
            Palette übernehmen
          </button>
          <p className="mt-1 text-xs text-muted">Ersetzt die drei Farbgruppen unten. Gespeichert wird erst mit „Speichern“.</p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {answers.undertone === "neutral" && answers.chroma
            ? "Bei neutralem Unterton brauche ich noch Helligkeit oder Kontrast."
            : "Beantworte mindestens Unterton und die letzte Frage."}
        </p>
      )}
    </div>
  );
}
