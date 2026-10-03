import Link from "next/link";
import { parseImport } from "@/lib/import";
import { euro, label } from "@/lib/labels";
import { ColorDot } from "@/components/item-card";
import { Photo } from "@/components/photo";

// Ziel des Lesezeichens "Zum Kleiderschrank": zeigt die erkannten Daten und fragt, wohin damit
export default async function ImportPage({ searchParams }: PageProps<"/import">) {
  const { d } = await searchParams;
  const product = parseImport(d);

  if (!product) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold">Keine Produktdaten</h1>
        <p className="mt-3 text-muted">Diese Seite wird vom Lesezeichen „Zum Kleiderschrank“ geöffnet.</p>
        <Link href="/bookmarklet" className="btn-primary mt-6">
          Lesezeichen einrichten
        </Link>
      </div>
    );
  }

  const q = `import=${encodeURIComponent(d as string)}`;
  const facts = [
    ["Kategorie", [label(product.category), label(product.subcategory)].filter(Boolean).join(" · ")],
    ["Material", product.materialRaw],
    ["Schnitt", product.fit],
    ["Muster", label(product.pattern)],
    ["Shop", product.shop],
  ].filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Aus dem Shop übernehmen</h1>
      <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        {product.images[0] ? (
          <Photo src={product.images[0]} remote lazy={false} className="aspect-[3/4] w-40 rounded-lg" />
        ) : (
          <div className="aspect-[3/4] w-40 rounded-lg bg-surface-2" />
        )}
        <div className="min-w-0">
          <div className="text-lg font-semibold">{product.name}</div>
          <div className="text-muted">{[product.brand, euro(product.price)].filter((v) => v && v !== "–").join(" · ")}</div>
          {product.colors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <span key={c} className="chip">
                  <ColorDot color={c} /> {label(c)}
                </span>
              ))}
            </div>
          )}
          <dl className="mt-3 space-y-1 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {!product.category && <p className="mt-2 text-sm text-danger">Kategorie nicht erkannt, bitte im nächsten Schritt wählen.</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href={`/items/new?${q}`} className="btn-primary py-3">
          Habe ich gekauft → Kleiderschrank
        </Link>
        <Link href={`/wishlist/new?${q}`} className="btn-ghost py-3">
          Auf die Wunschliste
        </Link>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Im nächsten Schritt kannst du alles prüfen und anpassen, auch die Größe.</p>
    </div>
  );
}
