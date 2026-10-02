import { notFound } from "next/navigation";
import { getItems, getOutfit } from "@/lib/data";
import { OutfitForm } from "@/components/outfit-form";

export default async function EditOutfitPage({ params }: PageProps<"/outfits/[id]/edit">) {
  const { id } = await params;
  const [outfit, items] = await Promise.all([getOutfit(id), getItems()]);
  if (!outfit) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{outfit.data.name} bearbeiten</h1>
      <OutfitForm id={outfit.id} data={outfit.data} body={outfit.body} items={items} />
    </div>
  );
}
