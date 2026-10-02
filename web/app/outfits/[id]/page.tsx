import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteOutfit } from "@/app/actions";
import { getItems, getOutfit } from "@/lib/data";
import { label } from "@/lib/labels";
import { ItemCard } from "@/components/item-card";
import { ConfirmButton } from "@/components/confirm-button";

export default async function OutfitPage({ params }: PageProps<"/outfits/[id]">) {
  const { id } = await params;
  const [outfit, items] = await Promise.all([getOutfit(id), getItems()]);
  if (!outfit) notFound();
  const { data } = outfit;
  const byId = new Map(items.map((i) => [i.id, i]));
  const missing = data.items.filter((ref) => !byId.has(ref));

  async function remove() {
    "use server";
    await deleteOutfit(id);
    redirect("/outfits");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
          <p className="mt-1 text-muted">
            {[
              label(data.occasion),
              data.seasons?.map(label).join(", "),
              data.source === "claude" ? "von Claude vorgeschlagen" : "",
              data.rating ? "★".repeat(data.rating) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link href={`/outfits/${id}/edit`} className="btn-ghost shrink-0">
          Bearbeiten
        </Link>
      </div>

      {outfit.body && <p className="mt-4 whitespace-pre-line rounded-xl bg-surface-2 p-4 text-sm">{outfit.body}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.items.map((ref) => {
          const item = byId.get(ref);
          return item ? <ItemCard key={ref} item={item} /> : null;
        })}
      </div>
      {missing.length > 0 && <p className="mt-3 text-sm text-danger">Nicht mehr vorhanden: {missing.join(", ")}</p>}

      <div className="mt-8 flex justify-end">
        <ConfirmButton action={remove} confirm={`Outfit "${data.name}" löschen? Die Kleidungsstücke bleiben erhalten.`}>
          Outfit löschen
        </ConfirmButton>
      </div>
    </div>
  );
}
