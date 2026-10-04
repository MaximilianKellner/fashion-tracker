// Farb-Lücken: Welche Farbe würde eine Kategorie (Hosen, Oberteile, Schuhe, Jacken) im vorhandenen Schrank am meisten ergänzen?
// Jede Farbe wird als gedachtes neues Teil mit allen Kombinationen der übrigen Plätze bewertet (scoreOutfit),
// dann nach Vielseitigkeit, Abstand zu den vorhandenen Farben und Profilpalette sortiert.
// Rein, ohne Node-Abhängigkeiten. Genutzt von der Website unter „Empfehlungen“.

import { COLORS, colorInfo } from './colors.mjs';
import { colorDistance, formalityOf, scoreOutfit, slotsFor } from './outfit-match.mjs';
import { SUBCATEGORIES } from './schema.mjs';

export const GAP_GROUPS = [
  { slot: 'hose', label: 'Hosen', dative: 'Hosen', counted: 'lange im Schrank', partners: ['oberteil', 'schuhe'], with: 'Oberteil und Schuhen' },
  { slot: 'oberteil', label: 'Oberteile', dative: 'Oberteilen', counted: 'im Schrank', partners: ['hose', 'schuhe'], with: 'Hose und Schuhen' },
  { slot: 'schuhe', label: 'Schuhe', dative: 'Schuhen', counted: 'Paar im Schrank', partners: ['oberteil', 'hose'], with: 'Oberteil und Hose' },
  { slot: 'jacke', label: 'Jacken', dative: 'Jacken', counted: 'im Schrank (ohne Funktionsjacken)', partners: ['oberteil', 'hose'], with: 'Oberteil und Hose' },
];

// Teile mit eigener Rolle: Shorts ersetzen keine lange Hose, eine Regenjacke keinen Blouson
const SPECIAL = new Set([
  'shorts', 'tanktop', 'regenjacke', 'softshelljacke', 'fleecejacke', 'trainingsjacke',
  'sportshirt', 'sporthose', 'badehose', 'sportschuh', 'hausschuh', 'jogginghose',
]);
// Hosen in diesen Farben sind als Jeans gedacht
const DENIM = new Set(['hellblau', 'denim', 'blau']);
const METALLIC = new Set(['gold', 'silber']);
// Ab hier gilt eine Kombination als stimmig bzw. sehr stimmig (wie das Urteil im Builder)
const OK = 68;
const GREAT = 80;
// Farbabstand (colorDistance): darunter praktisch gleich (Beige/Sand), ähnlich (Creme/Weiß), ab DISTINCT klar neu
const SAME = 0.05;
const SIMILAR = 0.08;
const DISTINCT = 0.12;

const colorLabel = (id) => colorInfo(id)?.label ?? id;
const subLabel = (category, sub) => SUBCATEGORIES[category]?.[sub] ?? sub;
const mostCommon = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
};
const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : undefined;
};

/**
 * Farbempfehlungen je Kategorie.
 * items: alle Teile (nur aktive zählen), palette: Profilpalette { best, base, sparingly }.
 * Ergebnis: [{ slot, label, owned: Anzahl vergleichbarer Teile, counted: was gezählt wurde, suggestions: [{ color, colorLabel, subcategory, name, share, great, fresh, reasons, partners: Item-IDs }] }]
 */
export function colorGaps(items, { palette = {}, limit = 3 } = {}) {
  const active = items.filter((i) => i.data.status === 'aktiv' && !SPECIAL.has(i.data.subcategory));
  const inSlot = (slot) => active.filter((i) => slotsFor(i)[0] === slot);
  // Kandidaten: die Farben aus der Profilpalette, ohne Palette alle außer Metallic
  const fromPalette = [...(palette.best ?? []), ...(palette.base ?? []), ...(palette.sparingly ?? [])];
  const colors = fromPalette.length ? [...new Set(fromPalette)].filter((id) => colorInfo(id)) : COLORS.map((c) => c.id).filter((id) => !METALLIC.has(id));

  return GAP_GROUPS.map(({ slot, label, dative, counted, partners, with: withText }) => {
    const owned = inSlot(slot);
    const [first, second] = partners.map(inSlot);
    const combos = first.flatMap((a) => second.map((b) => [a, b]));
    if (!combos.length) return { slot, label, owned: owned.length, counted, suggestions: [] };

    // Vorlage: die häufigste Unterkategorie und die typische Formalität der vorhandenen Teile
    const category = owned[0]?.data.category ?? slot;
    const template = mostCommon(owned.map((i) => i.data.subcategory).filter(Boolean));
    const formality = median(owned.map(formalityOf).filter(Boolean));
    // Bestes vorhandenes Teil je Kombination: woran sich eine neue Farbe messen muss
    const best = combos.map((c) => Math.max(0, ...owned.map((o) => scoreOutfit([...c, o], { palette }).score)));

    const candidates = colors.map((id) => {
      const jeans = slot === 'hose' && DENIM.has(id);
      const subcategory = jeans ? 'jeans' : template;
      const item = { id: `neu-${id}`, data: { category, subcategory, colors: [id], pattern: 'uni', formality: jeans ? 2 : formality } };
      const scores = combos.map((c) => scoreOutfit([...c, item], { palette }).score);
      const share = scores.filter((s) => s >= OK).length / scores.length;
      const great = scores.filter((s) => s >= GREAT).length;
      const fresh = scores.filter((s, i) => s >= GREAT && best[i] < GREAT).length;
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Nächste vorhandene Farbe in der Kategorie
      const nearest = owned
        .map((o) => ({ item: o, distance: colorDistance(id, o.data.colors?.[0]) }))
        .sort((a, b) => a.distance - b.distance)[0];
      const distance = nearest?.distance ?? 1;
      const distinct = Math.max(0, Math.min(1, (distance - SAME) / (DISTINCT - SAME)));

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

      const reasons = [`sehr stimmig mit ${Math.round((great / scores.length) * 100)} % deiner Kombinationen aus ${withText}`];
      if (fresh) reasons.push(`${fresh} neue sehr stimmige Kombination${fresh === 1 ? '' : 'en'}`);
      if (!nearest) reasons.push(`noch keine ${label} im Schrank`);
      else if (distance < SIMILAR) reasons.push(`ähnlich wie ${nearest.item.data.name} (${colorLabel(nearest.item.data.colors[0])})`);
      else reasons.push(`neue Farbe bei deinen ${dative} (am nächsten: ${colorLabel(nearest.item.data.colors[0])})`);
      if (tier === 'best') reasons.push('steht dir besonders');
      if (tier === 'base') reasons.push('Basisfarbe aus deiner Palette');
      if (tier === 'sparingly') reasons.push('laut Profil sparsam einsetzen');

      return {
        color: id,
        subcategory,
        name: `${subLabel(category, subcategory)} in ${colorLabel(id)}`,
        colorLabel: colorLabel(id),
        share,
        great,
        fresh,
        distinct,
        rank,
        reasons,
        partners: partnerIds,
      };
    });

    const suggestions = candidates
      .filter((c) => c.distinct > 0) // praktisch gleiche Farbe hast du schon
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);
    return { slot, label, owned: owned.length, counted, combos: combos.length, suggestions };
  });
}
