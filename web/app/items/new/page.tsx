import Link from "next/link";
import { getItems, getWish } from "@/lib/data";
import { importNotes, parseImport } from "@/lib/import";
import { KNOWN_COLORS } from "@/lib/labels";
import { ItemForm } from "@/components/item-form";
import type { ItemData } from "@/lib/types";
import { today } from "@lib/data.mjs";

export default async function NewItemPage({ searchParams }: PageProps<"/items/new">) {
  const { fromWish, import: importParam } = await searchParams;
  const items = await getItems();
  const colors = [...new Set([...items.flatMap((i) => i.data.colors ?? []), ...KNOWN_COLORS])].sort();

  // Aus der Wunschliste gekauft: Name, Kategorie, Preis und Link übernehmen
  const wish = typeof fromWish === "string" ? await getWish(fromWish) : null;
  // Vom Lesezeichen "Zum Kleiderschrank": alles übernehmen, was aus der Shop-Seite erkannt wurde
  const product = parseImport(importParam);

  let prefill: Partial<ItemData> | undefined;
  let body = "";
  if (product) {
    prefill = {
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      colors: product.colors,
      material: product.material,
      fit: product.fit,
      pattern: product.pattern,
      link: product.link,
      purchase: { price: product.price, shop: product.shop, date: today() },
    };
    body = importNotes(product);
  } else if (wish) {
    prefill = {
      name: wish.data.name,
      category: wish.data.category,
      link: wish.data.link,
      purchase: { price: wish.data.price, date: today() },
    };
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {wish ? "Gekauftes Teil erfassen" : product ? "Teil aus dem Shop" : "Neues Teil"}
        </h1>
        {!product && !wish && (
          <Link href="/bookmarklet" className="text-sm text-muted underline">
            Aus Online-Shop übernehmen
          </Link>
        )}
      </div>
      <ItemForm data={prefill} body={body} fromWish={wish?.id} colorSuggestions={colors} importedPhotos={product?.images} />
    </div>
  );
}
