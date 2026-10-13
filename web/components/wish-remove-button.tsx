"use client";

import { useState, useTransition } from "react";

/** Entfernen-Button für offene Wünsche: fragt, ob der Wunsch nur aussortiert (verworfen) oder ganz gelöscht wird */
export function WishRemoveButton({
  discard,
  remove,
  name,
}: {
  discard: () => Promise<void>;
  remove: () => Promise<void>;
  name: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <button type="button" className="btn-ghost py-1.5 text-danger" onClick={() => setAsking(true)}>
        Entfernen
      </button>
    );
  }
  return (
    <div className="w-full rounded-lg border border-line p-2">
      <p className="mb-2 text-sm">„{name}“ entfernen?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} className="btn-ghost py-1.5" onClick={() => startTransition(() => discard())}>
          Auf die Liste der Verworfenen
        </button>
        <button type="button" disabled={pending} className="btn-ghost py-1.5 text-danger" onClick={() => startTransition(() => remove())}>
          Ganz löschen
        </button>
        <button type="button" disabled={pending} className="btn-ghost py-1.5" onClick={() => setAsking(false)}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
