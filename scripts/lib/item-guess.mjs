// Errät Felder eines Kleidungsstücks aus Name, Shop-Kategorie, Unterkategorie und Material.
// Genutzt vom Shop-Import (Lesezeichen), live im Formular beim Erfassen und vom Outfit-Builder als Fallback
// für Teile ohne Formalität oder Saison. Rein und ohne Node-Abhängigkeiten, läuft auch im Browser.
import { colorsInText, translit } from './colors.mjs';
import { SUBCATEGORIES } from './schema.mjs';

// ---------- Kategorie, Muster, Schnitt, Material aus Text ----------

// Reihenfolge ist wichtig: "Hemdjacke" ist eine Jacke, "Jogginghose" eine Hose
const CATEGORY_KEYWORDS = [
  ['accessoire', ['handschuh']],
  ['schuhe', ['schuh', 'schnuerer', 'sneaker', 'stiefel', 'boots', 'loafer', 'sandale', 'slipper', 'mokassin', 'campus', 'samba', 'gazelle', 'spezial', 'runfalcon', 'stan smith', 'air force', 'chuck']],
  ['unterwaesche', ['unterhose', 'boxershort', 'socke', 'unterwaesche', 'unterhemd']],
  ['jacke', ['jacke', 'jacka', 'mantel', 'blazer', 'sakko', 'parka', 'overshirt', 'weste', 'coat', 'jacket', 'bomber', 'blouson', 'softshell', 'fleece']],
  ['hose', ['hose', 'jeans', 'chino', 'shorts', 'jogger', 'trousers', 'pants', 'cargo', 'bermuda']],
  ['kleid', ['kleid', 'dress']],
  ['accessoire', ['guertel', 'belt', 'muetze', 'schal', 'cap', 'hat', 'tasche', 'krawatte', 'handschuh', 'beanie', 'sonnenbrille', 'rucksack', 'kette', 'uhr']],
  ['oberteil', ['hemd', 'shirt', 'pullover', 'pulli', 'strick', 'knit', 'hoodie', 'sweat', 'polo', 'top', 'cardigan', 'rollkragen', 'troyer', 'longsleeve', 'zip', 'tee']],
];

// Spezifische Unterkategorien (Werte aus SUBCATEGORIES in schema.mjs), die erste Übereinstimmung gewinnt
const SUBCATEGORY_KEYWORDS = [
  ['quarter-zip', ['quarter zip', 'quarter-zip', 'half zip', 'half-zip', 'troyer']],
  ['anzughose', ['anzughose', 'suit pants', 'elegante hose', 'stoffhose', 'bundfalte', 'pleated']],
  ['chino', ['chino']], ['jeans', ['jeans']], ['cordhose', ['cordhose']], ['cargohose', ['cargo']],
  ['jogginghose', ['jogger', 'jogginghose']], ['shorts', ['shorts', 'bermuda']],
  ['overshirt', ['overshirt', 'hemdjacke']], ['fleecejacke', ['fleece']], ['jeansjacke', ['jeansjacke', 'denim jacket']],
  ['lederjacke', ['lederjacke']], ['bomberjacke', ['bomber']], ['steppjacke', ['stepp', 'daunen', 'puffer']],
  ['parka', ['parka']], ['regenjacke', ['regenjacke', 'rain jacket', 'raincoat']], ['softshelljacke', ['softshell']], ['mantel', ['mantel', 'coat']],
  ['blazer', ['blazer', 'sakko']], ['weste', ['weste']], ['blouson', ['blouson', 'harrington', 'zip-up', 'leichte jacke']],
  ['hoodie', ['hoodie', 'kapuze', 'hooded']], ['sweatshirt', ['sweat', 'crewneck']], ['cardigan', ['cardigan', 'strickjacke']],
  ['rollkragenpullover', ['rollkragen', 'turtleneck']], ['polo', ['polo']],
  ['strickpullover', ['strick', 'knit', 'pullover', 'pulli']],
  ['tanktop', ['tanktop', 'tank top']], ['longsleeve', ['longsleeve', 'langarmshirt']],
  ['t-shirt', ['t-shirt', 't shirt', 'tshirt', 'tee', 'ringer']], ['hemd', ['hemd']],
  ['sneaker', ['sneaker', 'campus', 'samba', 'gazelle', 'spezial', 'runfalcon', 'stan smith', 'air force', 'chuck']],
  ['chelsea-boots', ['chelsea']], ['stiefel', ['stiefel', 'boots']], ['loafer', ['loafer']],
  ['schnuerschuh', ['schnuerer', 'schnuerschuh', 'derby', 'oxford']], ['sandale', ['sandale']],
  ['guertel', ['guertel', 'belt']], ['cap', ['cap']], ['muetze', ['muetze', 'beanie']], ['schal', ['schal']],
];

