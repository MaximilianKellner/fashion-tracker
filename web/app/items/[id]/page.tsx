import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteItem } from "@/app/actions";
import { getItem, getItems, getOutfits } from "@/lib/data";
import { euro, FORMALITY, label } from "@/lib/labels";
import { ColorDot, ItemThumb } from "@/components/item-card";
import { ConfirmButton } from "@/components/confirm-button";

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();
  const { data } = item;

  const [outfits, items] = await Promise.all([getOutfits(), getItems()]);
  const inOutfits = outfits.filter((o) => o.data.items?.includes(id));
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        {data.photos?.length ? (
          data.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={`/photos/${id}/${p}`} alt={data.name} className="w-full rounded-xl border border-line" />
          ))
        ) : (
          <div className="aspect-[3/4] overflow-hidden rounded-xl border border-line">
            <ItemThumb item={item} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
            <p className="mt-1 text-muted">
              {[data.brand, label(data.category), label(data.subcategory)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Link href={`/items/${id}/edit`} className="btn-ghost shrink-0">
            Bearbeiten
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {data.colors?.map((c) => (
            <span key={c} className="chip">
              <ColorDot color={c} /> {label(c)}
            </span>
          ))}
          {data.seasons?.map((s) => (
            <span key={s} className="chip">
              {label(s)}
            </span>
          ))}
          {data.tags?.map((t) => (
            <span key={t} className="chip text-muted">
              #{t}
            </span>
          ))}
        </div>

        <dl className="mt-4 rounded-xl border border-line bg-surface px-4 py-1">
          <Row k="Status" v={label(data.status)} />
          <Row k="Größe" v={data.size} />
          <Row k="Schnitt" v={data.fit} />
          <Row k="Material" v={data.material} />
          <Row k="Muster" v={label(data.pattern)} />
          <Row k="Formalität" v={data.formality ? `${data.formality} · ${FORMALITY[data.formality]}` : undefined} />
          <Row k="Gekauft" v={[data.purchase?.date, data.purchase?.shop].filter(Boolean).join(" · ")} />
          <Row k="Preis" v={data.purchase?.price !== undefined ? euro(data.purchase.price) : undefined} />
          <Row
            k="Shop-Seite"
            v={
              data.link ? (
                <a href={data.link} target="_blank" rel="noopener noreferrer" className="underline">
                  öffnen ↗
                </a>
              ) : undefined
            }
          />
        </dl>

        {item.body && <p className="mt-4 whitespace-pre-line rounded-xl bg-surface-2 p-4 text-sm">{item.body}</p>}

        {inOutfits.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-semibold">In Outfits</h2>
            <ul className="space-y-2">
              {inOutfits.map((o) => (
                <li key={o.id}>
                  <Link href={`/outfits/${o.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2">
                    <div className="flex -space-x-3">
                      {o.data.items.slice(0, 4).map((ref) => {
                        const other = byId.get(ref);
                        return other ? (
                          <div key={ref} className="h-10 w-10 overflow-hidden rounded-full border-2 border-surface">
                            <ItemThumb item={other} />
                          </div>
                        ) : null;
                      })}
                    </div>
                    <span className="text-sm">{o.data.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex justify-between gap-2">
          <Link href={`/outfits/builder?items=${id}`} className="btn-ghost">
            Outfit mit diesem Teil
          </Link>
          <ConfirmButton
            action={deleteItem.bind(null, id)}
            confirm={`"${data.name}" wirklich löschen? Ordner und Fotos werden entfernt. Tipp: Status "Aussortiert" behält die Historie.`}
          >
            Löschen
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
