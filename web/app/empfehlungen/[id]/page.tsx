import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRecommendation, setRecommendationStatus } from "@/app/actions";
import { getItems, getOutfits, getRecommendation, getRecommendations, getWishlist } from "@/lib/data";
import { euro, formatDate, label, TOPICS } from "@/lib/labels";
import { ConfirmButton } from "@/components/confirm-button";
import { ItemCard } from "@/components/item-card";
import { Markdown } from "@/components/markdown";
import { OutfitCollage } from "@/components/outfit-collage";

export default async function RecommendationPage({ params }: PageProps<"/empfehlungen/[id]">) {
  const { id } = await params;
  const rec = await getRecommendation(id);
  if (!rec) notFound();
  const { data } = rec;

  const [items, outfits, wishes, all] = await Promise.all([getItems(), getOutfits(), getWishlist(), getRecommendations()]);
  const question = data.answers ? all.find((r) => r.id === data.answers) : undefined;
  const answers = all.filter((r) => r.data.answers === rec.id);
  const linkedItems = items.filter((i) => data.items?.includes(i.id));
  const linkedOutfits = outfits.filter((o) => data.outfits?.includes(o.id));
  const linkedWishes = wishes.filter((w) => data.wishes?.includes(w.id));
  const isQuestion = data.kind === "frage";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/empfehlungen" className="text-sm text-muted">
        ← Empfehlungen
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {[
            isQuestion ? "Deine Frage" : "Von Claude",
            formatDate(data.date),
            data.topic && (TOPICS[data.topic] ?? label(data.topic)),
            isQuestion && (data.status === "offen" ? "wartet auf Antwort" : label(data.status)),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {question && (
        <Link href={`/empfehlungen/${question.id}`} className="block rounded-xl border border-dashed border-line p-3 text-sm">
          <span className="text-muted">Deine Frage: </span>
          {question.body || question.data.title}
        </Link>
      )}

      {rec.body && (
        <div className={`rounded-xl border border-line p-4 ${isQuestion ? "bg-surface-2" : "bg-surface"}`}>
          {isQuestion ? <p className="whitespace-pre-line">{rec.body}</p> : <Markdown source={rec.body} />}
        </div>
      )}

      {isQuestion && answers.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Antwort</h2>
          <ul className="space-y-2">
            {answers.map((a) => (
              <li key={a.id}>
                <Link href={`/empfehlungen/${a.id}`} className="block rounded-xl border border-line bg-surface p-3 hover:bg-surface-2">
                  {a.data.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {linkedItems.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Teile aus deinem Schrank</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {linkedItems.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        </section>
      )}

      {linkedOutfits.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Outfits</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {linkedOutfits.map((o) => (
              <Link key={o.id} href={`/outfits/${o.id}`} className="block overflow-hidden rounded-xl border border-line bg-surface">
                <OutfitCollage items={items.filter((i) => o.data.items.includes(i.id))} />
                <div className="truncate p-2.5 text-sm font-medium">{o.data.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {linkedWishes.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Auf der Wunschliste</h2>
          <ul className="space-y-2">
            {linkedWishes.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{w.data.name}</span>
                  {w.data.status !== "offen" && <span className="text-muted"> · {label(w.data.status)}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {euro(w.data.price)}
                  {w.data.link && (
                    <a href={w.data.link} target="_blank" rel="noopener noreferrer" className="underline">
                      Shop ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
        {!isQuestion &&
          (data.status === "archiviert" ? (
            <ConfirmButton action={setRecommendationStatus.bind(null, rec.id, "offen")} className="btn-ghost py-1.5">
              Aus dem Archiv holen
            </ConfirmButton>
          ) : (
            <ConfirmButton action={setRecommendationStatus.bind(null, rec.id, "archiviert")} className="btn-ghost py-1.5">
              Archivieren
            </ConfirmButton>
          ))}
        <ConfirmButton
          action={deleteRecommendation.bind(null, rec.id)}
          confirm={`"${data.title}" löschen?`}
          className="btn-ghost py-1.5 text-danger"
        >
          Löschen
        </ConfirmButton>
      </div>
    </div>
  );
}
