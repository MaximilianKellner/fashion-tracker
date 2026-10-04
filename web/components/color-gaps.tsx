import { colorGaps } from "@lib/color-gaps.mjs";
import { getItems, getProfile } from "@/lib/data";
import { ColorGapList, type GapGroup, type PartnerInfo } from "./color-gap-list";

/** Welche Farbe würde Hosen, Oberteile, Schuhe und Jacken am meisten ergänzen? Berechnet aus dem Schrank (color-gaps.mjs). */
export async function ColorGaps() {
  const [items, profile] = await Promise.all([getItems(), getProfile()]);
  const groups: GapGroup[] = colorGaps(items, { palette: profile.data.palette, hidden: profile.data.hidden_gaps });

  // Nur was die Karten für die Fotos der passenden Teile brauchen
  const byId = new Map(items.map((i) => [i.id, i]));
  const partners: Record<string, PartnerInfo> = {};
  for (const id of groups.flatMap((g) => g.suggestions.flatMap((s) => s.partners))) {
    const item = byId.get(id);
    if (item) partners[id] = { name: item.data.name, photo: item.data.photos?.[0], color: item.data.colors?.[0] };
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted">Welche Farbe fehlt?</h2>
      <p className="mb-3 mt-0.5 text-xs text-muted">
        Jede Farbe aus deiner Palette in verschiedenen Arten als neues Teil gegen alle Kombinationen im Schrank bewertet, wie im
        Outfit-Builder. Vorne steht, was am vielseitigsten ist und sich am deutlichsten von dem unterscheidet, was du schon hast.
        Mit ✕ blendest du einen Vorschlag dauerhaft aus.
      </p>
      <ColorGapList groups={groups} partners={partners} />
    </section>
  );
}
