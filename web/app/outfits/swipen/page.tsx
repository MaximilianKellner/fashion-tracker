import { getItems, getOutfits, getProfile } from "@/lib/data";
import { SwipeDeck } from "@/components/swipe-deck";
import { currentSeason } from "@/lib/labels";

// Kategorien, die in Outfits vorkommen (Unterwäsche zu swipen hilft keinem Vorschlag)
const SWIPEABLE = new Set(["oberteil", "hose", "jacke", "schuhe", "kleid", "accessoire", "sport"]);

// Bei jedem Aufruf neu gemischt; Server und Browser mischen mit demselben Seed gleich
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

export default async function SwipePage() {
  const [items, outfits, profile] = await Promise.all([getItems(), getOutfits(), getProfile()]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Swipen</h1>
      <SwipeDeck
        items={items.filter((i) => i.data.status === "aktiv" && SWIPEABLE.has(i.data.category))}
        outfits={outfits.map((o) => ({ items: o.data.items, rating: o.data.rating }))}
        palette={profile.data.palette}
        season={currentSeason()}
        seed={newSeed()}
      />
    </div>
  );
}
