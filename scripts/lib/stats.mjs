// Kennzahlen zum Kleiderschrank, genutzt von scripts/stats.mjs und der Website.

export function computeStats(items, outfits, wishlist) {
  const active = items.filter((i) => i.data.status === 'aktiv');
  const count = (list, key) => {
    const result = {};
    for (const i of list) {
      const values = [i.data[key]].flat().filter(Boolean);
      for (const v of values) result[v] = (result[v] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1]));
  };

  const valueByCategory = {};
  const spendByYear = {};
  let totalValue = 0;
  let withoutPrice = 0;
  for (const i of items) {
    const price = i.data.purchase?.price;
    if (typeof price !== 'number') {
      withoutPrice++;
      continue;
    }
    if (i.data.status === 'aktiv') {
      totalValue += price;
      valueByCategory[i.data.category] = (valueByCategory[i.data.category] ?? 0) + price;
    }
    const year = String(i.data.purchase?.date ?? '').slice(0, 4) || 'unbekannt';
    spendByYear[year] = (spendByYear[year] ?? 0) + price;
  }

  // Teile, die in keinem gespeicherten Outfit vorkommen
  const used = new Set(outfits.flatMap((o) => o.data.items ?? []));
  const notInOutfit = active.filter((i) => !used.has(i.id)).map((i) => i.id);

  return {
    items: { total: items.length, active: active.length, byStatus: count(items, 'status') },
    byCategory: count(active, 'category'),
    byColor: count(active, 'colors'),
    bySeason: count(active, 'seasons'),
    byBrand: count(active, 'brand'),
    value: {
      totalActive: round(totalValue),
      byCategory: mapValues(valueByCategory, round),
      spendByYear: mapValues(spendByYear, round),
      itemsWithoutPrice: withoutPrice,
    },
    outfits: { total: outfits.length, itemsNotInAnyOutfit: notInOutfit },
    wishlist: {
      open: wishlist.filter((w) => w.data.status === 'offen').length,
      openValue: round(
        wishlist.filter((w) => w.data.status === 'offen').reduce((s, w) => s + (w.data.price ?? 0), 0),
      ),
    },
  };
}

const round = (n) => Math.round(n * 100) / 100;
const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
