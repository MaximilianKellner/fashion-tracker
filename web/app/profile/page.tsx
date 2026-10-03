import Link from "next/link";
import { getProfile } from "@/lib/data";
import { BodyChart } from "@/components/body-chart";
import { Markdown } from "@/components/markdown";
import { SIZES } from "@lib/schema.mjs";

export default async function ProfilePage() {
  const { data, body } = await getProfile();
  const sizes = Object.entries(SIZES) as [string, { label: string }][];
  const filledSizes = sizes.filter(([k]) => data.sizes?.[k]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <Link href="/profile/edit" className="btn-primary">
          Bearbeiten
        </Link>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-semibold">Körpermaße</h2>
          <span className="text-sm text-muted">
            {[data.height_cm && `${data.height_cm} cm`, data.weight_kg && `${data.weight_kg} kg`, data.age && `${data.age} Jahre`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <BodyChart measurements={data.measurements} heightCm={data.height_cm} weightKg={data.weight_kg} />
        <p className="mt-3 text-xs text-muted">
          Tipp: Am genauesten ist es, Lieblingshose und -pulli flach hinzulegen und auszumessen. Diese Maße lassen sich direkt mit
          den Größentabellen der Shops vergleichen.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold">Größen</h2>
        {filledSizes.length === 0 ? (
          <p className="text-sm text-muted">
            Noch keine Größen eingetragen.{" "}
            <Link href="/profile/edit" className="underline">
              Jetzt eintragen
            </Link>
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {filledSizes.map(([k, { label }]) => (
              <div key={k}>
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium">{data.sizes![k]}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {body && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <Markdown source={body} />
        </section>
      )}
    </div>
  );
}
