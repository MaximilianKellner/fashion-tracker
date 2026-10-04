// Übersetzt Rohdaten einer Shop-Produktseite (vom Lesezeichen "Zum Kleiderschrank") in das Datenschema
// und lädt Produktbilder herunter. Getestet mit Zara, H&M und About You (schema.org ProductGroup).
import dns from 'node:dns/promises';
import net from 'node:net';
import { normalizePrice } from './schema.mjs';
import { mapColors, translit } from './colors.mjs';
import { guessDefaults, guessFromText } from './item-guess.mjs';

export { mapColors };

// ---------- Text ----------

/** Entfernt unsichtbare Zeichen (About You hängt z. B. U+200C an Namen) und doppelte Leerzeichen. */
export function cleanText(text) {
  return String(text ?? '')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "STRICKPULLOVER MIT REISSVERSCHLUSS" -> "Strickpullover mit reissverschluss" (Großschreibung kennt man nicht) */
function fixCaps(text) {
  const letters = text.replace(/[^A-Za-zÄÖÜäöü]/g, '');
  if (letters && letters === letters.toUpperCase()) {
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return text;
}

// ---------- Material ----------

/** "100% baumwolle" -> "baumwolle", "Polyester/Elasthan" -> "polyester", "70% Wolle, 30% Polyamid" -> "wolle" */
export function mainMaterial(raw) {
  const text = translit(cleanText(raw));
  if (!text) return undefined;
  const parts = [...text.matchAll(/(\d{1,3})\s*%\s*([a-z-]+)/g)].map((m) => ({ pct: Number(m[1]), name: m[2] }));
  if (parts.length) return parts.sort((a, b) => b.pct - a.pct)[0].name;
  return text.split(/[\/,;]/)[0].trim().split(' ')[0] || undefined;
}

// ---------- Normalisieren ----------

const IMAGE_SIZE_PARAMS = ['w', 'width', 'imwidth'];

/** Nur https, keine Dubletten (gleiches Bild in anderer Größe), Größenparameter auf mind. 1024px anheben. */
function normalizeImages(urls) {
  const seen = new Set();
  const result = [];
  for (const raw of urls) {
    if (typeof raw !== 'string' || !raw.startsWith('https://')) continue;
    let u;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const id = u.origin + u.pathname;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const p of IMAGE_SIZE_PARAMS) {
      const n = Number(u.searchParams.get(p));
      if (n && n < 1024) u.searchParams.set(p, '1024');
    }
    u.searchParams.delete('height'); // sonst wird beschnitten bzw. verzerrt
    result.push(u.toString());
    if (result.length === 4) break;
  }
  return result;
}

/**
 * Rohdaten vom Lesezeichen -> Vorschlag für Kleidungsstück/Wunsch.
 * raw: { url, name, brand, price, color, material, pattern, category, breadcrumbs[], images[], description, site }
 */
export function normalizeProduct(raw) {
  const brand = cleanText(raw.brand) || undefined;
  let name = fixCaps(cleanText(raw.name));
  // Marke steht schon im eigenen Feld; Farbanhänge wie "- Braun" entfernen
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase() + ' ')) name = name.slice(brand.length + 1);
  name = name.replace(/\s+-\s+[^-]+$/, (m) => (mapColors(m.slice(3)).length ? '' : m)).trim();

  const breadcrumbs = (raw.breadcrumbs ?? []).map(cleanText).filter(Boolean);
  const description = cleanText(raw.description).slice(0, 400);
  // Name und Shop-Kategorie zuerst, Brotkrumen und Beschreibung als Fallback
  // Der ungekürzte Name, damit eine angehängte Farbe ("… - Beige") mitzählt
  const guess = guessFromText([cleanText(raw.name), raw.category, ...breadcrumbs.slice(-2)].join(' '), description);
  const { category, subcategory } = guess;
  const pattern = guessFromText(raw.pattern ?? '').pattern ?? guess.pattern;
  // Hauptmaterial in die üblichen Werte übersetzen ("merinowolle" -> "merino")
  const shopMaterial = mainMaterial(raw.material);
  const material = (shopMaterial && (guessFromText(shopMaterial).material ?? shopMaterial)) ?? guess.material;
  const colors = mapColors(raw.color ?? '');
  // Formalität und Saisons aus Unterkategorie, Material und Name, damit der Outfit-Builder alles hat
  const { formality, seasons } = guessDefaults({ category, subcategory, material, name, pattern });
  const price = normalizePrice(raw.price);
  const site = cleanText(raw.site) || (raw.url ? new URL(raw.url).hostname.replace(/^www\d*\./, '') : undefined);

  return {
    name: name || 'Unbenanntes Teil',
    brand,
    category,
    subcategory,
    colors: colors.length ? colors : guess.colors,
    material,
    materialRaw: cleanText(raw.material) || undefined,
    fit: guess.fit,
    pattern: pattern ?? 'uni',
    formality,
    seasons,
    price: price && price > 0 ? price : undefined,
    shop: site,
    link: typeof raw.url === 'string' && /^https?:\/\//.test(raw.url) ? raw.url : undefined,
    images: normalizeImages(raw.images ?? []),
    description,
  };
}

// ---------- Bilder herunterladen ----------

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:');
}

/** Nur öffentliche https-Adressen, damit niemand über die Website Geräte im Heimnetz abfragen kann. */
async function assertPublicHttps(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('Nur https-Bilder werden geladen');
  const addresses = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error('Adresse im lokalen Netz nicht erlaubt');
}

/** Lädt ein Produktbild herunter und gibt es als Buffer zurück (wird danach mit processPhoto verarbeitet). */
export async function downloadImage(url) {
  await assertPublicHttps(url);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'fashion-tracker/1.0 (privater Kleiderschrank)', Accept: 'image/*' },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  });
  if (res.url !== url) await assertPublicHttps(res.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('Kein Bild');
  if (Number(res.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES) throw new Error('Bild zu groß');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) throw new Error('Bild zu groß');
  return buf;
}
