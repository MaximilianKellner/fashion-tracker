"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "@/components/icons";

/**
 * Papierkorb-Icon mit Bestätigung als Popup in der Bildschirmmitte. <dialog> mit showModal() liegt in der obersten
 * Ebene des Browsers, das Popup erscheint also über der Seite und nicht in der Karte, auch wenn der Button darin sitzt.
 */
export function TrashButton({ name, action }: { name: string; action: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn-ghost px-2.5 py-1.5 text-danger"
        title="In den Papierkorb"
        aria-label="In den Papierkorb"
        onClick={() => dialog.current?.showModal()}
      >
        <Trash2 className="size-4" />
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 text-ink backdrop:bg-black/60"
      >
        <h2 className="text-lg font-semibold">In den Papierkorb?</h2>
        <p className="mt-2 text-sm text-muted">
          „{name}“ liegt 30 Tage im Papierkorb und kann bis dahin wiederhergestellt werden. Danach wird der Wunsch beim
          nächsten Build endgültig gelöscht.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={pending} onClick={() => dialog.current?.close()}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await action();
                dialog.current?.close();
              })
            }
          >
            Papierkorb
          </button>
        </div>
      </dialog>
    </>
  );
}
