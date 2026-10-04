// Farb-Lücken: Welche Farbe würde eine Kategorie (Hosen, Oberteile, Schuhe, Jacken) im vorhandenen Schrank am meisten ergänzen?
// Jede Farbe wird als gedachtes neues Teil mit allen Kombinationen der übrigen Plätze bewertet (scoreOutfit),
// dann nach Vielseitigkeit, Abstand zu den vorhandenen Farben und Profilpalette sortiert.
// Rein, ohne Node-Abhängigkeiten. Genutzt von der Website unter „Empfehlungen“.

import { COLORS, colorInfo } from './colors.mjs';
import { colorDistance, formalityOf, sameColorRole, scoreOutfit, slotsFor } from './outfit-match.mjs';
import { SUBCATEGORIES } from './schema.mjs';

export const GAP_GROUPS = [
  { slot: 'hose', label: 'Hosen', counted: 'lange im Schrank', partners: ['oberteil', 'schuhe'], with: 'Oberteil und Schuhen' },
  { slot: 'oberteil', label: 'Oberteile', counted: 'im Schrank', partners: ['hose', 'schuhe'], with: 'Hose und Schuhen' },
  { slot: 'schuhe', label: 'Schuhe', counted: 'Paar im Schrank', partners: ['oberteil', 'hose'], with: 'Oberteil und Hose' },
  { slot: 'jacke', label: 'Jacken', counted: 'im Schrank (ohne Funktionsjacken)', partners: ['oberteil', 'hose'], with: 'Oberteil und Hose' },
];

// Teile mit eigener Rolle: Shorts ersetzen keine lange Hose, eine Regenjacke keinen Blouson
const SPECIAL = new Set([
  'shorts', 'tanktop', 'regenjacke', 'softshelljacke', 'fleecejacke', 'trainingsjacke',
  'sportshirt', 'sporthose', 'badehose', 'sportschuh', 'hausschuh', 'jogginghose',
]);
// Arten, die je Kategorie als neues Teil durchgerechnet werden (dazu alle Arten, die schon im Schrank sind).
// colors schränkt auf übliche Farben ein: Loafer gibt es nicht in Hellblau, eine Stoffhose nicht in Denim.
const DENIM = ['hellblau', 'denim', 'blau'];
const JEANS_COLORS = [...DENIM, 'navy', 'schwarz', 'grau', 'anthrazit', 'ecru', 'weiss'];
const SHOE_COLORS = ['schwarz', 'braun', 'cognac', 'bordeaux', 'camel', 'taupe', 'sand', 'beige', 'navy']; // Glatt- und Wildleder
const LEATHER_JACKET_COLORS = ['schwarz', 'braun', 'cognac', 'bordeaux', 'camel', 'taupe', 'sand', 'oliv'];
const COAT_COLORS = ['grau', 'anthrazit', 'navy', 'camel', 'schwarz', 'braun', 'beige', 'sand', 'creme', 'taupe', 'oliv', 'dunkelgruen', 'bordeaux'];
const notDenim = (id) => !DENIM.includes(id);
const TYPES = {
  hose: [{ sub: 'anzughose', colors: notDenim }, { sub: 'chino', colors: notDenim }, { sub: 'jeans', colors: JEANS_COLORS }],
  oberteil: [{ sub: 'strickpullover' }, { sub: 'hemd' }, { sub: 't-shirt' }, { sub: 'polo' }],
  schuhe: [
    { sub: 'sneaker' },
    { sub: 'loafer', colors: SHOE_COLORS },
    { sub: 'schnuerschuh', colors: SHOE_COLORS },
    { sub: 'chelsea-boots', colors: SHOE_COLORS },
  ],
  jacke: [{ sub: 'blouson' }, { sub: 'overshirt' }, { sub: 'mantel', colors: COAT_COLORS }, { sub: 'lederjacke', colors: LEATHER_JACKET_COLORS }],
};
// Ähnliche Arten: Eine Chino in Grau ist nicht neu, wenn es schon eine graue Stoffhose gibt (Neuheit zählt je Familie)
const FAMILIES = [
  ['anzughose', 'chino', 'cordhose'],
  ['strickpullover', 'quarter-zip', 'cardigan', 'rollkragenpullover'],
  ['t-shirt', 'longsleeve'],
  ['loafer', 'schnuerschuh'],
  ['chelsea-boots', 'stiefel'],
  ['blouson', 'overshirt', 'jeansjacke', 'bomberjacke'],
  ['mantel', 'parka'],
];
const familyOf = (sub) => FAMILIES.find((f) => f.includes(sub)) ?? [sub];
// Mehrzahl für „… hast du noch nicht“
const PLURAL = { sneaker: 'Sneaker', loafer: 'Loafer', schnuerschuh: 'Schnürschuhe', 'chelsea-boots': 'Chelsea Boots', chino: 'Chinos',
  jeans: 'Jeans', anzughose: 'Stoffhosen', hemd: 'Hemden', polo: 'Polos', 't-shirt': 'T-Shirts', strickpullover: 'Strickpullover',
  blouson: 'Blousons', overshirt: 'Overshirts', mantel: 'Mäntel', lederjacke: 'Lederjacken' };
