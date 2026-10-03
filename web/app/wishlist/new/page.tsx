import { importNotes, parseImport } from "@/lib/import";
import { WishForm } from "@/components/wish-form";

export default async function NewWishPage({ searchParams }: PageProps<"/wishlist/new">) {
  const { import: importParam } = await searchParams;
  // Vom Lesezeichen "Zum Kleiderschrank"
  const product = parseImport(importParam);
  const data = product
    ? { name: [product.brand, product.name].filter(Boolean).join(" "), category: product.category, price: product.price, link: product.link }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Neuer Wunsch</h1>
      <WishForm data={data} body={product ? importNotes(product) : ""} importedPhotos={product?.images} />
    </div>
  );
}
