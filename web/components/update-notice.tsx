"use client";

import { useEffect, useState } from "react";

// Version, mit der diese Seite gebaut wurde (next.config.ts)
const LOADED = process.env.APP_VERSION;
// Abfragen nur bei Benutzung (Tab kommt in den Vordergrund) und höchstens so oft
const CHECK_GAP_MS = 30 * 60_000;
// Tag (JJJJ-MM-TT), an dem der Hinweis zuletzt kam; pro Browser, damit er höchstens einmal am Tag erscheint
const SHOWN_KEY = "update-notice-shown";

const today = () => new Date().toLocaleDateString("sv"); // JJJJ-MM-TT in Ortszeit
const shownToday = () => {
  try {
    return localStorage.getItem(SHOWN_KEY) === today();
  } catch {
    return false;
  }
};
const markShown = () => {
  try {
    localStorage.setItem(SHOWN_KEY, today());
  } catch {
    // privater Modus o.ä.: dann eben ohne Merken
  }
};

/**
 * Hinweis unten, wenn auf dem Server inzwischen eine neuere Version läuft (z.B. nach dem automatischen Code-Update).
 * Ein Tab, der davor geöffnet wurde, läuft sonst mit altem Code weiter, und Speichern kann fehlschlagen.
 * Kommt höchstens einmal am Tag; geprüft wird nur, wenn die Website benutzt wird, nicht im Hintergrund.
 */
export function UpdateNotice() {
  const [outdated, setOutdated] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!LOADED || outdated) return;
    let busy = false;
    let lastCheck = Date.now(); // Die Seite wurde gerade geladen, ist also aktuell
    async function check() {
      if (busy || document.visibilityState !== "visible" || Date.now() - lastCheck < CHECK_GAP_MS || shownToday()) return;
      busy = true;
      lastCheck = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        // Während des Neustarts antwortet der Server kurz nicht; dann beim nächsten Mal wieder versuchen
        if (res.ok) {
          const { version } = await res.json();
          if (version && version !== LOADED) {
            markShown();
            setOutdated(true);
          }
        }
      } catch {
        // offline oder Server startet neu
      } finally {
        busy = false;
      }
    }
    // Wenn der Tab wieder in den Vordergrund kommt (z.B. Handy entsperrt)
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [outdated]);

  if (!outdated || hidden) return null;
  return (
    <div
      role="status"
      // Am Handy über der Navigationsleiste
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface p-3 text-sm shadow-lg sm:bottom-4"
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium">Neue Version verfügbar.</span> Neu laden, um sie zu nutzen.
      </span>
      <button type="button" onClick={() => window.location.reload()} className="btn-primary shrink-0 py-1.5">
        Neu laden
      </button>
      <button type="button" onClick={() => setHidden(true)} aria-label="Hinweis schließen" className="shrink-0 px-1 text-lg leading-none text-muted hover:text-ink">
        ×
      </button>
    </div>
  );
}