const allows = (type, id) => !type.colors || (typeof type.colors === 'function' ? type.colors(id) : type.colors.includes(id));
const METALLIC = new Set(['gold', 'silber']);
// Ab hier gilt eine Kombination als stimmig bzw. sehr stimmig (wie das Urteil im Builder)
const OK = 68;
const GREAT = 80;
// Farbabstand (colorDistance): darunter praktisch gleich (Beige/Sand), ab DISTINCT klar neu.
// Dazwischen entscheidet sameColorRole: Beige und Creme sind für eine Hose dieselbe Rolle, Braun und Oliv nicht.
const SAME = 0.05;
const DISTINCT = 0.12;
// So neu wirkt eine Farbe, die dieselbe Rolle spielt wie ein vorhandenes Teil (0 = hast du schon, 1 = ganz neu)
const SIMILAR_NOVELTY = 0.2;

const colorLabel = (id) => colorInfo(id)?.label ?? id;
const subLabel = (category, sub) => SUBCATEGORIES[category]?.[sub] ?? sub;
const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : undefined;
};

/** Schlüssel einer Empfehlung, z. B. „schuhe/loafer/braun“ (so steht sie in `hidden_gaps` im Profil) */
export const gapKey = (slot, subcategory, color) => `${slot}/${subcategory}/${color}`;

/**
 * Farbempfehlungen je Kategorie.
 * items: alle Teile (nur aktive zählen), palette: Profilpalette { best, base, sparingly }, hidden: ausgeblendete Schlüssel (gapKey).
 * Ergebnis: [{ slot, label, owned: Anzahl vergleichbarer Teile, counted, hidden: Anzahl ausgeblendeter,
 *   suggestions: [{ key, color, colorLabel, subcategory, name, share, great, fresh, reasons, partners: Item-IDs }] }]
 * suggestions ist in Seiten zu je `page` sortiert (die Website blättert mit „Andere Vorschläge“), höchstens `pages` Seiten.
 * @param {any[]} items
 * @param {{ palette?: { best?: string[], base?: string[], sparingly?: string[] }, hidden?: string[], page?: number, pages?: number }} [options]
 */
export function colorGaps(items, { palette = {}, hidden = [], page = 3, pages = 5 } = {}) {
  // Die Rechnung dauert ca. 0,5 s; bei unverändertem Schrank das letzte Ergebnis wiederverwenden
  const key = JSON.stringify([items.map((i) => [i.id, i.data]), palette]);
  if (cached?.key !== key) cached = { key, result: compute(items, palette) };
  const skip = new Set(hidden);
  return cached.result.map(({ candidates, ...group }) => {
    const visible = candidates.filter((c) => !skip.has(c.key));
    return { ...group, hidden: candidates.length - visible.length, suggestions: paginate(visible, page, pages) };
  });
}
/** @type {{ key: string, result: ReturnType<typeof compute> } | null} */
let cached = null;

/**
 * Seitenweise auswählen: auf jeder Seite jede Farbe nur einmal und höchstens zwei Vorschläge derselben Art.
 * Über alle Seiten kommt jede Farbrolle je Familie nur einmal vor (nach „Chino in Weiß“ keine weiße Stoffhose,
 * nach Bordeaux kein Weinrot).
 */
function paginate(sorted, size, pages) {
  const pool = sorted.filter(
    (c, i) => !sorted.slice(0, i).some((prev) => prev.family === c.family && (prev.color === c.color || sameColorRole(prev.color, c.color))),
  );
  const out = [];
  for (let p = 0; p < pages && pool.length; p++) {
    const chosen = [];
    for (const c of pool) {
      if (chosen.length >= size) break;
      if (chosen.some((s) => s.color === c.color)) continue;
      if (chosen.filter((s) => s.subcategory === c.subcategory).length >= 2) continue;
      chosen.push(c);
    }
    for (const c of chosen) pool.splice(pool.indexOf(c), 1);
    out.push(...chosen);
  }
  return out;
}

