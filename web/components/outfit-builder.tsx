"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { saveOutfit } from "@/app/actions";
import { SEASONS } from "@lib/schema.mjs";
import { SLOTS, completeOutfit, layerOf, scoreCandidate, scoreOutfit, slotsFor } from "@lib/outfit-match.mjs";
import { label, scoreTone, swatch } from "@/lib/labels";
import type { Item, OutfitData } from "@/lib/types";
import { Errors, Field } from "./form-bits";
import { Photo } from "./photo";

type Props = {
  items: Item[];
  outfits: { items: string[]; rating?: number }[];
  palette?: { best?: string[]; base?: string[]; sparingly?: string[] };
  initialItems: string[];
  /** Saisons, für die das Outfit gedacht ist: beim Bearbeiten die gespeicherten, sonst die aktuelle Jahreszeit */
  initialSeasons: string[];
  /** Gespeichertes Outfit, das im Builder bearbeitet wird */
  outfit?: { id: string; data: OutfitData; body: string };
};

type SlotId = (typeof SLOTS)[number]["id"];
type Chosen = Partial<Record<SlotId, Item>>;

// Eigener Farbpunkt statt dem aus item-card (das lädt serverseitigen Code)
function ColorDot({ color, size = "h-3 w-3" }: { color: string; size?: string }) {
  return <span title={label(color)} className={`inline-block shrink-0 rounded-full border border-black/15 ${size}`} style={{ backgroundColor: swatch(color) }} />;
}

const photoSrc = (item: Item) => (item.data.photos?.[0] ? `/photos/${item.id}/${item.data.photos[0]}` : null);

/** Verteilt Teile auf die Plätze: jedes in den ersten freien passenden Platz, äußere Schichten zuerst (Pulli vor Shirt) */
function assign(ids: string[], items: Item[]): Chosen {
  const chosen: Chosen = {};
  const found = ids.map((id) => items.find((i) => i.id === id)).filter((i): i is Item => !!i);
  for (const item of found.sort((a, b) => (layerOf(b) ?? 0) - (layerOf(a) ?? 0))) {
    const slot = (slotsFor(item) as SlotId[]).find((s) => !chosen[s]);
    if (slot) chosen[slot] = item;
  }
  return chosen;
}

/** Liegt das Teil unter „Darunter“ weiter außen als das Oberteil, tauschen die beiden (Hemd über T-Shirt) */
function orderLayers(chosen: Chosen): Chosen {
  const { oberteil, darunter } = chosen;
  if (oberteil && darunter && slotsFor(oberteil).includes("darunter") && layerOf(darunter) > layerOf(oberteil)) {
    return { ...chosen, oberteil: darunter, darunter: oberteil };
  }
  return chosen;
}

