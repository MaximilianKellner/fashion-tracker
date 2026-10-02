import { notFound } from "next/navigation";
import { getItem, getItems } from "@/lib/data";
import { KNOWN_COLORS } from "@/lib/labels";
import { ItemForm } from "@/components/item-form";

export default async function EditItemPage({ params }: PageProps<"/items/[id]/edit">) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const items = await getItems();
  const colors = [...new Set([...items.flatMap((i) => i.data.colors ?? []), ...KNOWN_COLORS])].sort();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{item.data.name} bearbeiten</h1>
      <ItemForm id={item.id} data={item.data} body={item.body} colorSuggestions={colors} />
    </div>
  );
}
