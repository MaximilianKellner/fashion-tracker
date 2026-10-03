// Single Source of Truth für erlaubte Werte. docs/schema.md beschreibt dieselben Felder für Menschen.

export const CATEGORIES = [
  'oberteil',
  'hose',
  'jacke',
  'schuhe',
  'kleid',
  'accessoire',
  'sport',
  'unterwaesche',
];

export const PATTERNS = ['uni', 'gestreift', 'kariert', 'gemustert', 'print'];

export const SEASONS = ['fruehling', 'sommer', 'herbst', 'winter'];

export const ITEM_STATUS = ['aktiv', 'aussortiert', 'reparatur'];

export const OUTFIT_SOURCES = ['ich', 'claude'];

export const WISHLIST_STATUS = ['offen', 'gekauft', 'verworfen'];

// Empfehlungen: "frage" stellt der Nutzer (über die Website), "empfehlung" schreibt Claude
export const RECOMMENDATION_KINDS = ['frage', 'empfehlung'];
export const RECOMMENDATION_TOPICS = ['outfit', 'kauf', 'analyse', 'stil'];
export const RECOMMENDATION_STATUS = ['offen', 'beantwortet', 'archiviert'];

// Körpermaße in cm (Felder unter profile.md -> measurements)
export const MEASUREMENTS = {
  chest: { label: 'Brust', hint: 'an der breitesten Stelle, unter den Achseln' },
  waist: { label: 'Taille / Bund', hint: 'dort, wo die Hose sitzt (bei Bundfaltenhosen etwa Höhe Bauchnabel)' },
  hips: { label: 'Hüfte', hint: 'an der breitesten Stelle über dem Gesäß' },
  inseam: { label: 'Innenbeinlänge', hint: 'Schritt bis Boden, ohne Schuhe' },
  shoulder: { label: 'Schulterbreite', hint: 'hinten von Schulternaht zu Schulternaht' },
  sleeve: { label: 'Ärmellänge', hint: 'Schulternaht bis Handgelenk, Arm leicht angewinkelt' },
  neck: { label: 'Hals', hint: 'für Hemden, ein Finger Luft lassen' },
  foot: { label: 'Fußlänge', hint: 'Ferse bis längster Zeh' },
};
// Aussehen, relevant für Farb- und Brillenempfehlungen (Felder unter profile.md -> appearance)
export const APPEARANCE = {
  skin: { label: 'Haut', hint: 'z. B. hell, leicht warm' },
  hair: { label: 'Haare', hint: 'z. B. dunkelblond, wellig' },
  contrast: { label: 'Kontrast', hint: 'niedrig, mittel oder hoch' },
  glasses: { label: 'Brille', hint: 'z. B. rund, dünner Metallrahmen' },
};
// Farbpalette mit Farb-IDs aus scripts/lib/colors.mjs (Felder unter profile.md -> palette)
export const PALETTE = {
  best: { label: 'Steht mir besonders', hint: 'Akzente nah am Gesicht' },
  base: { label: 'Basis', hint: 'neutrale Töne für die meisten Teile' },
  sparingly: { label: 'Sparsam einsetzen', hint: 'eher für Hosen, Schuhe oder kleine Flächen' },
};
// Konfektionsgrößen (Felder unter profile.md -> sizes)
export const SIZES = {
  tops: { label: 'Oberteile', hint: 'z. B. L' },
  shirts: { label: 'Hemden', hint: 'z. B. 41/42 oder L' },
  trousers: { label: 'Hosen', hint: 'z. B. 32/34 oder 50' },
  jackets: { label: 'Jacken & Mäntel', hint: 'z. B. L oder 52' },
  shoes: { label: 'Schuhe', hint: 'z. B. 44 2/3' },
  notes: { label: 'Abweichungen', hint: 'z. B. Zara eine Nummer größer' },
};

// Feld -> Regel. type: string | number | string[] ; enum: erlaubte Werte ; min/max für Zahlen
export const ITEM_FIELDS = {
  name: { type: 'string', required: true },
  category: { type: 'string', required: true, enum: CATEGORIES },
  subcategory: { type: 'string' },
  colors: { type: 'string[]', required: true },
  pattern: { type: 'string', enum: PATTERNS },
  material: { type: 'string' },
  brand: { type: 'string' },
  size: { type: 'string' },
  fit: { type: 'string' },
  seasons: { type: 'string[]', enum: SEASONS },
  formality: { type: 'number', min: 1, max: 5 },
  status: { type: 'string', required: true, enum: ITEM_STATUS },
  purchase: { type: 'object' },
  photos: { type: 'string[]' },
  tags: { type: 'string[]' },
  link: { type: 'string' },
};

export const OUTFIT_FIELDS = {
  name: { type: 'string', required: true },
  items: { type: 'string[]', required: true },
  occasion: { type: 'string' },
  seasons: { type: 'string[]', enum: SEASONS },
  rating: { type: 'number', min: 1, max: 5 },
  source: { type: 'string', enum: OUTFIT_SOURCES },
};

