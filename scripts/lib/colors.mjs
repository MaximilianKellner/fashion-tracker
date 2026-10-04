// Farben: einzige Quelle für Farbnamen, Anzeigenamen, Farbmuster und Synonyme.
// Genutzt vom Shop-Import, von der Farbauswahl im Formular und für die Farbpunkte auf der Website.
// Rein, ohne Node-Abhängigkeiten, damit es auch im Browser läuft.

/** Gespeicherte Farbnamen (Schlüssel in item.md) mit Anzeigename und Farbmuster, nach Farbfamilie sortiert. */
export const COLORS = [
  // Neutral
  { id: 'schwarz', label: 'Schwarz', hex: '#111111' },
  { id: 'anthrazit', label: 'Anthrazit', hex: '#3a3d40' },
  { id: 'grau', label: 'Grau', hex: '#8a8a8a' },
  { id: 'hellgrau', label: 'Hellgrau', hex: '#c9c9c9' },
  { id: 'weiss', label: 'Weiß', hex: '#ffffff' },
  { id: 'creme', label: 'Creme', hex: '#f3ead8' },
  { id: 'ecru', label: 'Ecru', hex: '#e6dcc6' },
  { id: 'beige', label: 'Beige', hex: '#d8c3a0' },
  { id: 'sand', label: 'Sand', hex: '#cdb891' },
  { id: 'taupe', label: 'Taupe', hex: '#9b8b7c' },
  { id: 'khaki', label: 'Khaki', hex: '#b5a77a' },
  // Braun
  { id: 'camel', label: 'Camel', hex: '#c19a6b' },
  { id: 'cognac', label: 'Cognac', hex: '#9a5a2b' },
  { id: 'braun', label: 'Braun', hex: '#6b4a2f' },
  // Blau
  { id: 'navy', label: 'Navy', hex: '#1f2a44' },
  { id: 'blau', label: 'Blau', hex: '#2f5fb3' },
  { id: 'kobalt', label: 'Kobalt', hex: '#1f4fd1' },
  { id: 'hellblau', label: 'Hellblau', hex: '#9cc3e6' },
  { id: 'denim', label: 'Denim', hex: '#4a6a8f' },
  { id: 'petrol', label: 'Petrol', hex: '#1d5c63' },
  { id: 'tuerkis', label: 'Türkis', hex: '#36b5b0' },
  // Grün
  { id: 'dunkelgruen', label: 'Dunkelgrün', hex: '#24452d' },
  { id: 'gruen', label: 'Grün', hex: '#3f7a46' },
  { id: 'smaragd', label: 'Smaragd', hex: '#1f7a5a' },
  { id: 'oliv', label: 'Oliv', hex: '#6b6b3a' },
  { id: 'salbei', label: 'Salbei', hex: '#9caf88' },
  { id: 'hellgruen', label: 'Hellgrün', hex: '#9cc98a' },
  { id: 'mint', label: 'Mint', hex: '#a8dcc4' },
  // Rot
  { id: 'bordeaux', label: 'Bordeaux', hex: '#6d1f2c' },
  { id: 'weinrot', label: 'Weinrot', hex: '#8a1c2b' },
  { id: 'rot', label: 'Rot', hex: '#c0392b' },
  { id: 'rost', label: 'Rost', hex: '#a4502a' },
  { id: 'terrakotta', label: 'Terrakotta', hex: '#c1643f' },
  { id: 'koralle', label: 'Koralle', hex: '#f07c62' },
  { id: 'lachs', label: 'Lachs', hex: '#f4a78f' },
  { id: 'rosa', label: 'Rosa', hex: '#f2b8c6' },
  { id: 'pink', label: 'Pink', hex: '#e05a8f' },
  // Lila
  { id: 'aubergine', label: 'Aubergine', hex: '#4b2340' },
  { id: 'pflaume', label: 'Pflaume', hex: '#6e3b5b' },
  { id: 'lila', label: 'Lila', hex: '#7b5aa6' },
  { id: 'mauve', label: 'Mauve', hex: '#a7869a' },
  { id: 'flieder', label: 'Flieder', hex: '#c3b1e1' },
  // Gelb und Orange
  { id: 'gelb', label: 'Gelb', hex: '#f1c93b' },
  { id: 'senf', label: 'Senf', hex: '#c99a2e' },
  { id: 'ocker', label: 'Ocker', hex: '#b9822f' },
  { id: 'orange', label: 'Orange', hex: '#e67e22' },
  // Metallic
  { id: 'gold', label: 'Gold', hex: '#c8a24a' },
  { id: 'silber', label: 'Silber', hex: '#c0c4c8' },
];

