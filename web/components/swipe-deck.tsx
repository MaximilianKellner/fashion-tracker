"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { saveWear } from "@/app/actions";
import { completeOutfit, scoreOutfit, seasonsOf, slotsFor } from "@lib/outfit-match.mjs";
import { label, scoreTone, swatch } from "@/lib/labels";
import type { Item } from "@/lib/types";
import { Photo } from "./photo";

type Props = {
  items: Item[];
  outfits: { items: string[]; rating?: number }[];
  palette?: { best?: string[]; base?: string[]; sparingly?: string[]; often?: string[] };
  season: string;
  /** Zufallszahl vom Server, damit Server und Browser beim ersten Anzeigen gleich mischen (sonst Hydration-Fehler) */
  seed: number;
};

type Mode = "vorlieben" | "outfit";
type Dir = "left" | "right";
type Wear = "mehr" | "weniger" | null;

// Ab dieser Strecke (px) zählt das Ziehen als Swipe
const THRESHOLD = 90;
// Runden im Outfit-Modus: so viele Swipes, dann kommen die Vorschläge
const ROUNDS = [6, 10, 16];
// Mit Swipe-Ergebnissen erst speichern, wenn eine Weile nicht geswipt wurde: ein Commit statt einem pro Swipe
const SAVE_DELAY = 2000;