// "uni" nur als ganzes Wort (sonst wäre "Unisex" einfarbig), siehe guessFromText
const PATTERN_KEYWORDS = [
  ['gestreift', ['streif', 'stripe', 'nadelstreifen']],
  ['kariert', ['karo', 'kariert', 'check', 'hahnentritt']],
  ['print', ['print', 'bedruckt', 'grafik', 'graphic']],
  ['gemustert', ['muster', 'jacquard', 'pattern', 'zopf']],
];

// Material am Wortanfang, damit "Baumwolle" nicht als Wolle zählt; Werte wie in den Daten (klein, deutsch)
const MATERIAL_KEYWORDS = [
  ['merino', ['merino']], ['kaschmir', ['kaschmir', 'cashmere']], ['baumwolle', ['baumwoll', 'cotton']],
  ['wolle', ['wolle', 'wool']], ['leinen', ['leinen', 'linen']], ['cord', ['cord']], ['leder', ['leder', 'leather']],
  ['seide', ['seide', 'silk']], ['fleece', ['fleece']], ['denim', ['denim', 'jeans']], ['polyester', ['polyester']],
];

const findKeyword = (text, list) => list.find(([, words]) => words.some((w) => text.includes(w)))?.[0];
const findAtWordStart = (text, list) => list.find(([, words]) => words.some((w) => new RegExp(`(?<![a-z])${w}`).test(text)))?.[0];

// Markennamen, die wie Farben oder Materialien klingen ("S.Oliver" ist nicht oliv, "Seidensticker" nicht aus Seide)
const MISLEADING_BRANDS = /\bs\.? ?oliver\b|\bseidensticker\b|\bcamel active\b|\bmarc o.?polo\b/g;
const withoutBrands = (text) => translit(text).replace(MISLEADING_BRANDS, ' ');

/**
 * Was sich aus Text erkennen lässt: Name und Shop-Kategorie als `text`, Beschreibung als schwächerer `fallback`.
 * Ergebnis: { category?, subcategory?, pattern?, fit?, material?, colors[] } – nur Gefundenes ist gesetzt.
 */
export function guessFromText(text, fallback = '') {
  const primary = withoutBrands(text);
  const secondary = withoutBrands(fallback);
  const category = findKeyword(primary, CATEGORY_KEYWORDS) ?? findKeyword(secondary, CATEGORY_KEYWORDS);
  const sub = findKeyword(primary, SUBCATEGORY_KEYWORDS) ?? findKeyword(secondary, SUBCATEGORY_KEYWORDS);
  const fit = `${primary} ${secondary}`.match(/\b(loose|regular|relaxed|slim|oversized?|comfort|wide|straight|boxy|baggy)[ -]fit\b/)?.[1] ??
    primary.match(/\b(oversized?|baggy|relaxed|wide leg|boxy)\b/)?.[1];
  return {
    category,
    subcategory: category && SUBCATEGORIES[category]?.[sub] ? sub : undefined,
    pattern: findKeyword(primary, PATTERN_KEYWORDS) ?? (/\buni\b|einfarbig|solid/.test(primary) ? 'uni' : undefined),
    fit: fit === 'oversize' ? 'oversized' : fit,
    material: findAtWordStart(primary, MATERIAL_KEYWORDS) ?? (sub === 'jeans' ? 'denim' : undefined),
    colors: colorsInText(primary),
  };
}

// ---------- Formalität und Saison ----------

/** Formalität nach Unterkategorie (1 Sport/Lounge ... 5 formell) */
export const DEFAULT_FORMALITY = {
  't-shirt': 2, longsleeve: 2, tanktop: 1, polo: 3, hemd: 4, strickpullover: 3, rollkragenpullover: 3, cardigan: 3,
  sweatshirt: 2, hoodie: 2, 'quarter-zip': 3, jeans: 2, chino: 3, anzughose: 4, cordhose: 3, cargohose: 2,
  jogginghose: 1, shorts: 2, blouson: 3, overshirt: 2, fleecejacke: 1, jeansjacke: 2, lederjacke: 3,
  bomberjacke: 2, steppjacke: 2, parka: 2, regenjacke: 1, softshelljacke: 1, mantel: 4, blazer: 4, weste: 3,
  sneaker: 2, schnuerschuh: 4, loafer: 4, 'chelsea-boots': 3, stiefel: 3, sandale: 1, hausschuh: 1,
};
// Ohne Unterkategorie: grob nach Kategorie
const CATEGORY_FORMALITY = { oberteil: 2, hose: 2, jacke: 3, schuhe: 2, kleid: 3, sport: 1 };