const BY_ID = new Map(COLORS.map((c) => [c.id, c]));
export const colorInfo = (id) => BY_ID.get(id);

// Shop-Farbnamen (deutsch und englisch) -> Farb-ID. Schlüssel kleingeschrieben und ohne Umlaute (ä -> ae usw.).
const SYNONYMS = {
  // Blau
  marineblau: 'navy', dunkelblau: 'navy', nachtblau: 'navy', marine: 'navy', midnight: 'navy',
  himmelblau: 'hellblau', eisblau: 'hellblau', babyblau: 'hellblau', 'light blue': 'hellblau', 'sky blue': 'hellblau',
  kobaltblau: 'kobalt', cobalt: 'kobalt', royalblau: 'kobalt', 'royal blue': 'kobalt',
  jeansblau: 'denim', indigo: 'denim',
  teal: 'petrol', entenblau: 'petrol',
  turquoise: 'tuerkis', aqua: 'tuerkis', cyan: 'tuerkis',
  blue: 'blau',
  // Neutral
  black: 'schwarz', jet: 'schwarz',
  offwhite: 'creme', 'off-white': 'creme', 'off white': 'creme', cream: 'creme', elfenbein: 'creme', ivory: 'creme',
  naturweiss: 'creme', naturfarben: 'creme', natur: 'creme', vanille: 'creme',
  wollweiss: 'ecru', oatmeal: 'ecru', hafer: 'ecru',
  white: 'weiss',
  stone: 'beige', kitt: 'beige',
  greige: 'taupe', mushroom: 'taupe',
  // Braun
  tan: 'camel', karamell: 'camel', caramel: 'camel', hellbraun: 'camel',
  whisky: 'cognac',
  dunkelbraun: 'braun', schoko: 'braun', chocolate: 'braun', mokka: 'braun', mocha: 'braun', espresso: 'braun', kaffee: 'braun', brown: 'braun',
  // Grau
  dunkelgrau: 'anthrazit', charcoal: 'anthrazit', graphit: 'anthrazit', schiefer: 'anthrazit', slate: 'anthrazit',
  silbergrau: 'hellgrau', grey: 'grau', gray: 'grau', meliert: 'grau',
  // Grün
  flaschengruen: 'dunkelgruen', tannengruen: 'dunkelgruen', waldgruen: 'dunkelgruen', 'forest green': 'dunkelgruen', 'bottle green': 'dunkelgruen',
  emerald: 'smaragd', sage: 'salbei', pistazie: 'salbei', pistachio: 'salbei',
  olive: 'oliv', moosgruen: 'oliv', green: 'gruen',
  // Rot und Rosa
  burgunder: 'bordeaux', burgundy: 'bordeaux', maroon: 'bordeaux', dunkelrot: 'bordeaux', 'dark red': 'bordeaux', oxblood: 'bordeaux', ochsenblut: 'bordeaux',
  wine: 'weinrot', merlot: 'weinrot', cherry: 'weinrot', kirschrot: 'weinrot',
  terracotta: 'terrakotta', ziegelrot: 'terrakotta', brick: 'terrakotta',
  rust: 'rost', kupfer: 'rost', copper: 'rost',
  coral: 'koralle', salmon: 'lachs', apricot: 'lachs', peach: 'lachs', pfirsich: 'lachs',
  red: 'rot',
  altrosa: 'rosa', 'dusty pink': 'rosa', rose: 'rosa', magenta: 'pink', fuchsia: 'pink',
  // Lila
  eggplant: 'aubergine', brombeere: 'aubergine',
  plum: 'pflaume', beere: 'pflaume', berry: 'pflaume',
  malve: 'mauve',
  lavendel: 'flieder', lavender: 'flieder', lilac: 'flieder',
  violett: 'lila', purple: 'lila', violet: 'lila',
  // Gelb und Orange
  ochre: 'ocker', curry: 'ocker', mustard: 'senf', yellow: 'gelb', zitrone: 'gelb', sonnengelb: 'gelb',
  // Metallic
  silver: 'silber',
  // Englische Zweiwort-Farben, damit sie nicht als zwei Farben enden
  'navy blue': 'navy', 'dark blue': 'navy', 'sage green': 'salbei', 'olive green': 'oliv', 'army green': 'oliv',
  'dark green': 'dunkelgruen', 'light green': 'hellgruen', 'mint green': 'mint', 'light grey': 'hellgrau', 'light gray': 'hellgrau',
  'dark grey': 'anthrazit', 'dark gray': 'anthrazit', 'dark brown': 'braun', 'light brown': 'camel', 'light pink': 'rosa',
  'wine red': 'weinrot', 'brick red': 'terrakotta', 'mustard yellow': 'senf',
};
// Jede Farb-ID ist auch ihr eigenes Synonym
for (const c of COLORS) SYNONYMS[c.id] ??= c.id;
const KEYS = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);

