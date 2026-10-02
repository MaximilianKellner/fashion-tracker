import { getItems } from "@/lib/data";
import { OutfitForm } from "@/components/outfit-form";

export default async function NewOutfitPage({ searchParams }: PageProps<"/outfits/new">) {
  const { item } = await searchParams;
  const items = await getItems();
  // ?item=<id> startet das Outfit mit diesem Teil (Link von der Detailseite)
  const preselected = typeof item === "string" && items.some((i) => i.id === item) ? [item] : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Neues Outfit</h1>
      <OutfitForm items={items} data={{ items: preselected }} />
    </div>
  );
}
