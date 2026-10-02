import { getItems, getWish } from "@/lib/data";
import { KNOWN_COLORS } from "@/lib/labels";
import { ItemForm } from "@/components/item-form";
import type { ItemData } from "@/lib/types";

export default async function NewItemPage({ searchParams }: PageProps<"/items/new">) {
  const { fromWish } = await searchParams;
  const items = await getItems();
  const colors = [...new Set([...items.flatMap((i) => i.data.colors ?? []), ...KNOWN_COLORS])].sort();

  // Aus der Wunschliste gekauft: Name, Kategorie und Preis übernehmen
  const wish = typeof fromWish === "string" ? await getWish(fromWish) : null;
  const prefill: Partial<ItemData> | undefined = wish
    ? {
        name: wish.data.name,
        category: wish.data.category,
        purchase: { price: wish.data.price, date: new Date().toISOString().slice(0, 7) },
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{wish ? "Gekauftes Teil erfassen" : "Neues Teil"}</h1>
      <ItemForm data={prefill} fromWish={wish?.id} colorSuggestions={colors} />
    </div>
  );
}
