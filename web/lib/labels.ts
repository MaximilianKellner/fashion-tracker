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
  weiss: "Weiß",
  gruen: "Grün",
  hellgruen: "Hellgrün",
  dunkelgruen: "Dunkelgrün",
  buero: "Büro",
};

export function label(value: string | undefined): string {
  if (!value) return "";
  return LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

export const FORMALITY: Record<number, string> = {
  1: "Sport / Lounge",
  2: "Casual",
  3: "Smart Casual",
  4: "Business",
  5: "Formell",
};

export const PRIORITY: Record<number, string> = { 1: "Hoch", 2: "Mittel", 3: "Niedrig" };

// Farbnamen -> Swatch. Unbekannte Farben bekommen ein neutrales Grau mit Rand.
const SWATCHES: Record<string, string> = {
  schwarz: "#111111",
  weiss: "#ffffff",
  creme: "#f3ead8",
  beige: "#d8c3a0",
  sand: "#cdb891",
  khaki: "#b5a77a",
  braun: "#6b4a2f",
  cognac: "#9a5a2b",
  grau: "#8a8a8a",
  hellgrau: "#c9c9c9",
  anthrazit: "#3a3d40",
  navy: "#1f2a44",
  blau: "#2f5fb3",
  hellblau: "#9cc3e6",
  denim: "#4a6a8f",
  gruen: "#3f7a46",
  hellgruen: "#9cc98a",
  dunkelgruen: "#24452d",
  oliv: "#6b6b3a",
  mint: "#a8dcc4",
  rot: "#c0392b",
  bordeaux: "#6d1f2c",
  rosa: "#f2b8c6",
  pink: "#e05a8f",
  lila: "#7b5aa6",
  gelb: "#f1c93b",
  senf: "#c99a2e",
  orange: "#e67e22",
  gold: "#c8a24a",
  silber: "#c0c4c8",
};

export function swatch(color: string): string {
  return SWATCHES[color.toLowerCase()] ?? "#b0aca6";
}

export const KNOWN_COLORS = Object.keys(SWATCHES);

export function euro(value: number | undefined): string {
  if (value === undefined) return "–";
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
