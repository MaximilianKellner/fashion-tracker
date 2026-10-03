"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { askQuestion } from "@/app/actions";
import { TOPICS } from "@/lib/labels";
import { Errors } from "./form-bits";

/** Frage an den Stilberater: landet als Datei in recommendations/ und wird von Claude im Repo beantwortet */
export function QuestionForm() {
  const [state, action, pending] = useActionState(askQuestion, null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <Errors errors={state?.errors} />
      <label className="block">
        <span className="mb-1 block font-medium">Frage an Claude</span>
        <textarea
          name="question"
          rows={3}
          required
          className="field"
          placeholder="z. B. Was ziehe ich am Freitag zu einem Abendessen mit Kollegen an?"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <select name="topic" className="field w-auto" defaultValue="">
          <option value="">Thema (optional)</option>
          {Object.entries(TOPICS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Wird gespeichert …" : "Frage stellen"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Claude beantwortet offene Fragen, sobald du im Repo <code>/empfehlungen</code> ausführst. Die Antwort erscheint dann hier.
      </p>
    </form>
  );
}