export const WISHLIST_FIELDS = {
  name: { type: 'string', required: true },
  category: { type: 'string', enum: CATEGORIES },
  link: { type: 'string' },
  price: { type: 'number', min: 0 },
  priority: { type: 'number', min: 1, max: 3 },
  reason: { type: 'string' },
  status: { type: 'string', required: true, enum: WISHLIST_STATUS },
  fills_gap: { type: 'string' },
  photos: { type: 'string[]' },
};

export const RECOMMENDATION_FIELDS = {
  title: { type: 'string', required: true },
  kind: { type: 'string', required: true, enum: RECOMMENDATION_KINDS },
  topic: { type: 'string', enum: RECOMMENDATION_TOPICS },
  date: { type: 'string', required: true },
  status: { type: 'string', required: true, enum: RECOMMENDATION_STATUS },
  answers: { type: 'string' },
  items: { type: 'string[]' },
  outfits: { type: 'string[]' },
  wishes: { type: 'string[]' },
};

export const PROFILE_FIELDS = {
  height_cm: { type: 'number', min: 100, max: 250 },
  weight_kg: { type: 'number', min: 30, max: 250 },
  age: { type: 'number', min: 10, max: 120 },
  appearance: { type: 'object' },
  palette: { type: 'object' },
  measurements: { type: 'object' },
  sizes: { type: 'object' },
};

/**
 * Datumsangaben werden immer als ISO 8601 "JJJJ-MM-TT" gespeichert.
 * Akzeptiert zusätzlich "TT.MM.JJJJ" (deutsche Schreibweise) und gibt null zurück, wenn es kein gültiges Datum ist.
 */
export function normalizeDate(input) {
  const s = String(input ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const [y, mo, d] = m ? [m[1], m[2], m[3]] : (m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)) ? [m[3], m[2], m[1]] : [];
  if (!y) return null;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export const isIsoDate = (value) => typeof value === 'string' && normalizeDate(value) === value;

/**
 * Preise werden immer als Zahl in Euro mit höchstens 2 Nachkommastellen gespeichert (z. B. 1299.9).
 * Akzeptiert Eingaben wie "49,95 €", "€ 49.95", "1.299,00", "1,299.00", "49" und gibt null zurück, wenn es kein Preis ist.
 */
export function normalizePrice(input) {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? Math.round(input * 100) / 100 : null;
  let s = String(input ?? '')
    .replace(/€|eur(o)?/gi, '')
    .replace(/[\s  ']/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // Beide vorhanden: das letzte Zeichen ist das Dezimaltrennzeichen, das andere Tausendertrenner
    const dec = lastDot > lastComma ? '.' : ',';
    s = s.split(dec === '.' ? ',' : '.').join('').replace(dec, '.');
  } else if (lastComma >= 0) {
    // Nur Komma: "1,299" mit genau 3 Ziffern nach mehreren Gruppen wäre englisch, sonst deutsches Dezimalkomma
    s = /^\d{1,3}(,\d{3})+$/.test(s) && !/^\d,\d{3}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // "1.299" = deutscher Tausenderpunkt
  }
  if ((s.match(/\./g) ?? []).length > 1) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export const isPrice = (value) => typeof value === 'number' && normalizePrice(value) === value;

/** Prüft ein Frontmatter-Objekt gegen eine Feldbeschreibung. Gibt eine Liste von Fehlermeldungen zurück. */
export function validateFields(data, fields) {
  const errors = [];
  for (const [key, rule] of Object.entries(fields)) {
    const value = data[key];
    if (value === undefined || value === null || value === '') {
      if (rule.required) errors.push(`Pflichtfeld "${key}" fehlt`);
      continue;
    }
    if (rule.type === 'string[]') {
      if (!Array.isArray(value)) {
        errors.push(`"${key}" muss eine Liste sein`);
        continue;
      }
      if (rule.required && value.length === 0) errors.push(`"${key}" darf nicht leer sein`);
      if (rule.enum) {
        for (const v of value) {
          if (!rule.enum.includes(v)) errors.push(`"${key}": unbekannter Wert "${v}" (erlaubt: ${rule.enum.join(', ')})`);
        }
      }
    } else if (rule.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`"${key}" muss eine Zahl sein`);
        continue;
      }
      if (rule.min !== undefined && value < rule.min) errors.push(`"${key}" muss >= ${rule.min} sein`);
      if (rule.max !== undefined && value > rule.max) errors.push(`"${key}" muss <= ${rule.max} sein`);
    } else if (rule.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) errors.push(`"${key}" muss ein Objekt sein`);
    } else if (rule.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`"${key}" muss Text sein`);
        continue;
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`"${key}": unbekannter Wert "${value}" (erlaubt: ${rule.enum.join(', ')})`);
      }
    }
  }
  return errors;
}
