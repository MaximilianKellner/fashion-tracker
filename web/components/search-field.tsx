"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { Search as SearchIcon, X } from "@/components/icons";

/** Suchfeld (Feld `q`) mit Vorschlägen im Stil der Seite; ein gewählter Vorschlag schickt das Formular gleich ab */
export function SearchField({ defaultValue = "", suggestions }: { defaultValue?: string; suggestions: string[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // -1: nichts gewählt, Enter sucht den getippten Text

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 6);
  }, [query, suggestions]);
  const shown = open && matches.length > 0;

  function pick(s: string) {
    flushSync(() => {
      setQuery(s);
      setOpen(false);
    });
    input.current?.form?.requestSubmit();
  }

  /** Feld leeren; war schon gesucht, gleich ohne Suche neu laden, sonst nur den Fokus zurück ins Feld */
  function clear() {
    flushSync(() => {
      setQuery("");
      setOpen(false);
    });
    if (defaultValue) input.current?.form?.requestSubmit();
    else input.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!shown) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = matches.length;
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a <= 0 ? n : a) - 1));
    } else if (e.key === "Enter" && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        type="search"
        name="q"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        placeholder="Suchen …"
        autoComplete="off"
        // Eigenes ✕ statt des Browser-Kreuzes (das nur in Chrome/Safari erscheint)
        className="field pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        role="combobox"
        aria-label="Suchen"
        aria-expanded={shown}
        aria-controls="search-suggestions"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          title="Suche löschen"
          aria-label="Suche löschen"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
      {shown && (
        <ul id="search-suggestions" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {matches.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Fokus im Eingabefeld behalten
                onClick={() => pick(s)}
                className={`w-full truncate px-3 py-2 text-left text-sm hover:bg-surface-2 ${i === active ? "bg-surface-2" : ""}`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
