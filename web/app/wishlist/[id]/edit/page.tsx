import { notFound } from "next/navigation";
import { getWish } from "@/lib/data";
import { WishForm } from "@/components/wish-form";

export default async function EditWishPage({ params }: PageProps<"/wishlist/[id]/edit">) {
  const { id } = await params;
  const wish = await getWish(id);
  if (!wish) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{wish.data.name} bearbeiten</h1>
      <WishForm id={wish.id} data={wish.data} body={wish.body} />
    </div>
  );
}
