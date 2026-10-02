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
};

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
