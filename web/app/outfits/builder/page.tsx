import { getItems, getOutfit, getOutfits, getProfile } from "@/lib/data";
import { OutfitBuilder } from "@/components/outfit-builder";

// Jahreszeit nach Monat (Dezember bis Februar Winter usw.)
const SEASON_BY_MONTH = ["winter", "winter", "fruehling", "fruehling", "fruehling", "sommer", "sommer", "sommer", "herbst", "herbst", "herbst", "winter"];

export default async function OutfitBuilderPage({ searchParams }: PageProps<"/outfits/builder">) {
  const { items: itemParam, outfit: outfitParam } = await searchParams;
  const [items, outfits, profile] = await Promise.all([getItems(), getOutfits(), getProfile()]);

  // ?outfit=<id> bearbeitet ein gespeichertes Outfit, ?items=a,b startet mit diesen Teilen
  const outfit = typeof outfitParam === "string" ? await getOutfit(outfitParam) : null;
  const start = outfit?.data.items ?? (typeof itemParam === "string" ? itemParam.split(",") : []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{outfit ? `${outfit.data.name} bearbeiten` : "Outfit-Builder"}</h1>
      <p className="mb-4 text-sm text-muted">
        Wähle einen Platz und ein Teil. Die Vorschläge sortieren sich live danach, wie gut Farben, Formalität und Saison zum Rest passen.
      </p>
      <OutfitBuilder
        items={items.filter((i) => i.data.status === "aktiv" || start.includes(i.id))}
        outfits={outfits.map((o) => ({ items: o.data.items, rating: o.data.rating }))}
        palette={profile.data.palette}
        initialItems={start}
        initialSeasons={outfit?.data.seasons?.length ? outfit.data.seasons : [SEASON_BY_MONTH[new Date().getMonth()]]}
        outfit={outfit ? { id: outfit.id, data: outfit.data, body: outfit.body } : undefined}
      />
    </div>
  );
}
