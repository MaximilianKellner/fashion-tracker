// Farbtyp-Test: aus vier Fragen (Unterton, Helligkeit, Kontrast, Leuchtkraft) einen der vier Farbtypen (Frühling, Sommer,
// Herbst, Winter) und eine Startpalette mit Farb-IDs aus colors.mjs ableiten. Genutzt vom Profil-Formular der Website.
// Rein, ohne Node-Abhängigkeiten, damit es auch im Browser läuft.

/** Fragen mit Antworten; die Schlüssel der Antworten landen in colorType() */
export const COLOR_TYPE_QUESTIONS = {
  undertone: {
    label: 'Unterton der Haut',
    hint: 'Adern am Handgelenk eher grünlich und Gold steht dir besser: warm. Eher bläulich und Silber steht besser: kühl. Unsicher: neutral.',
    options: { warm: 'warm', neutral: 'neutral', kuehl: 'kühl' },
  },
  depth: {
    label: 'Haare und Augen insgesamt',
    hint: 'Wie hell oder dunkel wirkst du, mit Haar-, Augen- und Brauenfarbe zusammen?',
    options: { hell: 'hell', mittel: 'mittel', dunkel: 'dunkel' },
  },
  contrast: {
    label: 'Kontrast',
    hint: 'Unterschied zwischen Haut und Haaren: hell und dunkelbraun ist hoch, blond auf heller Haut niedrig.',
    options: { niedrig: 'niedrig', mittel: 'mittel', hoch: 'hoch' },
  },
  chroma: {
    label: 'Welche Farben stehen dir?',
    hint: 'Halte ein knallig buntes und ein gedecktes, erdiges Teil unters Gesicht. Wirkst du mit dem kräftigen frischer?',
    options: { klar: 'kräftig, klar', gedeckt: 'sanft, gedeckt' },
  },
};

/** Die vier Farbtypen mit Beschreibung und Startpalette (Gruppen wie PALETTE in schema.mjs) */
export const COLOR_TYPES = {
  fruehling: {
    label: 'Frühling',
    description: 'warm und klar: frische, helle und warme Farben',
    palette: {
      best: ['koralle', 'lachs', 'tuerkis', 'hellgruen', 'camel', 'blau', 'gelb'],
      base: ['creme', 'beige', 'sand', 'camel', 'navy'],
      sparingly: ['schwarz', 'anthrazit', 'aubergine', 'bordeaux'],
    },
  },
  sommer: {
    label: 'Sommer',
    description: 'kühl und gedeckt: sanfte, leicht gegraute Farben',
    palette: {
      best: ['hellblau', 'denim', 'petrol', 'salbei', 'rosa', 'mauve', 'flieder', 'pflaume'],
      base: ['hellgrau', 'grau', 'taupe', 'navy', 'weiss'],
      sparingly: ['schwarz', 'orange', 'senf', 'ocker'],
    },
  },
  herbst: {
    label: 'Herbst',
    description: 'warm und gedeckt: erdige, satte Farben',
    palette: {
      best: ['oliv', 'dunkelgruen', 'rost', 'terrakotta', 'senf', 'cognac', 'petrol', 'bordeaux'],
      base: ['creme', 'ecru', 'beige', 'camel', 'braun', 'khaki', 'navy'],
      sparingly: ['schwarz', 'weiss', 'pink', 'kobalt'],
    },
  },
  winter: {
    label: 'Winter',
    description: 'kühl und klar: kräftige Farben und starke Kontraste',
    palette: {
      best: ['kobalt', 'smaragd', 'rot', 'weinrot', 'pink', 'aubergine', 'navy'],
      base: ['schwarz', 'weiss', 'anthrazit', 'grau', 'navy'],
      sparingly: ['camel', 'ocker', 'senf', 'orange', 'lachs'],
    },
  },
};

/**
 * Farbtyp aus den Antworten. Warm/kühl entscheidet zwischen Frühling/Herbst und Sommer/Winter, die Leuchtkraft innerhalb.
 * Bei neutralem Unterton entscheiden Helligkeit und Kontrast: dunkel oder hoher Kontrast eher Winter/Herbst, sonst Frühling/Sommer.
 * Fehlt eine nötige Antwort, kommt null zurück.
 * @param {{ undertone?: string, depth?: string, contrast?: string, chroma?: string }} answers
 * @returns {{ id: string, label: string, description: string, palette: { best: string[], base: string[], sparingly: string[] } } | null}
 */
export function colorType({ undertone, depth, contrast, chroma } = {}) {
  if (!undertone || !chroma) return null;
  let id;
  if (undertone === 'warm') id = chroma === 'klar' ? 'fruehling' : 'herbst';
  else if (undertone === 'kuehl') id = chroma === 'klar' ? 'winter' : 'sommer';
  else {
    if (!depth && !contrast) return null;
    const deep = depth === 'dunkel' || contrast === 'hoch';
    id = chroma === 'klar' ? (deep ? 'winter' : 'fruehling') : deep ? 'herbst' : 'sommer';
  }
  const type = COLOR_TYPES[id];
  return { id, label: type.label, description: type.description, palette: structuredClone(type.palette) };
}