export const translit = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[​-‏⁠﻿]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();

// Kurze Schlüssel, die auch als Wortende zählen ("hellrot", "feuerrot"); "tan" dagegen nicht ("Titan")
const SUFFIX_OK = new Set(['rot']);

/** Fundstelle eines Schlüssels. Kurze Schlüssel nur als ganzes Wort (bzw. "rot" auch als Wortende). */
function findKey(text, key) {
  if (key.length >= 4) return text.indexOf(key);
  const before = SUFFIX_OK.has(key) ? '' : '(?<![a-z])';
  const m = new RegExp(`${before}${key}(?![a-z])`).exec(text);
  return m ? m.index : -1;
}

/**
 * Freitext -> Farb-IDs in Reihenfolge des Vorkommens.
 * "Marineblau" -> ["navy"], "Schwarz/Weiß" -> ["schwarz", "weiss"], "maroon cream white gold" -> ["bordeaux", "creme", "weiss", "gold"]
 * Unbekannte Farbnamen bleiben als Slug erhalten ("naturgrau" -> ["grau"], "himbeer-sorbet" -> ["himbeer-sorbet"]).
 */
export function mapColors(raw) {
  const result = [];
  for (let part of translit(raw).split(/\s*(?:\/|,|&|\+|\bund\b|\band\b)\s*/)) {
    if (!part) continue;
    const found = [];
    // Längste Treffer zuerst herauslösen, damit "dunkelgruen" nicht als "gruen" endet
    for (const key of KEYS) {
      const idx = findKey(part, key);
      if (idx < 0) continue;
      found.push({ idx, id: SYNONYMS[key] });
      part = part.slice(0, idx) + ' '.repeat(key.length) + part.slice(idx + key.length);
    }
    if (found.length === 0) {
      const slug = part.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (slug) found.push({ idx: 0, id: slug });
    }
    for (const { id } of found.sort((a, b) => a.idx - b.idx)) if (!result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * Farben, die als eigene Wörter in einem Text stehen, z. B. in einem Produktnamen. Anders als mapColors nur bekannte
 * Farben und nur ganze Wörter (mit deutscher Endung): "Hellblaue Baggy Jeans" -> ["hellblau"], "Hemd mit Brusttasche" -> [].
 */
export function colorsInText(raw) {
  let text = translit(raw);
  const found = [];
  for (const key of KEYS) {
    const m = new RegExp(`(?<![a-z])${key.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}(?:e|en|er|es|em)?(?![a-z])`).exec(text);
    if (!m) continue;
    found.push({ idx: m.index, id: SYNONYMS[key] });
    text = text.slice(0, m.index) + ' '.repeat(m[0].length) + text.slice(m.index + m[0].length);
  }
  const ids = [...new Set(found.sort((a, b) => a.idx - b.idx).map((f) => f.id))];
  // Grundton neben einem genaueren Ton derselben Familie ist nur die Übersetzung ("Bordeaux Red", "Olive Green")
  return ids.filter((id) => !GENERIC_TONES[id]?.some((specific) => ids.includes(specific)));
}

const GENERIC_TONES = {
  rot: ['bordeaux', 'weinrot', 'rost', 'terrakotta', 'koralle'],
  blau: ['navy', 'kobalt', 'hellblau', 'denim', 'petrol'],
  gruen: ['dunkelgruen', 'smaragd', 'oliv', 'salbei', 'hellgruen', 'mint'],
  grau: ['anthrazit', 'hellgrau'],
  braun: ['camel', 'cognac'],
  gelb: ['senf', 'ocker'],
  lila: ['aubergine', 'pflaume', 'flieder', 'mauve'],
};

/**
 * Vorschläge beim Tippen in der Farbauswahl: passende Anzeigenamen zuerst, dann Synonyme
 * ("plu" -> Pflaume, "maro" -> Bordeaux, "dunkelg" -> Dunkelgrün).
 */
export function suggestColors(query, limit = 6) {
  const q = translit(query);
  if (!q) return [];
  const scored = new Map();
  for (const c of COLORS) {
    const name = translit(c.label);
    if (name.startsWith(q) || c.id.startsWith(q)) scored.set(c.id, 0);
    else if (name.includes(q)) scored.set(c.id, 2);
  }
  for (const [key, id] of Object.entries(SYNONYMS)) {
    if (!scored.has(id) && (key.startsWith(q) || key.split(' ').some((w) => w.startsWith(q)))) scored.set(id, 1);
  }
  return [...scored.entries()].sort((a, b) => a[1] - b[1]).slice(0, limit).map(([id]) => id);
}