function compute(items, palette) {
  const active = items.filter((i) => i.data.status === 'aktiv' && !SPECIAL.has(i.data.subcategory));
  const inSlot = (slot) => active.filter((i) => slotsFor(i)[0] === slot);
  // Kandidaten: die Farben aus der Profilpalette, ohne Palette alle außer Metallic
  const fromPalette = [...(palette.best ?? []), ...(palette.base ?? []), ...(palette.sparingly ?? [])];
  const colors = fromPalette.length ? [...new Set(fromPalette)].filter((id) => colorInfo(id)) : COLORS.map((c) => c.id).filter((id) => !METALLIC.has(id));

  return GAP_GROUPS.map(({ slot, label, counted, partners, with: withText }) => {
    const owned = inSlot(slot);
    const [first, second] = partners.map(inSlot);
    const combos = first.flatMap((a) => second.map((b) => [a, b]));
    if (!combos.length) return { slot, label, owned: owned.length, counted, candidates: [] };

    const category = owned[0]?.data.category ?? slot;
    // Bestes vorhandenes Teil je Kombination: woran sich ein neues Teil messen muss
    const best = combos.map((c) => Math.max(0, ...owned.map((o) => scoreOutfit([...c, o], { palette }).score)));
    // Arten: die üblichen plus alle, die du schon hast
    const types = [...TYPES[slot]];
    for (const sub of new Set(owned.map((o) => o.data.subcategory).filter(Boolean))) if (!types.some((t) => t.sub === sub)) types.push({ sub });

    const candidates = types.flatMap((type) => {
      const sameType = owned.filter((o) => o.data.subcategory === type.sub);
      const family = owned.filter((o) => familyOf(type.sub).includes(o.data.subcategory));
      // Formalität wie bei deinen Teilen dieser Art, sonst der Standard der Art
      const formality = median(sameType.map(formalityOf).filter(Boolean));
      return colors.filter((id) => allows(type, id)).map((id) => {
        const item = { id: `neu-${type.sub}-${id}`, data: { category, subcategory: type.sub, colors: [id], pattern: 'uni', formality } };
        const scores = combos.map((c) => scoreOutfit([...c, item], { palette }).score);
        const share = scores.filter((s) => s >= OK).length / scores.length;
        const great = scores.filter((s) => s >= GREAT).length;
        const fresh = scores.filter((s, i) => s >= GREAT && best[i] < GREAT).length;
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Neu ist eine Farbe, die es in dieser Familie (z. B. Stoffhosen, Lederschuhe) noch nicht gibt
        const compare = (o) => {
          const other = o.data.colors?.[0];
          const distance = colorDistance(id, other);
          const novelty =
            distance < SAME ? 0 : sameColorRole(id, other) ? SIMILAR_NOVELTY : Math.max(0.5, Math.min(1, (distance - SAME) / (DISTINCT - SAME)));
          return { item: o, novelty, distance };
        };
        const nearest = family.map(compare).sort((a, b) => a.novelty - b.novelty || a.distance - b.distance)[0];
        const distinct = nearest?.novelty ?? 1;

        const tier = palette.best?.includes(id) ? 'best' : palette.base?.includes(id) ? 'base' : palette.sparingly?.includes(id) ? 'sparingly' : null;
        const rank =
          (mean / 100) * (0.3 + 0.7 * distinct) +
          (0.15 * great) / scores.length +
          (0.25 * fresh) / scores.length +
          (tier === 'best' ? 0.06 : tier === 'base' ? 0.02 : tier === 'sparingly' ? -0.08 : 0);

        // Teile des ersten Partner-Platzes, die am meisten gewinnen (z. B. Oberteile, zu denen es noch keine gute Hose gibt)
        const gainBy = new Map();
        combos.forEach(([a], i) => gainBy.set(a, (gainBy.get(a) ?? 0) + scores[i] - best[i]));
        const partnerIds = [...gainBy]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([p]) => p.id);

        const typeLabel = subLabel(category, type.sub);
        const describe = (n) => `${n.item.data.name}, ${colorLabel(n.item.data.colors[0])}`;
        const reasons = [`sehr stimmig mit ${Math.round((great / scores.length) * 100)} % deiner Kombinationen aus ${withText}`];
        if (fresh) reasons.push(`${fresh} neue sehr stimmige Kombination${fresh === 1 ? '' : 'en'}`);
        if (!nearest) reasons.push(`${PLURAL[type.sub] ?? typeLabel} hast du noch nicht`);
        else if (nearest.novelty <= SIMILAR_NOVELTY) reasons.push(`ähnlich wie ${describe(nearest)}`);
        else reasons.push(`neue Farbe (am nächsten: ${describe(nearest)})`);
        if (tier === 'best') reasons.push('steht dir besonders');
        if (tier === 'base') reasons.push('Basisfarbe aus deiner Palette');
        if (tier === 'sparingly') reasons.push('laut Profil sparsam einsetzen');

        return {
          key: gapKey(slot, type.sub, id),
          color: id,
          colorLabel: colorLabel(id),
          subcategory: type.sub,
          family: familyOf(type.sub).join(),
          name: `${typeLabel} in ${colorLabel(id)}`,
          share,
          great,
          fresh,
          distinct,
          rank,
          reasons,
          partners: partnerIds,
        };
      });
    });

    // Praktisch gleiche Teile hast du schon
    const sorted = candidates.filter((c) => c.distinct > 0).sort((a, b) => b.rank - a.rank);
    return { slot, label, owned: owned.length, counted, combos: combos.length, candidates: sorted };
  });
}
