// Outfit-Builder: bewertet, wie gut ein Teil zu einem angefangenen Outfit passt.
// Rein und ohne Node-Abhängigkeiten, läuft im Browser (Website) und in Node (Skripte, Claude).
//
// Grundidee: Farben werden in OKLCH (wahrgenommene Helligkeit, Buntheit, Farbton) umgerechnet.
// Neutrale Farben (Schwarz bis Beige, Brauntöne, Navy, Denim) passen fast zu allem; zwei bunte Farben passen,
// wenn sie im Farbkreis nah beieinander (Ton in Ton) oder gegenüber (Komplementär) liegen und nicht beide grell sind.
// Verglichen werden alle Farben aller Teile, gewichtet danach, wie sichtbar ein Teil ist (Jacke außen voll, Shirt darunter wenig).
// Dazu kommen Regeln für Schichten (keine zwei Jacken oder Pullover übereinander), Muster, Anzahl der Farben, Formalität,
// Saison, die Farbpalette aus dem Profil und gespeicherte Outfits (was schon zusammen getragen wurde).

import { colorInfo } from './colors.mjs';
import { SUBCATEGORIES } from './schema.mjs';

// ---------- Plätze im Outfit ----------

/** Plätze im Builder, in der Reihenfolge, in der sie gefüllt werden */
export const SLOTS = [
  { id: 'oberteil', label: 'Oberteil', required: true },
  { id: 'hose', label: 'Hose', required: true },
  { id: 'schuhe', label: 'Schuhe', required: true },
  { id: 'jacke', label: 'Jacke' },
  { id: 'darunter', label: 'Darunter' },
  { id: 'kopf', label: 'Kopf' },
  { id: 'accessoire', label: 'Accessoire' },
];

const HEADWEAR = new Set(['cap', 'muetze']);
const SPORT_SLOTS = { sportshirt: 'oberteil', sporthose: 'hose', trainingsjacke: 'jacke', sportschuh: 'schuhe', badehose: 'hose' };

// ---------- Schichten ----------

// Wie weit außen ein Teil sitzt: 1 Shirt, 2 Hemd, 3 Pullover/Fleece, 4 Jacke, 5 Mantel und Wetterjacke.
// Pro Schicht nur ein Teil; ein Teil mit kleinerer Zahl kann unter einem mit größerer getragen werden.
const LAYERS = {
  tanktop: 1, 't-shirt': 1, longsleeve: 1, polo: 1, sportshirt: 1,
  hemd: 2,
  strickpullover: 3, rollkragenpullover: 3, cardigan: 3, sweatshirt: 3, hoodie: 3, 'quarter-zip': 3, fleecejacke: 3,
  trainingsjacke: 3,
  blouson: 4, overshirt: 4, jeansjacke: 4, lederjacke: 4, bomberjacke: 4, softshelljacke: 4, blazer: 4, weste: 4,
  steppjacke: 5, parka: 5, regenjacke: 5, mantel: 5,
};
// Jacken, die man trotzdem unter einem Mantel tragen kann
const UNDER_COAT = new Set(['blazer', 'weste', 'overshirt']);
const COATS = new Set(['mantel', 'parka']);

/** Schicht eines Oberteils oder einer Jacke (undefined für alles andere) */
export function layerOf(item) {
  const { category, subcategory } = item.data;
  if (LAYERS[subcategory]) return LAYERS[subcategory];
  return { oberteil: 1, jacke: 4 }[category];
}

const subLabel = (item) => SUBCATEGORIES[item.data.category]?.[item.data.subcategory] ?? item.data.name;

/** Passen zwei Teile nicht übereinander? Gibt den Grund zurück, sonst null */
function layerClash(a, b) {
  const la = layerOf(a), lb = layerOf(b);
  if (!la || !lb) return null;
  // Außen liegt die höhere Schicht, bei gleicher Schicht die Jacke (Fleece über Hoodie)
  const [inner, outer] = la < lb || (la === lb && a.data.category !== 'jacke') ? [a, b] : [b, a];
  const text = `${subLabel(outer)} über ${subLabel(inner)}`;
  if (la === lb && a.data.category === b.data.category) return `${[subLabel(a), subLabel(b)].sort().join(' und ')} übereinander`;
  if (la === lb) return text;
  // Zwei Jacken nur als Mantel über Sakko, Weste oder Overshirt
  if (la >= 4 && lb >= 4 && !(COATS.has(outer.data.subcategory) && UNDER_COAT.has(inner.data.subcategory))) return text;
  return null;
}

