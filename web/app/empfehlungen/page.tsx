import Link from "next/link";
import { Suspense } from "react";
import { getRecommendations } from "@/lib/data";
import { formatDate, label, TOPICS } from "@/lib/labels";
import { QuestionForm } from "@/components/question-form";
import { ColorGaps } from "@/components/color-gaps";
import type { Recommendation } from "@/lib/types";

/** Erste Zeile Fließtext als Vorschau (ohne Markdown-Zeichen) */
function excerpt(body: string) {
  const line = body
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("|"));
  return (line ?? "").replace(/[*_`[\]]|\(https?:[^)]*\)/g, "").replace(/^[-\d.]+\s+/, "");
}

function RecCard({ rec, answer }: { rec: Recommendation; answer?: Recommendation }) {
  const { data } = rec;
  const target = answer ?? rec;
  return (
    <li>
      <Link href={`/empfehlungen/${target.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:bg-surface-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 font-medium">{target.data.title}</div>
          <span className="shrink-0 text-xs text-muted">{formatDate(target.data.date)}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted">
          {target.data.topic && <span>{TOPICS[target.data.topic] ?? label(target.data.topic)}</span>}
          {answer && <span>Antwort auf: {data.title}</span>}
        </div>
        {excerpt(target.body) && <p className="mt-2 line-clamp-2 text-sm text-muted">{excerpt(target.body)}</p>}
      </Link>
    </li>
  );
}

export default async function RecommendationsPage({ searchParams }: PageProps<"/empfehlungen">) {
  const { archiv } = await searchParams;
  const all = (await getRecommendations()).sort((a, b) => b.data.date.localeCompare(a.data.date) || b.id.localeCompare(a.id));
  const showArchived = archiv === "1";

  const questions = all.filter((r) => r.data.kind === "frage");
  const open = questions.filter((q) => q.data.status === "offen");
  // Antworten zu Fragen werden mit der Frage zusammen gezeigt, nicht doppelt
  const answered = new Set(all.filter((r) => r.data.answers).map((r) => r.data.answers));
  const visible = all.filter(
    (r) => r.data.kind === "empfehlung" && (showArchived ? r.data.status === "archiviert" : r.data.status !== "archiviert"),
  );
  const archivedCount = all.filter((r) => r.data.kind === "empfehlung" && r.data.status === "archiviert").length;
  const byId = new Map(all.map((r) => [r.id, r]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empfehlungen</h1>
        <p className="mt-1 text-sm text-muted">
          Outfit-Ideen, Kaufberatung und Analysen von Claude, deinem Stilberater, und unten die Farben, die deinem Schrank fehlen.
        </p>
      </div>

      <QuestionForm />

      {open.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Wartet auf Claude ({open.length})</h2>
          <ul className="space-y-2">
            {open.map((q) => (
              <li key={q.id}>
                <Link href={`/empfehlungen/${q.id}`} className="flex items-start justify-between gap-3 rounded-xl border border-dashed border-line p-3 text-sm">
                  <span className="min-w-0">{q.data.title}</span>
                  <span className="shrink-0 text-xs text-muted">{formatDate(q.data.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-muted">{showArchived ? "Archiv" : "Von Claude"}</h2>
          {(archivedCount > 0 || showArchived) && (
            <Link href={showArchived ? "/empfehlungen" : "/empfehlungen?archiv=1"} className="text-sm text-muted underline">
              {showArchived ? "Zurück" : `Archiv (${archivedCount})`}
            </Link>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
            {showArchived ? "Nichts archiviert." : (
              <>
                Noch keine Empfehlungen. Stell oben eine Frage oder nutze im Repo <code>/outfit</code>, <code>/kaufempfehlung</code> oder{" "}
                <code>/analyse</code>.
              </>
            )}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((r) => {
              const question = r.data.answers ? byId.get(r.data.answers) : undefined;
              return question ? <RecCard key={r.id} rec={question} answer={r} /> : <RecCard key={r.id} rec={r} />;
            })}
          </ul>
        )}
        {/* Beantwortete Fragen ohne sichtbare Antwort (z. B. Antwort gelöscht) gehen nicht verloren */}
        {!showArchived &&
          questions
            .filter((q) => q.data.status === "beantwortet" && !answered.has(q.id))
            .map((q) => (
              <p key={q.id} className="mt-2 text-xs text-muted">
                <Link href={`/empfehlungen/${q.id}`} className="underline">
                  {q.data.title}
                </Link>{" "}
                (beantwortet, Antwort nicht mehr vorhanden)
              </p>
            ))}
      </section>

      {/* Rechnet alle Kombinationen durch; die übrige Seite erscheint schon vorher */}
      {!showArchived && (
        <Suspense fallback={<p className="text-sm text-muted">Farb-Lücken werden berechnet …</p>}>
          <ColorGaps />
        </Suspense>
      )}
    </div>
  );
}
