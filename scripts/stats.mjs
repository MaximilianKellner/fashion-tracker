// Aufruf: npm run stats [-- --json]
import { readItems, readOutfits, readWishlist } from './lib/data.mjs';
import { computeStats } from './lib/stats.mjs';

const stats = computeStats(await readItems(), await readOutfits(), await readWishlist());
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(stats, null, 2));
} else {
  const line = (label, obj) =>
    console.log(`${label}: ${Object.entries(obj).map(([k, v]) => `${k} ${v}`).join(', ') || '–'}`);
  console.log(`Teile: ${stats.items.active} aktiv / ${stats.items.total} gesamt`);
  line('Kategorien', stats.byCategory);
  line('Farben', stats.byColor);
  line('Saisons', stats.bySeason);
  line('Marken', stats.byBrand);
  console.log(`Wert (aktiv): ${stats.value.totalActive} € (${stats.value.itemsWithoutPrice} Teile ohne Preis)`);
  line('Wert pro Kategorie (€)', stats.value.byCategory);
  line('Ausgaben pro Jahr (€)', stats.value.spendByYear);
  console.log(`Outfits: ${stats.outfits.total}, Teile in keinem Outfit: ${stats.outfits.itemsNotInAnyOutfit.length}`);
  console.log(`Wunschliste: ${stats.wishlist.open} offen (${stats.wishlist.openValue} €)`);
}