export function OutfitBuilder({ items, outfits, palette, initialItems, initialSeasons, outfit }: Props) {
  const [chosen, setChosen] = useState<Chosen>(() => assign(initialItems, items));
  const [active, setActive] = useState<SlotId>(() => SLOTS.find((s) => !assign(initialItems, items)[s.id])?.id ?? "oberteil");
  // Eine Auswahl für Filter und Speicherformular: danach werden Teile bewertet und das Outfit gespeichert (leer = egal)
  const [seasons, setSeasons] = useState<string[]>(initialSeasons);
  const toggleSeason = (s: string) => setSeasons((cur) => SEASONS.filter((x) => (x === s ? !cur.includes(s) : cur.includes(x))));
  const [state, formAction, pending] = useActionState(saveOutfit, null);

  const context = useMemo(() => ({ palette, outfits, seasons }), [palette, outfits, seasons]);
  const selected = Object.values(chosen).filter((i): i is Item => !!i);

  // Ohne Auswahl: wie vielseitig ein Teil ist (Schnitt gegen alle Teile anderer Plätze)
  const versatility = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const own = slotsFor(item);
      const others = items.filter((o) => o.id !== item.id && !slotsFor(o).some((s: string) => own.includes(s)));
      const scores = others.map((o) => scoreCandidate(item, [o], { palette }).score);
      map.set(item.id, scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 70);
    }
    return map;
  }, [items, palette]);

  // Vorschläge für den aktiven Platz, live nach Passung sortiert
  const suggestions = useMemo(() => {
    const others = Object.entries(chosen)
      .filter(([slot, item]) => slot !== active && item)
      .map(([, item]) => item as Item);
    const usedElsewhere = new Set(others.map((i) => i.id));
    // Darunter nur, was unter das gewählte Oberteil passt
    const top = active === "darunter" ? chosen.oberteil : undefined;
    return items
      .filter((i) => slotsFor(i).includes(active) && !usedElsewhere.has(i.id))
      .filter((i) => !top || layerOf(i) < layerOf(top))
      .map((item) => {
        const result = scoreCandidate(item, others, context);
        if (others.length) return { item, ...result };
        // Leeres Outfit: Vielseitigkeit plus die Zu- und Abschläge für Profilpalette und Saison (Basis 70)
        const score = Math.max(0, Math.min(100, versatility.get(item.id)! + result.score - 70));
        return { item, score, reasons: result.reasons.length ? result.reasons : [{ text: "vielseitig kombinierbar", good: true }] };
      })
      .sort((a, b) => b.score - a.score);
  }, [items, chosen, active, context, versatility]);

  // Gesamturteil und Probleme im Outfit (jedes Teil gegen den Rest)
  const overall = useMemo(() => scoreOutfit(selected, context), [selected, context]);
  const issues: { text: string; items: string[] }[] = useMemo(() => overall?.issues ?? [], [overall]);
  // Probleme je Teil, damit die Bühne das betroffene Teil markieren kann
  const problemsBy = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const { text, items: ids } of issues) for (const id of ids) map.set(id, [...(map.get(id) ?? []), text]);
    return map;
  }, [issues]);
  // Problem, über dem gerade die Maus steht (oder angetippt): seine Teile werden hervorgehoben
  const [hovered, setHovered] = useState<string | null>(null);
  const highlighted = new Set(issues.find((i) => i.text === hovered)?.items ?? []);
  const shortName = (id: string) => {
    const item = selected.find((s) => s.id === id);
    return item ? label(item.data.subcategory) || item.data.name : id;
  };
  const slotProps = { chosen, active, setActive, setChosen, problemsBy, highlighted };

  function pick(item: Item) {
    const next = orderLayers({ ...chosen, [active]: chosen[active]?.id === item.id ? undefined : item });
    setChosen(next);
    // Zum nächsten leeren Pflichtplatz springen
    const empty = SLOTS.find((s) => s.required && !next[s.id]);
    if (empty && next[active]) setActive(empty.id);
  }

  function fill(random: boolean) {
    const cold = seasons.includes("herbst") || seasons.includes("winter");
    const slots = ["oberteil", "hose", "schuhe", ...(cold ? ["jacke"] : [])];
    const pool = items.filter((i) => i.data.status === "aktiv");
    setChosen(completeOutfit(chosen, pool, context, { slots, random: random ? 1 : 0 }) as Chosen);
  }

  // Name aus den Hauptfarben von Oberteil und Hose als Vorschlag
  const suggestedName = [chosen.oberteil, chosen.hose]
    .map((i) => i && label(i.data.colors?.[0]))
    .filter(Boolean)
    .join(" & ");
  const commonSeasons = SEASONS.filter((s) => selected.every((i) => !i.data.seasons?.length || i.data.seasons.includes(s)));
  // Angebot, die gemeinsamen Saisons der Teile zu übernehmen, wenn sie etwas aussagen und von der Auswahl abweichen
  const sharedSeasons = commonSeasons.length > 0 && commonSeasons.length < 4 && commonSeasons.join() !== seasons.join();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const item of selected) fd.append("items", item.id);
    startTransition(() => formAction(fd));
  }

  const slotLabel = SLOTS.find((s) => s.id === active)?.label;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {/* Bühne: das Outfit als Flatlay */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] gap-2">
            <div className="space-y-2">
              <Slot id="kopf" shape="aspect-square" {...slotProps} />
              <Slot id="darunter" shape="aspect-[3/4]" {...slotProps} />
              <Slot id="accessoire" shape="aspect-square" {...slotProps} />
            </div>
            <div className="space-y-2">
              <Slot id="oberteil" shape="aspect-[4/5]" {...slotProps} />
              <Slot id="hose" shape="aspect-[3/4]" {...slotProps} />
              <Slot id="schuhe" shape="aspect-[4/3]" {...slotProps} />
            </div>
            <div className="space-y-2">
              <Slot id="jacke" shape="aspect-[3/4]" {...slotProps} />
            </div>
          </div>

          {/* Farben und Urteil */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {selected.length === 0 && <span className="text-sm text-muted">Noch leer</span>}
              {[...new Set(selected.flatMap((i) => i.data.colors ?? []))].map((c) => (
                <ColorDot key={c} color={c} size="h-5 w-5" />
              ))}
            </div>
            {overall && (
              <div className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${scoreTone(overall.score)}`}>
                {overall.verdict} · {overall.score}
              </div>
            )}
          </div>
          {issues.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-danger">
              {issues.map(({ text, items: ids }) => (
                <li key={text}>
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(text)}
                    onMouseLeave={() => setHovered(null)}
                    // Am Handy gibt es kein Hover: Antippen hebt hervor (Tippen woanders löst mouseleave aus)
                    onClick={() => setHovered(text)}
                    className={`text-left underline decoration-dotted underline-offset-2 ${hovered === text ? "font-medium" : ""}`}
                  >
                    {text} <span className="text-muted">({[...new Set(ids.map(shortName))].join(", ")})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => fill(false)} className="btn-primary py-1.5 text-sm">
              Auffüllen
            </button>
            <button type="button" onClick={() => fill(true)} className="btn-ghost py-1.5 text-sm">
              Würfeln
            </button>
            {selected.length > 0 && (
              <button type="button" onClick={() => setChosen({})} className="btn-ghost py-1.5 text-sm">
                Leeren
              </button>
            )}
          </div>
        </div>

        {/* Speichern */}
        {selected.length >= 2 && (
          <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-line bg-surface p-3">
            {outfit && <input type="hidden" name="id" value={outfit.id} />}
            {outfit && <input type="hidden" name="body" value={outfit.body} />}
            <input type="hidden" name="source" value={outfit?.data.source ?? "ich"} />
            <Field label="Name *">
              <input
                key={outfit ? "fix" : suggestedName}
                name="name"
                required
                defaultValue={outfit?.data.name ?? suggestedName}
                className="field"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Anlass">
                <input name="occasion" defaultValue={outfit?.data.occasion} placeholder="buero, date, freizeit" className="field" />
              </Field>
              <Field label="Bewertung">
                <select name="rating" defaultValue={outfit?.data.rating ?? ""} className="field">
                  <option value="">–</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium">Saisons</span>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <label key={s} className="chip cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink">
                    <input
                      type="checkbox"
                      name="seasons"
                      value={s}
                      checked={seasons.includes(s)}
                      onChange={() => toggleSeason(s)}
                      className="sr-only"
                    />
                    {label(s)}
                  </label>
                ))}
              </div>
              <span className="mt-1 block text-xs text-muted">
                Gleiche Auswahl wie der Saison-Filter: Teile, die nicht dazu passen, werden markiert.
                {sharedSeasons && (
                  <>
                    {" "}
                    <button type="button" onClick={() => setSeasons(commonSeasons)} className="underline underline-offset-2">
                      Saisons der Teile übernehmen ({commonSeasons.map(label).join(", ")})
                    </button>
                  </>
                )}
              </span>
            </div>
            <Errors errors={state?.errors} />
            <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
              {pending ? "Speichern …" : outfit ? "Änderungen speichern" : "Outfit speichern"}
            </button>
          </form>
        )}
      </div>

      {/* Vorschläge für den aktiven Platz */}
      <div id="builder-vorschlaege" className="scroll-mt-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`chip shrink-0 ${active === s.id ? "chip-active" : ""}`}
            >
              {s.label}
              {chosen[s.id] ? " ✓" : ""}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Saison:</span>
          <button type="button" onClick={() => setSeasons([])} className={`chip py-0.5 ${seasons.length === 0 ? "chip-active" : ""}`}>
            Egal
          </button>
          {SEASONS.map((s) => (
            <button key={s} type="button" onClick={() => toggleSeason(s)} className={`chip py-0.5 ${seasons.includes(s) ? "chip-active" : ""}`}>
              {label(s)}
            </button>
          ))}
        </div>

        <h2 className="mb-2 mt-4 text-sm font-medium text-muted">
          {slotLabel}: {selected.filter((i) => i !== chosen[active]).length ? "passend zum Outfit sortiert" : "nach Vielseitigkeit sortiert"} ({suggestions.length})
        </h2>
        {suggestions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Keine Teile für diesen Platz.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
            {suggestions.map(({ item, score, reasons }) => {
              const on = chosen[active]?.id === item.id;
              const src = photoSrc(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item)}
                  aria-pressed={on}
                  // Alle Gründe beim Darüberfahren, auf der Karte ist nur Platz für den wichtigsten
                  title={[`${item.data.name} · ${score}`, ...reasons.map((r) => `${r.good ? "✓" : "✗"} ${r.text}`)].join("\n")}
                  className={`overflow-hidden rounded-xl border-2 bg-surface text-left ${on ? "border-accent" : "border-transparent"}`}
                >
                  <div className="relative aspect-[3/4] bg-surface-2">
                    {src ? (
                      <Photo src={src} alt={item.data.name} className="h-full w-full" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ColorDot color={item.data.colors?.[0] ?? ""} size="h-8 w-8" />
                      </div>
                    )}
                    <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${scoreTone(score)}`}>{score}</span>
                  </div>
                  <div className="p-1.5">
                    <div className="truncate text-xs font-medium">{item.data.name}</div>
                    {reasons[0] && (
                      <div className={`line-clamp-2 text-[11px] leading-tight ${reasons[0].good ? "text-muted" : "text-danger"}`}>{reasons[0].text}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Slot({
  id,
  shape,
  chosen,
  active,
  setActive,
  setChosen,
  problemsBy,
  highlighted,
}: {
  id: SlotId;
  shape: string;
  chosen: Chosen;
  active: SlotId;
  setActive: (s: SlotId) => void;
  setChosen: (c: Chosen) => void;
  /** Probleme je Teil-ID aus scoreOutfit */
  problemsBy: Map<string, string[]>;
  /** Teile des Problems, auf das gerade gezeigt wird */
  highlighted: Set<string>;
}) {
  const item = chosen[id];
  const src = item && photoSrc(item);
  const isActive = active === id;
  const name = SLOTS.find((s) => s.id === id)!.label;
  const problems = (item && problemsBy.get(item.id)) || [];
  const marked = item && highlighted.has(item.id);
  // Aktiver Platz: Akzent-Ring; Teil mit Problem: roter Rahmen, beim Zeigen auf das Problem kräftiger
  const frame = isActive
    ? "ring-2 ring-accent ring-offset-2 ring-offset-surface"
    : marked
      ? "ring-[3px] ring-danger ring-offset-2 ring-offset-surface"
      : problems.length
        ? "ring-2 ring-danger/60"
        : "";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setActive(id);
          // Am Handy liegen die Vorschläge unter der Bühne: dorthin scrollen
          if (window.innerWidth < 1024) document.getElementById("builder-vorschlaege")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        aria-label={item ? `${name}: ${item.data.name}` : `${name} wählen`}
        className={`block w-full overflow-hidden rounded-xl ${shape} ${
          item ? "bg-surface-2" : "border-2 border-dashed border-line"
        } ${frame}`}
      >
        {item ? (
          src ? (
            <Photo src={src} alt={item.data.name} className="h-full w-full" />
          ) : (
            <span className="flex h-full items-center justify-center p-1 text-center text-xs">{item.data.name}</span>
          )
        ) : (
          <span className="flex h-full items-center justify-center p-1 text-center text-xs text-muted">+ {name}</span>
        )}
      </button>
      {item && (
        <button
          type="button"
          onClick={() => setChosen({ ...chosen, [id]: undefined })}
          aria-label={`${name} entfernen`}
          className="absolute right-1 top-1 rounded-full bg-surface/90 px-1.5 text-xs leading-5"
        >
          ×
        </button>
      )}
      {problems.length > 0 && (
        <span
          title={problems.join("\n")}
          aria-label={`Problem: ${problems.join(", ")}`}
          className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white"
        >
          !
        </span>
      )}
    </div>
  );
}
