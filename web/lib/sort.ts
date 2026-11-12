// Sortierung der Listen (Kleiderschrank, Outfits, Wunschliste) über den URL-Parameter ?sort=
// Die erste Option ist jeweils der Standard und bisherige Reihenfolge; sie steht nicht in der URL.

export type SortOption<T> = { id: string; label: string; compare: (a: T, b: T) => number };

/** Text nach deutscher Sortierung, Groß-/Kleinschreibung egal, Zahlen numerisch („Hemd 2“ vor „Hemd 10“) */
export const byText = (a?: string, b?: string) => (a ?? "").localeCompare(b ?? "", "de", { sensitivity: "base", numeric: true });

/** Zahl auf- (dir 1) oder absteigend (dir -1); Einträge ohne Wert stehen immer am Ende */
export const byNumber = (a: number | undefined, b: number | undefined, dir: 1 | -1) =>
  a === undefined ? (b === undefined ? 0 : 1) : b === undefined ? -1 : (a - b) * dir;

/** IDs beginnen mit dem Datum der Erfassung (JJJJ-MM-TT-slug), sortieren also nach Alter */
export const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);

/** Optionen für Alter und Name, die alle Listen haben */
export function basicSorts<T extends { id: string }>(name: (x: T) => string | undefined): SortOption<T>[] {
  return [
    { id: "alt", label: "Älteste zuerst", compare: byId },
    { id: "neu", label: "Neueste zuerst", compare: (a, b) => byId(b, a) },
    { id: "az", label: "Name A–Z", compare: (a, b) => byText(name(a), name(b)) || byId(a, b) },
    { id: "za", label: "Name Z–A", compare: (a, b) => byText(name(b), name(a)) || byId(a, b) },
  ];
}

/** Gewählte Option aus dem URL-Parameter (unbekannt oder leer: Standard) */
export function pickSort<T>(options: SortOption<T>[], value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value[0] : value;
  return options.find((o) => o.id === id) ?? options[0];
}

/** Für die Auswahl im Browser: ohne Vergleichsfunktionen, die nicht zum Client übertragen werden können */
export const sortChoices = <T,>(options: SortOption<T>[]) => options.map(({ id, label }) => ({ id, label }));
