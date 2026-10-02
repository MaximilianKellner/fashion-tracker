import { BookmarkletLink } from "@/components/bookmarklet-link";

export default function BookmarkletPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Teile aus Online-Shops übernehmen</h1>
      <p className="mt-2 text-muted">
        Mit dem Lesezeichen „Zum Kleiderschrank“ übernimmst du Name, Marke, Preis, Farbe, Material und Produktbild direkt
        von der Shop-Seite, ohne abzutippen. Getestet mit Zara, H&amp;M und About You. Andere Shops funktionieren, wenn
        sie Produktdaten für Suchmaschinen einbetten (die meisten tun das).
      </p>

      <section className="mt-6 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-semibold">Einrichten (einmalig, Firefox am PC)</h2>
        <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm">
          <li>
            Lesezeichen-Symbolleiste einblenden: <kbd className="rounded border border-line px-1">Strg</kbd> +{" "}
            <kbd className="rounded border border-line px-1">Umschalt</kbd> + <kbd className="rounded border border-line px-1">B</kbd>
          </li>
          <li>Den grünen Button unten mit der Maus in die Symbolleiste ziehen.</li>
        </ol>
        <div className="mt-6">
          <BookmarkletLink />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-semibold">Benutzen</h2>
        <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm">
          <li>Im Shop die Produktseite öffnen, gewünschte Farbe auswählen.</li>
          <li>In der Symbolleiste auf „Zum Kleiderschrank“ klicken.</li>
          <li>Es öffnet sich ein neuer Tab: „Habe ich gekauft“ oder „Auf die Wunschliste“ wählen, prüfen, Größe ergänzen, speichern.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Das Lesezeichen liest nur die Seite, die du gerade offen hast, und schickt die Produktdaten an deinen
          Kleiderschrank im Heimnetz. Funktioniert nur, wenn der PC im selben Netz wie der Home-PC ist.
        </p>
      </section>
    </div>
  );
}
