// Quelltext des Lesezeichens "Zum Kleiderschrank". Er läuft auf der Shop-Seite im Browser des Nutzers,
// liest die schema.org-Produktdaten (JSON-LD) und Open-Graph-Tags aus und öffnet /import mit den Rohdaten.
// Bewusst als String und ohne Abhängigkeiten, damit kein Build-Schritt ihn verändert.
// Mit dryRun = true gibt die Funktion die Daten zurück, statt etwas zu öffnen (zum Testen).

export const BOOKMARKLET_SOURCE = String.raw`(function (origin, dryRun) {
  var flat = [];
  function collect(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(collect); return; }
    flat.push(node);
    if (node['@graph']) collect(node['@graph']);
  }
  document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
    try { collect(JSON.parse(s.textContent)); } catch (e) {}
  });
  function isType(n, t) { var x = n['@type']; return x === t || (Array.isArray(x) && x.indexOf(t) >= 0); }
  var group = flat.find(function (n) { return isType(n, 'ProductGroup'); });
  var product = flat.find(function (n) { return isType(n, 'Product') && !n.isVariantOf; }) || null;
  var base = group || product || {};

  /* Variante zur geöffneten URL wählen (H&M: Farbe steckt im Pfad, Zara: ?v1=, About You: ?vid=).
     Keine Zeilenkommentare im Quelltext: das Lesezeichen wird zu einer Zeile zusammengefügt. */
  function key(u) {
    try { var x = new URL(u, location.href); return x.pathname + '|' + (x.searchParams.get('v1') || '') + (x.searchParams.get('vid') || ''); } catch (e) { return ''; }
  }
  function offerUrl(v) { var o = Array.isArray(v.offers) ? v.offers[0] : v.offers; return (o && o.url) || v.url || ''; }
  var variants = (group && group.hasVariant) || [];
  var here = key(location.href), herePath = location.pathname;
  var variant = variants.find(function (v) { return key(offerUrl(v)) === here; })
    || variants.find(function (v) { try { return new URL(offerUrl(v), location.href).pathname === herePath; } catch (e) { return false; } })
    || variants.find(function (v) { return v.color && document.title.toLowerCase().indexOf(String(v.color).toLowerCase()) >= 0; })
    || variants[0] || product || {};

  function meta(p) { var m = document.querySelector('meta[property="' + p + '"], meta[name="' + p + '"]'); return m ? m.content : ''; }
  function first(v) { return Array.isArray(v) ? v[0] : v; }
  function offer(n) { var o = n && first(n.offers); return o || {}; }
  function imgs(v) { if (!v) return []; v = Array.isArray(v) ? v : [v]; return v.map(function (i) { return typeof i === 'string' ? i : i && (i.url || i.contentUrl); }).filter(Boolean); }
  function brandName(b) { b = first(b); return typeof b === 'string' ? b : (b && b.name) || ''; }

  var crumbs = [];
  flat.filter(function (n) { return isType(n, 'BreadcrumbList'); }).forEach(function (b) {
    (b.itemListElement || []).forEach(function (el) { var n = el.name || (el.item && el.item.name); if (n) crumbs.push(n); });
  });

  var images = imgs(variant.image).concat(imgs(base.image));
  if (meta('og:image')) images.push(meta('og:image'));
  images = images.filter(function (u, i) { return images.indexOf(u) === i; }).slice(0, 4);

  var data = {
    url: location.href.split('#')[0],
    name: base.name || variant.name || meta('og:title') || (document.querySelector('h1') || {}).innerText || document.title,
    brand: brandName(base.brand) || brandName(variant.brand) || meta('og:site_name'),
    price: offer(variant).price || offer(base).price || (offer(base).lowPrice) || meta('product:price:amount') || meta('og:price:amount'),
    color: variant.color || base.color || '',
    material: variant.material || base.material || '',
    pattern: variant.pattern || base.pattern || '',
    category: base.category || '',
    breadcrumbs: crumbs.slice(-3),
    images: images,
    description: String(base.description || meta('og:description') || '').slice(0, 400),
    site: meta('og:site_name') || location.hostname.replace(/^www\d*\./, '')
  };
  if (dryRun) return data;
  if (!base.name && !meta('og:title')) { alert('Auf dieser Seite wurden keine Produktdaten gefunden.'); return; }
  window.open(origin + '/import?d=' + encodeURIComponent(JSON.stringify(data)), '_blank');
})`;

/** Fertiges javascript:-Lesezeichen, das auf die Website unter `origin` zeigt. */
export function bookmarkletHref(origin: string) {
  const code = `${BOOKMARKLET_SOURCE}(${JSON.stringify(origin)});void 0`;
  return `javascript:${encodeURIComponent(code.replace(/\n\s*/g, " "))}`;
}
