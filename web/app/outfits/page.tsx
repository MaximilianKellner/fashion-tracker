import Link from "next/link";
import { getItems, getOutfits } from "@/lib/data";
import { label } from "@/lib/labels";
import { OutfitCollage } from "@/components/outfit-collage";
import type { Item } from "@/lib/types";

export default async function OutfitsPage() {
  const [outfits, items] = await Promise.all([getOutfits(), getItems()]);
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Outfits</h1>
        <div className="flex gap-2">
          <Link href="/outfits/new" className="btn-ghost">
            Aus Liste
          </Link>
          <Link href="/outfits/builder" className="btn-primary">
            Outfit bauen
          </Link>
        </div>
      </div>

      {outfits.length === 0 ? (
        <div className="mx-auto max-w-md py-16 text-center text-muted">
          <p>Noch keine Outfits gespeichert.</p>
          <p className="mt-2">
            Stell eins selbst zusammen oder frag Claude im Repo mit <code>/outfit büro</code> nach Vorschlägen.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {outfits.map((o) => (
            <Link key={o.id} href={`/outfits/${o.id}`} className="block overflow-hidden rounded-xl border border-line bg-surface">
              <OutfitCollage items={o.data.items.map((id) => byId.get(id)).filter((i): i is Item => !!i)} />
              <div className="p-2.5">
                <div className="truncate text-sm font-medium">{o.data.name}</div>
                <div className="mt-0.5 flex justify-between text-xs text-muted">
                  <span className="truncate">{[label(o.data.occasion), o.data.source === "claude" ? "von Claude" : ""].filter(Boolean).join(" · ")}</span>
                  {o.data.rating && <span className="shrink-0">{"★".repeat(o.data.rating)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