/** Saisons nach Unterkategorie; fehlt eine, gilt das Teil als ganzjährig */
export const DEFAULT_SEASONS = {
  shorts: ['fruehling', 'sommer'], tanktop: ['fruehling', 'sommer'], sandale: ['sommer'], badehose: ['sommer'],
  steppjacke: ['herbst', 'winter'], parka: ['herbst', 'winter'], mantel: ['herbst', 'winter'], muetze: ['herbst', 'winter'],
  rollkragenpullover: ['herbst', 'winter'], handschuhe: ['herbst', 'winter'], schal: ['herbst', 'winter'],
  strickpullover: ['fruehling', 'herbst', 'winter'], cardigan: ['fruehling', 'herbst', 'winter'],
  sweatshirt: ['fruehling', 'herbst', 'winter'], hoodie: ['fruehling', 'herbst', 'winter'],
  'quarter-zip': ['fruehling', 'herbst', 'winter'], fleecejacke: ['fruehling', 'herbst', 'winter'],
  softshelljacke: ['fruehling', 'herbst', 'winter'],
  blouson: ['fruehling', 'sommer', 'herbst'], jeansjacke: ['fruehling', 'sommer', 'herbst'], overshirt: ['fruehling', 'sommer', 'herbst'],
};
const ALL_SEASONS = ['fruehling', 'sommer', 'herbst', 'winter'];
const WARM_MATERIALS = new Set(['wolle', 'merino', 'kaschmir', 'cord', 'fleece']);

// Wörter im Namen, die die Formalität verschieben
const DRESSY = ['anzug', 'bundfalte', 'pleated', 'elegant', 'tailored', 'business', 'buegelfrei', 'seide', 'kaschmir', 'cashmere'];
const CASUAL = ['freizeit', 'kurzarm', 'short sleeve', 'oversize', 'baggy', 'distressed', 'washed', 'print', 'grafik', 'graphic', 'waffel', 'leinen', 'linen'];
// Nur diese drücken bis auf 1 (Sport/Lounge), die übrigen lässigen Wörter höchstens auf 2
const SPORTY = ['jogger', 'sport', 'training', 'gym', 'lounge'];
// Wörter, die die Saison festlegen
const SUMMERY = ['kurzarm', 'short sleeve', 'sommer', 'summer', 'leinen', 'linen'];
const WINTERY = ['thermo', 'gefuettert', 'winter', 'teddy', 'sherpa', 'wattiert', 'daunen', 'puffer'];

const has = (text, words) => words.some((w) => text.includes(w));

/**
 * Vorschläge für Formalität, Saisons und Muster. item: { category, subcategory, material, name, pattern }.
 * Ergebnis: { formality?, seasons[], pattern }. Formalität fehlt nur, wo sie keinen Sinn hat (z. B. Unterwäsche).
 */
export function guessDefaults({ category, subcategory, material, name = '', pattern } = {}) {
  const text = translit(name);
  const mat = translit(material);

  let formality = DEFAULT_FORMALITY[subcategory] ?? CATEGORY_FORMALITY[category];
  if (formality !== undefined) {
    const up = has(text, DRESSY);
    const down = has(text, CASUAL) || has(text, SPORTY);
    if (up && !down) formality = Math.min(4, formality + 1); // 5 (Anzug, Smoking) nur von Hand
    if (down && !up) formality = Math.max(has(text, SPORTY) ? 1 : Math.min(2, formality), formality - 1);
  }

  let seasons;
  if (has(text, WINTERY)) seasons = ['herbst', 'winter'];
  else if (has(text, SUMMERY) || mat === 'leinen') seasons = ['fruehling', 'sommer'];
  else if (DEFAULT_SEASONS[subcategory]) seasons = DEFAULT_SEASONS[subcategory];
  else if (WARM_MATERIALS.has(mat)) seasons = ['herbst', 'winter'];
  else seasons = ALL_SEASONS;

  return { formality, seasons: [...seasons], pattern: pattern || 'uni' };
}

/** Alles zusammen: was der Text hergibt, darauf aufbauend Formalität und Saison */
export function guessItem(text, fallback = '') {
  const found = guessFromText(text, fallback);
  return { ...found, ...guessDefaults({ ...found, name: text }) };
}
