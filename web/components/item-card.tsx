import Link from "next/link";
import { photoUrl } from "@/lib/data";
import { label, swatch } from "@/lib/labels";
import type { Item } from "@/lib/types";

export function ColorDot({ color, size = "h-3 w-3" }: { color: string; size?: string }) {
  return (
    <span
      title={label(color)}
      className={`inline-block shrink-0 rounded-full border border-black/15 ${size}`}
      style={{ backgroundColor: swatch(color) }}
    />
  );
}

export function ItemThumb({ item, className = "" }: { item: Item; className?: string }) {
  const src = photoUrl(item);
  return src ? (
    // Fotos sind bereits auf 1024px optimiert, next/image wäre hier unnötiger Aufwand
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={item.data.name} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-surface-2 ${className}`}>
      <ColorDot color={item.data.colors?.[0] ?? ""} size="h-8 w-8" />
    </div>
  );
}

export function ItemCard({ item }: { item: Item }) {
  const { data } = item;
  return (
    <Link href={`/items/${item.id}`} className="group block overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative aspect-[3/4] overflow-hidden">
        <ItemThumb item={item} className="transition-transform group-hover:scale-[1.02]" />
        {data.status !== "aktiv" && (
          <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs text-muted">{label(data.status)}</span>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-sm font-medium">{data.name}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          {data.colors?.slice(0, 4).map((c) => <ColorDot key={c} color={c} />)}
          <span className="truncate">{[data.brand, label(data.subcategory ?? data.category)].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
    </Link>
  );
}
