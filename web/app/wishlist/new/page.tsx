import { importNotes, parseImport } from "@/lib/import";
import { WishForm } from "@/components/wish-form";

export default async function NewWishPage({ searchParams }: PageProps<"/wishlist/new">) {
  const { import: importParam, name, category, fills_gap, reason } = await searchParams;
  // Vom Lesezeichen "Zum Kleiderschrank"
  const product = parseImport(importParam);
  // Aus „Welche Farbe fehlt?“ unter Empfehlungen: ?name=…&category=…&fills_gap=…&reason=…
  const text = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const data = product
    ? { name: [product.brand, product.name].filter(Boolean).join(" "), category: product.category, price: product.price, link: product.link }
    : { name: text(name), category: text(category), fills_gap: text(fills_gap), reason: text(reason) };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Neuer Wunsch</h1>
      <WishForm data={data} body={product ? importNotes(product) : ""} importedPhotos={product?.images} />
    </div>
  );
}
