import { COLORS, colorInfo } from "@lib/colors.mjs";
import { SUBCATEGORIES } from "@lib/schema.mjs";

// Anzeigenamen für die Schema-Werte (in den Dateien stehen sie ohne Umlaute)

const LABELS: Record<string, string> = {
  oberteil: "Oberteil",
  hose: "Hose",
  jacke: "Jacke",
  schuhe: "Schuhe",
  kleid: "Kleid",
  accessoire: "Accessoire",
  sport: "Sport",
  unterwaesche: "Unterwäsche",
  uni: "Uni",
  gestreift: "Gestreift",
  kariert: "Kariert",
  gemustert: "Gemustert",
  print: "Print",
  fruehling: "Frühling",
  sommer: "Sommer",
  herbst: "Herbst",
  winter: "Winter",
  aktiv: "Aktiv",
  aussortiert: "Aussortiert",
  reparatur: "Reparatur",
  offen: "Offen",
  gekauft: "Gekauft",
  verworfen: "Verworfen",
  ich: "Ich",
  claude: "Claude",
  buero: "Büro",
  frage: "Frage",
  empfehlung: "Empfehlung",
  beantwortet: "Beantwortet",
  archiviert: "Archiviert",
  ...Object.assign({}, ...Object.values(SUBCATEGORIES)),
};

/** Themen von Fragen und Empfehlungen */
export const TOPICS: Record<string, string> = {
  outfit: "Outfit",
  kauf: "Kaufberatung",
  analyse: "Analyse",
  stil: "Stil & Sonstiges",
};

export function label(value: string | undefined): string {
  if (!value) return "";
  return LABELS[value] ?? colorInfo(value)?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}

export const FORMALITY: Record<number, string> = {
  1: "Sport / Lounge",
  2: "Casual",
  3: "Smart Casual",
  4: "Business",
  5: "Formell",
};

export const PRIORITY: Record<number, string> = { 1: "Hoch", 2: "Mittel", 3: "Niedrig" };

// Farben kommen aus scripts/lib/colors.mjs. Unbekannte Farben bekommen ein neutrales Grau.
export function swatch(color: string): string {
  return colorInfo(color.toLowerCase())?.hex ?? "#b0aca6";
}

export const KNOWN_COLORS = COLORS.map((c) => c.id);

/** 39.9 -> "39,90" für Eingabefelder */
export function formatPriceInput(value: number | undefined): string {
  return value === undefined ? "" : value.toFixed(2).replace(".", ",");
}

export function euro(value: number | undefined): string {
  if (value === undefined) return "–";
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/** "2026-10-03" -> "3. Okt. 2026" */
export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

/** Farbe für eine Outfit-Punktzahl (0–100): ab 80 Akzent, ab 65 neutral, darunter Warnung */
export function scoreTone(score: number) {
  if (score >= 80) return "bg-accent text-accent-ink";
  if (score >= 65) return "bg-surface-2 text-ink";
  return "bg-danger/15 text-danger";
}