/** Plätze, in die ein Teil passt (leer: gar nicht, z. B. Unterwäsche) */
export function slotsFor(item) {
  const { category, subcategory } = item.data;
  switch (category) {
    case 'oberteil':
      // Darunter passen nur Shirts und Hemden, kein Pullover
      return layerOf(item) <= 2 ? ['oberteil', 'darunter'] : ['oberteil'];
    case 'kleid':
      return ['oberteil'];
    case 'hose':
      return ['hose'];
    case 'jacke':
      return ['jacke'];
    case 'schuhe':
      return ['schuhe'];
    case 'accessoire':
      return HEADWEAR.has(subcategory) ? ['kopf'] : ['accessoire'];
    case 'sport':
      return [SPORT_SLOTS[subcategory] ?? 'oberteil'];
    default:
      return [];
  }
}

// ---------- Farben ----------

/** Hex -> OKLCH: l 0..1, c ~0..0.37, h 0..360 */
function oklch(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

// In der Herrenmode wie Neutrale behandelt, obwohl sie etwas Farbe haben
const STYLE_NEUTRALS = new Set(['navy', 'denim', 'hellblau', 'braun', 'cognac', 'camel', 'khaki', 'taupe', 'sand', 'beige', 'ecru', 'creme', 'oliv', 'silber', 'gold']);
// Neutrale Paare, die trotzdem oft unruhig wirken
const NEUTRAL_CLASHES = { 'braun|schwarz': 0.55, 'navy|schwarz': 0.5, 'cognac|schwarz': 0.6, 'gold|silber': 0.4 };
// … aber nur auf großen Flächen: schwarze Schuhe oder Cap zu Navy sind völlig normal
const SMALL_AREA_OK = new Set(['navy|schwarz']);

const cache = new Map();
function color(id) {
  if (!cache.has(id)) {
    const info = colorInfo(id);
    if (!info) cache.set(id, null);
    else {
      const o = oklch(info.hex);
      cache.set(id, { id, label: info.label, ...o, neutral: o.c < 0.045 || STYLE_NEUTRALS.has(id) });
    }
  }
  return cache.get(id);
}

const hueDistance = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Wie gut passen zwei Farben zusammen? score 0..1 und die Art der Beziehung */
export function colorPair(aId, bId) {
  const a = color(aId), b = color(bId);
  if (!a || !b) return { score: 0.6, kind: 'unbekannt' };
  if (aId === bId) return { score: a.neutral ? 0.85 : 0.75, kind: 'gleich' };

  if (a.neutral && b.neutral) {
    const clash = NEUTRAL_CLASHES[[aId, bId].sort().join('|')];
    if (clash) return { score: clash, kind: 'neutral-clash' };
    // Neutrale mit etwas Helligkeitsabstand wirken ruhiger als zwei fast gleiche
    return { score: 0.82 + Math.min(0.1, Math.abs(a.l - b.l) * 0.25), kind: 'neutral' };
  }
  if (a.neutral || b.neutral) {
    const [n, col] = a.neutral ? [a, b] : [b, a];
    // Neutral erdet eine Farbe; Kontrast in der Helligkeit hilft, kräftige Farben bekommen etwas Abzug
    return { score: 0.78 + Math.min(0.12, Math.abs(n.l - col.l) * 0.3) - Math.max(0, col.c - 0.17) * 0.6, kind: 'neutral-akzent' };
  }

  const dh = hueDistance(a.h, b.h);
  const bothLoud = a.c > 0.14 && b.c > 0.14;
  let score, kind;
  if (dh < 25) [score, kind] = [0.82, 'ton-in-ton'];
  else if (dh < 55) [score, kind] = [0.7, 'analog'];
  // Ab ca. 110° gilt es in der Mode schon als Komplementär (Rot/Grün, Blau/Orange liegen im Malerfarbkreis gegenüber)
  else if (dh < 110) [score, kind] = [0.32, 'beissend'];
  else [score, kind] = [bothLoud ? 0.45 : 0.68, 'komplementaer'];
  if (bothLoud) score -= 0.12;
  if (kind === 'ton-in-ton') score += Math.min(0.08, Math.abs(a.l - b.l) * 0.3); // hell/dunkel im selben Ton
  return { score: Math.max(0, Math.min(1, score)), kind };
}

// ---------- Formalität ----------

// Fallback, wenn ein Teil keine formality hat (1 Sport/Lounge ... 5 formell)
const DEFAULT_FORMALITY = {
  't-shirt': 2, longsleeve: 2, tanktop: 1, polo: 3, hemd: 4, strickpullover: 3, rollkragenpullover: 3, cardigan: 3,
  sweatshirt: 2, hoodie: 2, 'quarter-zip': 3, jeans: 2, chino: 3, anzughose: 4, cordhose: 3, cargohose: 2,
  jogginghose: 1, shorts: 2, blouson: 3, overshirt: 2, fleecejacke: 1, jeansjacke: 2, lederjacke: 3,
  bomberjacke: 2, steppjacke: 2, parka: 2, regenjacke: 1, softshelljacke: 1, mantel: 4, blazer: 4, weste: 3,
  sneaker: 2, schnuerschuh: 4, loafer: 4, 'chelsea-boots': 3, stiefel: 3, sandale: 1, hausschuh: 1,
};
// Fallback, wenn ein Teil keine seasons hat
const DEFAULT_SEASONS = {
  shorts: ['fruehling', 'sommer'], tanktop: ['fruehling', 'sommer'], sandale: ['sommer'], badehose: ['sommer'],
  steppjacke: ['herbst', 'winter'], parka: ['herbst', 'winter'], mantel: ['herbst', 'winter'], muetze: ['herbst', 'winter'],
  rollkragenpullover: ['herbst', 'winter'], handschuhe: ['herbst', 'winter'], schal: ['herbst', 'winter'],
  strickpullover: ['fruehling', 'herbst', 'winter'], cardigan: ['fruehling', 'herbst', 'winter'],
  sweatshirt: ['fruehling', 'herbst', 'winter'], hoodie: ['fruehling', 'herbst', 'winter'],
  'quarter-zip': ['fruehling', 'herbst', 'winter'], fleecejacke: ['fruehling', 'herbst', 'winter'],
  softshelljacke: ['fruehling', 'herbst', 'winter'],
  blouson: ['fruehling', 'sommer', 'herbst'], jeansjacke: ['fruehling', 'sommer', 'herbst'], overshirt: ['fruehling', 'sommer', 'herbst'],
};
// Funktionsjacken: praktisch bei Wetter, wirken zu gepflegten Outfits aber sportlich
const FUNCTIONAL = new Set(['regenjacke', 'softshelljacke', 'fleecejacke', 'trainingsjacke']);
export const seasonsOf = (item) => (item.data.seasons?.length ? item.data.seasons : DEFAULT_SEASONS[item.data.subcategory]);

export const formalityOf = (item) => item.data.formality ?? DEFAULT_FORMALITY[item.data.subcategory] ?? (item.data.category === 'sport' ? 1 : undefined);

// ---------- Bewertung ----------

const isPatterned = (item) => item.data.pattern && item.data.pattern !== 'uni';
const isShoe = (item) => item.data.category === 'schuhe';
const isSmall = (item) => isShoe(item) || item.data.category === 'accessoire';
const isTop = (item) => layerOf(item) !== undefined && slotsFor(item).some((s) => s === 'oberteil' || s === 'jacke');
// Hauptfarbe zählt voll, Nebenfarben (Streifen, Sohle, Logo) weniger
const colorWeight = (index) => (index === 0 ? 1 : 0.4);

/**
 * Wie sichtbar ist jedes Teil im Outfit (0..1)? Das äußerste Oberteil voll, darunter immer weniger;
 * Hose voll, Schuhe und Accessoires kleiner. Danach werden Farbpaare gewichtet.
 */
export function visibility(items) {
  const map = new Map();
  const tops = items.filter(isTop).sort((a, b) => layerOf(b) - layerOf(a));
  tops.forEach((item, i) => map.set(item, [1, 0.7, 0.45][i] ?? 0.45));
  for (const item of items) {
    if (map.has(item)) continue;
    const { category, subcategory } = item.data;
    map.set(item, category === 'schuhe' ? 0.6 : category === 'accessoire' ? (HEADWEAR.has(subcategory) ? 0.5 : 0.35) : 1);
  }
  return map;
}

/** Bunte Farbfamilien (30°-Sektoren im Farbkreis) im Outfit, gewichtet nach Fläche */
function colorFamilies(items, vis) {
  const families = new Map();
  for (const item of items) {
    for (const [i, id] of (item.data.colors ?? []).entries()) {
      const c = color(id);
      if (!c || c.neutral) continue;
      const sector = Math.round(c.h / 30) % 12;
      families.set(sector, (families.get(sector) ?? 0) + colorWeight(i) * vis.get(item));
    }
  }
  // Ein kleiner Tupfer (Logo, Sohle) zählt nicht als eigene Farbe
  return new Set([...families].filter(([, w]) => w >= 0.3).map(([s]) => s));
}

/**
 * Wie gut passt `candidate` zu den schon gewählten Teilen?
 * context: { palette?: { best?: string[], sparingly?: string[] }, outfits?: [{ items: string[], rating?: number }], season?: string }
 * Ergebnis: { score 0..100, reasons: [{ text, good }] } – reasons nach Wichtigkeit sortiert.
 */
export function scoreCandidate(candidate, selected, context = {}) {
  const reasons = [];
  const colors = candidate.data.colors ?? [];
  const main = colors[0];
  let score;

  if (selected.length === 0) {
    score = 0.7;
  } else {
    const vis = visibility([...selected, candidate]);
    const own = vis.get(candidate);

    // Alle Farben des Kandidaten gegen alle Farben der übrigen Teile, gewichtet nach Haupt-/Nebenfarbe und Sichtbarkeit.
    // Das schlechteste deutlich sichtbare Paar zählt extra, damit ein Ausreißer nicht im Durchschnitt untergeht.
    let sum = 0, weight = 0, worst = null, best = null;
    for (const [ci, c] of colors.entries()) {
      for (const other of selected) {
        for (const [oi, o] of (other.data.colors ?? []).entries()) {
          const w = colorWeight(ci) * colorWeight(oi) * own * vis.get(other);
          let pair = colorPair(c, o);
          if (pair.kind === 'neutral-clash' && (isSmall(candidate) || isSmall(other)) && SMALL_AREA_OK.has([c, o].sort().join('|'))) {
            pair = { score: 0.82, kind: 'neutral' };
          }
          sum += pair.score * w;
          weight += w;
          if (w >= 0.2 && (!worst || pair.score < worst.score)) worst = { ...pair, a: c, b: o };
          // Bester Grund: Hauptfarben, sichtbarere Teile bevorzugt
          const rank = pair.score + 0.1 * vis.get(other);
          if (ci === 0 && oi === 0 && (!best || rank > best.rank)) best = { ...pair, a: c, b: o, rank };
        }
      }
    }
    score = weight ? sum / weight : 0.6;
    if (worst) score = 0.7 * score + 0.3 * Math.min(score, worst.score);
    if (best) {
      const other = colorInfo(best.b)?.label ?? best.b;
      const texts = {
        'ton-in-ton': `Ton in Ton mit ${other}`,
        analog: `harmoniert mit ${other}`,
        komplementaer: `Kontrast zu ${other}`,
        'neutral-akzent': color(best.a)?.neutral ? `neutral, erdet ${other}` : `Akzent zu ${other}`,
        neutral: 'ruhige neutrale Farben',
        gleich: `gleiche Farbe wie ${other}`,
      };
      if (best.score >= 0.75 && texts[best.kind]) reasons.push({ text: texts[best.kind], good: true });
    }
    if (worst && worst.score < 0.6) {
      const [a, b] = [colorInfo(worst.a)?.label ?? worst.a, colorInfo(worst.b)?.label ?? worst.b];
      reasons.push({ text: worst.kind === 'neutral-clash' ? `${[a, b].sort().join(' und ')} sind heikel` : `${a} beißt sich mit ${b}`, good: false });
    }

    // Mehr als zwei bunte Farbfamilien (über alle Farben aller Teile) wirken unruhig;
    // genau ein Akzent zu sonst neutralen Teilen ist das Ziel aus dem Profil
    const before = colorFamilies(selected, vis);
    const after = colorFamilies([...selected, candidate], vis);
    if (after.size > 2 && after.size > before.size) {
      score -= 0.15;
      reasons.push({ text: 'zu viele Farben', good: false });
    } else if (after.size === 1 && before.size === 0 && selected.length >= 2) {
      score += 0.02;
      reasons.push({ text: 'gezielter Farbakzent', good: true });
    }

    // Schuhe und Accessoires, die eine Farbe aus dem Outfit aufgreifen
    if (isSmall(candidate) && main && !['schwarz', 'weiss', 'grau'].includes(main) && selected.some((s) => s.data.colors?.includes(main))) {
      score += 0.04;
      reasons.push({ text: `greift ${colorInfo(main)?.label ?? main} auf`, good: true });
    }

    // Schichten: keine zwei Jacken, Pullover oder Hemden übereinander
    const clash = selected.map((other) => layerClash(candidate, other)).find(Boolean);
    if (clash) {
      score -= 0.3;
      reasons.push({ text: clash, good: false });
    }

    // Zwei Muster nur mit Vorsicht
    if (isPatterned(candidate) && selected.some(isPatterned)) {
      score -= 0.12;
      reasons.push({ text: 'zweites Muster', good: false });
    }

    // Formalität: Abstand zum Schnitt der gewählten Teile. Schuhe dürfen bewusst brechen
    // (Sneaker zur Bundfaltenhose), deshalb zählen sie nicht in den Schnitt und haben mehr Spielraum.
    const f = formalityOf(candidate);
    const others = selected.filter((s) => isShoe(candidate) || !isShoe(s)).map(formalityOf).filter((x) => x !== undefined);
    const mean = others.length ? others.reduce((s, x) => s + x, 0) / others.length : undefined;
    const tolerance = isShoe(candidate) ? 2.25 : 1.75;
    if (f !== undefined && mean !== undefined) {
      const gap = Math.abs(f - mean);
      if (gap > tolerance) {
        score -= 0.08 * (gap - tolerance + 0.5);
        reasons.push({ text: f > mean ? 'zu schick dafür' : 'zu lässig dafür', good: false });
      }
    }
    // Funktionsjacken nur zu sportlichen Outfits
    if (FUNCTIONAL.has(candidate.data.subcategory) && mean !== undefined && mean >= 2) {
      score -= 0.06;
      reasons.push({ text: 'Funktionsjacke wirkt hier sportlich', good: false });
    }

    // Saison: keine Überschneidung mit den gewählten Teilen
    const seasons = seasonsOf(candidate);
    const shared = selected.map(seasonsOf).filter((s) => s?.length);
    if (seasons?.length && shared.some((s) => !s.some((x) => seasons.includes(x)))) {
      score -= 0.1;
      reasons.push({ text: 'andere Saison', good: false });
    }

    // Schon zusammen in einem gespeicherten Outfit
    const ids = new Set(selected.map((s) => s.id));
    const together = (context.outfits ?? []).filter((o) => o.items.includes(candidate.id) && o.items.some((i) => ids.has(i)));
    if (together.length) {
      const rating = Math.max(...together.map((o) => o.rating ?? 3));
      score += 0.04 + 0.02 * (rating - 3);
      reasons.push({ text: 'schon zusammen getragen', good: true });
    }
  }

  // Farbpalette aus dem Profil
  if (context.palette?.best?.includes(main)) {
    score += 0.04;
    if (selected.length === 0) reasons.push({ text: 'steht dir besonders', good: true });
  }
  if (context.palette?.sparingly?.includes(main)) score -= 0.03;

  // Gewählte Saison als Filter-Hinweis
  const own = seasonsOf(candidate);
  if (context.season && own?.length && !own.includes(context.season)) {
    score -= 0.15;
    reasons.push({ text: 'nicht für diese Saison', good: false });
  }

  reasons.sort((a, b) => Number(a.good) - Number(b.good)); // Probleme zuerst
  return { score: Math.round(Math.max(0, Math.min(1, score)) * 100), reasons };
}

/**
 * Gesamturteil über ein Outfit: jedes Teil gegen die übrigen, gewichtet nach Sichtbarkeit.
 * Das schwächste Teil zählt extra, damit ein einzelner Fehlgriff auffällt.
 * Ergebnis: { score, verdict, problems: string[] } oder null bei weniger als zwei Teilen.
 */
export function scoreOutfit(selected, context = {}) {
  if (selected.length < 2) return null;
  const vis = visibility(selected);
  let sum = 0, weight = 0, min = 100;
  const problems = new Set();
  for (const item of selected) {
    const { score, reasons } = scoreCandidate(item, selected.filter((s) => s !== item), context);
    sum += score * vis.get(item);
    weight += vis.get(item);
    min = Math.min(min, score);
    for (const r of reasons) if (!r.good) problems.add(r.text);
  }
  const score = Math.round(0.7 * (sum / weight) + 0.3 * min);
  const verdict = score >= 80 ? 'Sehr stimmig' : score >= 68 ? 'Stimmig' : score >= 55 ? 'Mutig' : 'Unruhig';
  return { score, verdict, problems: [...problems] };
}

/**
 * Füllt leere Plätze (standardmäßig Oberteil, Hose, Schuhe) so, dass das ganze Outfit möglichst stimmig ist.
 * Statt Platz für Platz das gerade beste Teil zu nehmen, werden mehrere Kombinationen parallel verfolgt
 * und mit scoreOutfit verglichen (Beam-Suche).
 * random 0..1: würfelt viele Outfits aus guten Kandidaten und nimmt zufällig eines der stimmigsten (für „Würfeln“).
 */
export function completeOutfit(chosen, items, context = {}, { slots = ['oberteil', 'hose', 'schuhe'], random = 0 } = {}) {
  const open = slots.filter((s) => !chosen[s]);
  const filled = (partial) => Object.values(partial).filter(Boolean);
  const rank = (partial, slot) => {
    const selected = filled(partial);
    const used = new Set(selected.map((s) => s.id));
    return items
      .filter((i) => !used.has(i.id) && slotsFor(i).includes(slot))
      .map((i) => ({ item: i, score: scoreCandidate(i, selected, context).score }))
      .sort((a, b) => b.score - a.score);
  };
  const total = (partial) => {
    const selected = filled(partial);
    return scoreOutfit(selected, context)?.score ?? (selected[0] ? scoreCandidate(selected[0], [], context).score : 0);
  };

  if (random) {
    const runs = [];
    for (let n = 0; n < 24; n++) {
      const partial = { ...chosen };
      for (const slot of open) {
        const ranked = rank(partial, slot);
        if (!ranked.length) continue;
        const pool = ranked.filter((r) => r.score >= ranked[0].score - 12).slice(0, 5);
        partial[slot] = pool[Math.floor(Math.random() * pool.length)].item;
      }
      runs.push({ partial, score: total(partial) });
    }
    const top = Math.max(...runs.map((r) => r.score));
    const good = runs.filter((r) => r.score >= top - 5);
    return good[Math.floor(Math.random() * good.length)].partial;
  }

  // Ohne gewähltes Teil sagt die Bewertung noch wenig: dann breiter starten
  let beam = [{ partial: { ...chosen }, score: 0 }];
  for (const slot of open) {
    const next = [];
    for (const { partial } of beam) {
      const ranked = rank(partial, slot).slice(0, filled(partial).length ? 6 : 40);
      if (!ranked.length) next.push({ partial, score: total(partial) });
      for (const { item } of ranked) {
        const extended = { ...partial, [slot]: item };
        next.push({ partial: extended, score: total(extended) });
      }
    }
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, filled(next[0].partial).length < 2 ? 40 : 8);
  }
  return beam[0].partial;
}
