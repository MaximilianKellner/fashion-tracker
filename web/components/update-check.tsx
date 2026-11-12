"use client";

import { useEffect, useState } from "react";
import { checkForUpdate } from "@/app/actions";

// Version, mit der diese Seite gebaut wurde (next.config.ts), wie in update-notice.tsx
const LOADED = process.env.APP_VERSION;
// Während ein Update gebaut wird: so oft nachsehen, ob die neue Version läuft, und höchstens so lange
const POLL_MS = 15_000;
const POLL_MAX_MS = 20 * 60_000;

type State = "idle" | "checking" | "current" | "off" | "error" | "building" | "ready";

const TEXT: Partial<Record<State, string>> = {
  checking: "Suche …",
  current: "Du hast die neueste Version.",
  off: "Automatische Updates sind auf diesem Server aus.",
  error: "Prüfen hat nicht geklappt (offline?).",
  building: "Update gefunden, wird im Hintergrund gebaut. Das dauert ein paar Minuten …",
  ready: "Neue Version ist da.",
};

/** Läuft auf dem Server schon eine andere Version als die, mit der diese Seite geladen wurde? */
async function serverIsNewer() {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return false; // Server startet gerade neu
    const { version } = await res.json();
    return Boolean(LOADED && version && version !== LOADED);
  } catch {
    return false;
  }
}

/**
 * Knopf im Footer: sucht sofort nach neuem Code (statt erst beim nächsten Abgleich nach bis zu 15 Minuten).
 * Mit Auto-Update (CODE_AUTOUPDATE=1) holt der Server ihn und baut im Hintergrund; der Knopf wartet, bis die neue
 * Version läuft, und bietet dann das Neuladen an. Ohne Auto-Update meldet er nur, dass das hier aus ist.
 */
export function UpdateCheck() {
  const [state, setState] = useState<State>("idle");

  async function check() {
    setState("checking");
    // Läuft die neue Version schon (z.B. Tab lange offen)? Dann reicht Neuladen
    if (await serverIsNewer()) return setState("ready");
    try {
      const result = await checkForUpdate();
      setState(result === "new" ? "building" : result);
    } catch {
      // Server startet gerade neu: dann ist vermutlich schon eine neue Version unterwegs
      setState((await serverIsNewer()) ? "ready" : "error");
    }
  }

  // Während des Builds regelmäßig nachsehen, ob die neue Version läuft
  useEffect(() => {
    if (state !== "building") return;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (await serverIsNewer()) setState("ready");
      else if (Date.now() - started > POLL_MAX_MS) setState("error");
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {state === "ready" ? (
        <button type="button" onClick={() => window.location.reload()} className="font-medium text-accent hover:underline">
          Neu laden
        </button>
      ) : (
        <button
          type="button"
          onClick={check}
          disabled={state === "checking" || state === "building"}
          className="underline underline-offset-2 hover:text-ink disabled:no-underline disabled:opacity-60"
        >
          Nach Updates suchen
        </button>
      )}
      {LOADED && <span title="Version dieser Seite (Git-Commit)">· Version {LOADED}</span>}
      {TEXT[state] && (
        <span role="status" className="basis-full text-center">
          {TEXT[state]}
        </span>
      )}
    </div>
  );
}