type Rand = () => number;
/** Zufallszahlen 0..1 aus einem Seed (mulberry32), auf Server und im Browser gleich */
function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zufällige Reihenfolge (Fisher-Yates) */
function shuffle<T>(list: T[], rand: Rand = Math.random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const photoSrc = (item: Item) => (item.data.photos?.[0] ? `/photos/${item.id}/${item.data.photos[0]}` : null);
const coldSeason = (season: string) => season === "herbst" || season === "winter";
const outfitSlots = (season: string) => ["oberteil", "hose", "schuhe", ...(coldSeason(season) ? ["jacke"] : [])];

/** Vorlieben-Modus: noch nicht bewertete Teile zuerst, dann die schon bewerteten (zum Nachjustieren) */
function preferenceDeck(items: Item[], rand?: Rand) {
  return [...shuffle(items.filter((i) => !i.data.wear), rand), ...shuffle(items.filter((i) => i.data.wear), rand)];
}

/** Outfit-Modus: Teile für Oberteil, Hose, Schuhe (und Jacke, wenn es kalt ist), passend zur Saison, abwechselnd gemischt */
function outfitDeck(items: Item[], season: string, size: number, rand?: Rand) {
  const groups = outfitSlots(season)
    .map((slot) => shuffle(items.filter((i) => slotsFor(i)[0] === slot && (seasonsOf(i)?.includes(season) ?? true)), rand))
    .filter((g) => g.length);
  const deck: Item[] = [];
  for (let round = 0; deck.length < size && groups.some((g) => g[round]); round++) {
    for (const g of shuffle(groups, rand)) if (g[round] && deck.length < size) deck.push(g[round]);
  }
  return deck;
}

export function SwipeDeck({ items, outfits, palette, season, seed }: Props) {
  const [mode, setMode] = useState<Mode>("vorlieben");
  const [rounds, setRounds] = useState(10);

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm">
        {(
          [
            ["vorlieben", "Öfter / seltener"],
            ["outfit", "Outfit finden"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-lg py-1.5 ${mode === id ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
          >
            {text}
          </button>
        ))}
      </div>
      {mode === "vorlieben" ? (
        <PreferenceMode items={items} seed={seed} />
      ) : (
        <OutfitMode key={rounds} items={items} outfits={outfits} palette={palette} season={season} rounds={rounds} setRounds={setRounds} />
      )}
    </div>
  );
}

// ---------- Modus 1: dauerhaft öfter / seltener tragen ----------

function PreferenceMode({ items, seed }: { items: Item[]; seed: number }) {
  const [deck, setDeck] = useState(() => preferenceDeck(items, seeded(seed)));
  const [index, setIndex] = useState(0);
  // Aktueller Stand je Teil (inkl. noch nicht gespeicherter Swipes) und Verlauf zum Rückgängigmachen
  const [wear, setWear] = useState<Record<string, Wear>>(() => Object.fromEntries(items.map((i) => [i.id, i.data.wear ?? null])));
  const [history, setHistory] = useState<{ id: string; before: Wear }[]>([]);
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");

  // Ungespeicherte Änderungen sammeln und gebündelt schicken
  const queue = useRef<Record<string, Wear>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const changes = queue.current;
    queue.current = {};
    if (!Object.keys(changes).length) return;
    saveWear(changes).then(
      () => setSaving(Object.keys(queue.current).length ? "pending" : "saved"),
      () => {
        // Fehlgeschlagen: beim nächsten Mal erneut versuchen
        queue.current = { ...changes, ...queue.current };
        setSaving("pending");
      },
    );
  }, []);
  const schedule = (id: string, value: Wear) => {
    queue.current[id] = value;
    setSaving("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };
  // Beim Verlassen der Seite (oder Wechsel des Modus) sofort speichern
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const current = deck[index];
  function decide(value: Wear) {
    if (!current) return;
    setHistory((h) => [...h, { id: current.id, before: wear[current.id] }]);
    setWear((w) => ({ ...w, [current.id]: value }));
    if (wear[current.id] !== value) schedule(current.id, value);
    setIndex((i) => i + 1);
  }
  function undo() {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setWear((w) => ({ ...w, [last.id]: last.before }));
    schedule(last.id, last.before);
    setIndex((i) => i - 1);
  }

  const values = Object.values(wear);
  const more = values.filter((v) => v === "mehr").length;
  const less = values.filter((v) => v === "weniger").length;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Rechts: öfter tragen, links: seltener. Das wirkt dauerhaft auf Würfeln, „Vorschläge für heute“ und die Sortierung im Builder.
      </p>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          {Math.min(index + 1, deck.length)} / {deck.length} · {more} öfter · {less} seltener
        </span>
        <span>{saving === "pending" ? "speichert …" : saving === "saved" ? "gespeichert" : ""}</span>
      </div>
      {current ? (
        <SwipeStack
          key={current.id + index}
          item={current}
          next={deck[index + 1]}
          badge={wear[current.id] ? `bisher: ${wear[current.id] === "mehr" ? "öfter" : "seltener"}` : undefined}
          leftLabel="Seltener"
          rightLabel="Öfter"
          onSwipe={(dir) => decide(dir === "right" ? "mehr" : "weniger")}
          onSkip={() => decide(null)}
          skipLabel="Egal"
          onUndo={history.length ? undo : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="font-medium">Alle Teile durch.</p>
          <p className="mt-1 text-sm text-muted">
            {more} öfter, {less} seltener. Die Vorschläge berücksichtigen das ab jetzt.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {history.length > 0 && (
              <button type="button" className="btn-ghost" onClick={undo}>
                Rückgängig
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                flush();
                setDeck(shuffle(items));
                setIndex(0);
                setHistory([]);
              }}
            >
              Nochmal von vorn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Modus 2: x Swipes, dann zwei Outfits ----------

type OutfitModeProps = Omit<Props, "seed"> & { rounds: number; setRounds: (n: number) => void };

function OutfitMode({ items, outfits, palette, season, rounds, setRounds }: OutfitModeProps) {
  const [deck, setDeck] = useState(() => outfitDeck(items, season, rounds));
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [history, setHistory] = useState<{ id: string; dir: Dir }[]>([]);

  const done = deck.length > 0 && index >= deck.length;
  const current = deck[index];

  function decide(dir: Dir) {
    if (!current) return;
    (dir === "right" ? setLiked : setDisliked)((l) => [...l, current.id]);
    setHistory((h) => [...h, { id: current.id, dir }]);
    setIndex((i) => i + 1);
  }
  function undo() {
    const last = history.at(-1);
    if (!last) return;
    (last.dir === "right" ? setLiked : setDisliked)((l) => l.filter((id) => id !== last.id));
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => i - 1);
  }
  function restart() {
    setDeck(outfitDeck(items, season, rounds));
    setIndex(0);
    setLiked([]);
    setDisliked([]);
    setHistory([]);
  }

  const results = useMemo(() => {
    if (!done) return [];
    const context = { palette, outfits, seasons: [season], liked, disliked };
    const slots = outfitSlots(season);
    // Was heute nicht gefällt, kommt gar nicht erst in Frage
    const pool = items.filter((i) => !disliked.includes(i.id));
    const make = (from: Item[]) => {
      const chosen = completeOutfit({}, from, context, { slots }) as Record<string, Item | undefined>;
      return slots.map((s) => chosen[s]).filter((i): i is Item => !!i);
    };
    const first = make(pool);
    // Zweites Outfit mit anderem Oberteil und anderer Hose, damit es eine echte Alternative ist
    const firstIds = new Set(first.filter((i) => ["oberteil", "hose"].includes(slotsFor(i)[0])).map((i) => i.id));
    let second = make(pool.filter((i) => !firstIds.has(i.id)));
    if (second.length < 3) second = make(pool.filter((i) => !(first[0] && i.id === first[0].id)));
    return [first, second]
      .filter((parts, n, all) => parts.length >= 2 && (n === 0 || parts.map((p) => p.id).join() !== all[0].map((p) => p.id).join()))
      .map((parts) => ({ parts, score: scoreOutfit(parts, context), hits: parts.filter((p) => liked.includes(p.id)) }));
  }, [done, items, outfits, palette, season, liked, disliked]);

  if (!deck.length) {
    return <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">Keine passenden Teile für diese Jahreszeit.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Worauf hast du heute Lust? Rechts: gern, links: heute nicht. Nach {deck.length} Swipes bekommst du zwei Outfits. Diese Runde wird nicht
        gespeichert.
      </p>
      {!done && (
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            {index + 1} / {deck.length}
          </span>
          <label className="flex items-center gap-1.5">
            Swipes
            <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="rounded-md border border-line bg-surface px-1 py-0.5">
              {ROUNDS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {current ? (
        <SwipeStack
          key={current.id + index}
          item={current}
          next={deck[index + 1]}
          leftLabel="Heute nicht"
          rightLabel="Gern"
          onSwipe={decide}
          onUndo={history.length ? undo : undefined}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold">Deine Outfits für heute</h2>
          {results.length === 0 && <p className="text-sm text-muted">Daraus ließ sich kein Outfit bauen. Versuch eine neue Runde.</p>}
          {results.map((r, n) => (
            <div key={n} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className={`grid gap-0.5 bg-line ${r.parts.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {r.parts.map((item) => (
                  <div key={item.id} className="relative bg-surface-2">
                    {photoSrc(item) ? (
                      <Photo src={photoSrc(item)!} alt={item.data.name} className="aspect-square w-full" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center p-2 text-center text-sm text-muted">{item.data.name}</div>
                    )}
                    {liked.includes(item.id) && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 text-xs text-accent-ink" title="Hast du rechts geswipt">
                        ♥
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Outfit {n + 1}</span>
                  {r.score && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone(r.score.score)}`}>{r.score.score} · {r.score.verdict}</span>}
                </div>
                <ul className="text-sm text-muted">
                  {r.parts.map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: swatch(p.data.colors?.[0] ?? "") }} />
                      <Link href={`/items/${p.id}`} className="truncate hover:text-ink">
                        {p.data.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {r.hits.length > 0 && (
                  <p className="text-xs text-muted">
                    Mit {r.hits.length} {r.hits.length === 1 ? "Teil" : "Teilen"}, auf die du Lust hattest.
                  </p>
                )}
                {r.score && r.score.problems.length > 0 && <p className="text-xs text-danger">{r.score.problems.join(" · ")}</p>}
                <Link href={`/outfits/builder?items=${r.parts.map((p) => p.id).join(",")}`} className="btn-ghost w-full justify-center">
                  Im Builder anpassen &amp; speichern
                </Link>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1 justify-center" onClick={undo}>
              Letzten Swipe ändern
            </button>
            <button type="button" className="btn-primary flex-1 justify-center" onClick={restart}>
              Neue Runde
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Karte zum Wischen ----------

function SwipeStack({
  item,
  next,
  badge,
  leftLabel,
  rightLabel,
  onSwipe,
  onSkip,
  skipLabel,
  onUndo,
}: {
  item: Item;
  next?: Item;
  badge?: string;
  leftLabel: string;
  rightLabel: string;
  onSwipe: (dir: Dir) => void;
  onSkip?: () => void;
  skipLabel?: string;
  onUndo?: () => void;
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<Dir | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fly = useCallback(
    (dir: Dir) => {
      if (leaving) return;
      setLeaving(dir);
      setTimeout(() => onSwipe(dir), 180);
    },
    [leaving, onSwipe],
  );

  // Tastatur: Pfeil links/rechts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowLeft") fly("left");
      if (e.key === "ArrowRight") fly("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fly]);

  function down(e: ReactPointerEvent) {
    if (leaving) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: ReactPointerEvent) {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }
  function up() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (Math.abs(drag.x) > THRESHOLD) fly(drag.x > 0 ? "right" : "left");
    else setDrag({ x: 0, y: 0 });
  }

  const x = leaving ? (leaving === "right" ? 1 : -1) * 600 : drag.x;
  const y = leaving ? drag.y : drag.y * 0.3;
  // Wie weit Richtung Entscheidung (0..1), für die Einblendung
  const lean = Math.max(-1, Math.min(1, x / (THRESHOLD * 1.5)));

  return (
    <div>
      <div className="relative h-[min(52svh,32rem)] min-h-64 w-full select-none">
        {next && (
          <div className="absolute inset-0 scale-95 overflow-hidden rounded-2xl border border-line bg-surface opacity-70">
            <CardFace item={next} />
          </div>
        )}
        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className={`absolute inset-0 cursor-grab touch-none overflow-hidden rounded-2xl border border-line bg-surface shadow-lg active:cursor-grabbing ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
          style={{ transform: `translate(${x}px, ${y}px) rotate(${x / 18}deg)` }}
        >
          <CardFace item={item} badge={badge} />
          {/* Einblendung, in welche Richtung es gerade geht */}
          <span
            className="pointer-events-none absolute left-4 top-4 -rotate-12 rounded-lg border-2 border-accent bg-surface/80 px-2 py-0.5 text-lg font-bold uppercase text-accent"
            style={{ opacity: Math.max(0, lean) }}
          >
            {rightLabel}
          </span>
          <span
            className="pointer-events-none absolute right-4 top-4 rotate-12 rounded-lg border-2 border-danger bg-surface/80 px-2 py-0.5 text-lg font-bold uppercase text-danger"
            style={{ opacity: Math.max(0, -lean) }}
          >
            {leftLabel}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onUndo}
          disabled={!onUndo}
          aria-label="Rückgängig"
          title="Rückgängig"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted disabled:opacity-40"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => fly("left")}
          aria-label={leftLabel}
          title={`${leftLabel} (←)`}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-danger bg-surface text-2xl text-danger"
        >
          ✕
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip} className="rounded-full border border-line bg-surface px-3 py-2 text-sm text-muted">
            {skipLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => fly("right")}
          aria-label={rightLabel}
          title={`${rightLabel} (→)`}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-surface text-2xl text-accent"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

function CardFace({ item, badge }: { item: Item; badge?: string }) {
  const src = photoSrc(item);
  return (
    <div className="pointer-events-none flex h-full flex-col">
      <div className="relative min-h-0 flex-1 bg-surface-2">
        {src ? (
          <Photo src={src} alt={item.data.name} className="h-full w-full" lazy={false} />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted">Kein Foto</div>
        )}
        {badge && <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs text-muted">{badge}</span>}
      </div>
      <div className="border-t border-line p-3">
        <div className="truncate font-medium">{item.data.name}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          {(item.data.colors ?? []).map((c) => (
            <span key={c} title={label(c)} className="inline-block h-3 w-3 rounded-full border border-black/15" style={{ backgroundColor: swatch(c) }} />
          ))}
          <span className="truncate">{[label(item.data.subcategory) || label(item.data.category), item.data.brand].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
    </div>
  );
}
