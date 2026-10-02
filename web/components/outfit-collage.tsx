import { ItemThumb } from "./item-card";
import type { Item } from "@/lib/types";

/** Bis zu 4 Teile eines Outfits als 2×2-Raster */
export function OutfitCollage({ items }: { items: Item[] }) {
  const shown = items.slice(0, 4);
  return (
    <div className={`grid aspect-square gap-0.5 bg-line ${shown.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {shown.map((item) => (
        <div key={item.id} className={`overflow-hidden bg-surface-2 ${shown.length === 3 && item === shown[0] ? "row-span-2" : ""}`}>
          <ItemThumb item={item} />
        </div>
      ))}
      {shown.length === 0 && <div className="bg-surface-2" />}
    </div>
  );
}
