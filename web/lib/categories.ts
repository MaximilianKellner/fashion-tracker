import type { ViewOption } from "@/components/view-toggle";
import { label } from "@/lib/labels";

// Reihenfolge der Gruppen (Kleiderschrank, Wunschliste): von oben nach unten wie ein Outfit, dann der Rest
export const CATEGORY_ORDER = ["jacke", "oberteil", "kleid", "hose", "schuhe", "accessoire", "sport", "unterwaesche"];

const GROUP_TITLES: Record<string, string> = {
  jacke: "Jacken & Mäntel",
  oberteil: "Oberteile",
  kleid: "Kleider",
  hose: "Hosen",
  schuhe: "Schuhe",
  accessoire: "Accessoires",
  sport: "Sport",
  unterwaesche: "Unterwäsche",
};

/** Position einer Kategorie in CATEGORY_ORDER; unbekannte danach */
export const categoryRank = (c: string) => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

/** Überschrift einer Kategorie-Gruppe (Plural) */
export const groupTitle = (c: string) => GROUP_TITLES[c] ?? label(c);

/** Ansichten von Kleiderschrank und Wunschliste: nach Kategorie gruppiert (Standard) oder alle in einem Raster */
export const CATEGORY_VIEWS = [
  { id: "liste", label: "Nach Kategorie", icon: "rows" },
  { id: "raster", label: "Alle in einem Raster", icon: "grid" },
] as const satisfies ViewOption[];

/** Gewählte Ansicht aus ?view=, sonst der Standard */
export const pickView = (value: string | string[] | undefined) =>
  CATEGORY_VIEWS.find((v) => v.id === value)?.id ?? CATEGORY_VIEWS[0].id;
