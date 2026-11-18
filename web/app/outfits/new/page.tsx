import { getItems } from "@/lib/data";
import { OutfitForm } from "@/components/outfit-form";

export default async function NewOutfitPage() {
  const items = await getItems();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Neues Outfit</h1>
      <OutfitForm items={items} data={{ items: [] }} />
    </div>
  );
}
