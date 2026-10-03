"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { COLORS, mapColors, suggestColors } from "@lib/colors.mjs";
import { label, swatch } from "@/lib/labels";

/**
 * Farbauswahl: Palette zum Anklicken plus Eingabefeld mit Vorschlägen (auch über Synonyme wie "plum" -> Pflaume).
 * Die erste Farbe ist die Hauptfarbe. Schickt die Auswahl als kommagetrenntes Feld `name` mit.
 */
export function ColorPicker({
  name,
  defaultValue = [],
  extra = [],
  ranked = true,
}: {
  name: string;
  defaultValue?: string[];
  extra?: string[];
  /** false: alle Farben gleichrangig, ohne Hauptfarbe (z. B. Farbpalette im Profil) */
  ranked?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(defaultValue.length === 0);

  // Vorschläge: bekannte Farben und Synonyme, dazu eigene Farben aus dem Kleiderschrank, die nicht in der Palette sind
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const custom = extra.filter((c) => !COLORS.some((k) => k.id === c) && c.includes(q));
    return [...new Set([...suggestColors(query), ...custom])].filter((c) => !selected.includes(c)).slice(0, 6);
  }, [query, extra, selected]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const makeMain = (id: string) => setSelected((s) => [id, ...s.filter((x) => x !== id)]);

  function add(ids: string[]) {
    setSelected((s) => [...s, ...ids.filter((id) => !s.includes(id))]);
    setQuery("");
    setActive(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = suggestions.length;
      if (n) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter" || e.key === ",") {
      if (!query.trim()) return;
      e.preventDefault(); // Enter soll nicht das Formular abschicken
      // Vorschlag übernehmen, sonst Freitext übersetzen ("dunkelgrün" -> dunkelgruen, eigene Namen als Slug)
      add(suggestions[active] ? [suggestions[active]] : mapColors(query));
    } else if (e.key === "Backspace" && !query && selected.length) {
      setSelected((s) => s.slice(0, -1));
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(", ")} />

      <div className="field flex min-h-11 flex-wrap items-center gap-1.5 py-1.5">
        {selected.map((c, i) => (
          <span key={c} className={`chip py-0.5 ${ranked && i === 0 ? "border-accent" : ""}`}>
            <button
              type="button"
              onClick={() => ranked && makeMain(c)}
              title={ranked ? (i === 0 ? "Hauptfarbe" : "Zur Hauptfarbe machen") : undefined}
              className="flex items-center gap-1.5"
            >
              <span className="h-3 w-3 rounded-full border border-black/15" style={{ backgroundColor: swatch(c) }} />
              {label(c)}
              {ranked && i === 0 && selected.length > 1 && <span className="text-[10px] text-muted">Haupt</span>}
            </button>
            <button type="button" onClick={() => toggle(c)} aria-label={`${label(c)} entfernen`} className="text-muted hover:text-ink">
              ×
            </button>
          </span>
        ))}
        <div className="relative min-w-32 flex-1">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={selected.length ? "weitere Farbe …" : "Farbe tippen, z. B. plum, navy …"}
            className="w-full bg-transparent py-1 text-base outline-none"
            aria-label="Farbe suchen"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={`${name}-suggestions`}
          />
          {suggestions.length > 0 && (
            <ul id={`${name}-suggestions`} role="listbox" className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
              {suggestions.map((c, i) => (
                <li key={c} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // Fokus im Eingabefeld behalten
                    onClick={() => add([c])}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? "bg-surface-2" : ""}`}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/15" style={{ backgroundColor: swatch(c) }} />
                    {label(c)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button type="button" onClick={() => setPaletteOpen((o) => !o)} className="mt-2 text-sm text-muted underline">
        {paletteOpen ? "Farbpalette ausblenden" : "Farbpalette anzeigen"}
      </button>
      {paletteOpen && (
        <div className="mt-2 grid grid-cols-5 gap-x-1 gap-y-2 sm:grid-cols-8">
          {COLORS.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                className="flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] hover:bg-surface-2"
              >
                <span
                  className={`h-7 w-7 rounded-full border ${on ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-surface" : "border-black/15"}`}
                  style={{ backgroundColor: c.hex }}
                />
                <span className={on ? "font-medium text-ink" : "text-muted"}>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
