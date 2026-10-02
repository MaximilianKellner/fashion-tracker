# Datenschema

Alle Daten sind Markdown-Dateien mit YAML-Frontmatter. Die erlaubten Werte sind in
[`scripts/lib/schema.mjs`](../scripts/lib/schema.mjs) definiert. Diese Datei ist die Referenz für Menschen.
Geprüft wird mit `npm run validate`.

**IDs** haben das Format `JJJJ-MM-TT-kurzer-slug` (Datum der Erfassung), z. B. `2026-10-02-navy-chino`.
Slugs bestehen nur aus Kleinbuchstaben, Ziffern und Bindestrichen. Umlaute werden ausgeschrieben (ä → ae).

**Datumsangaben** immer als String in Anführungszeichen: `"2024-03"` oder `"2024-03-15"`.

---

## Kleidungsstück: `wardrobe/<id>/item.md`

Fotos liegen im selben Ordner als `photo-1.webp`, `photo-2.webp` … (max. 1024px, ohne EXIF).

| Feld          | Pflicht | Typ          | Werte / Beispiel |
|---------------|---------|--------------|------------------|
| `name`        | ja      | Text         | `Navy Chino` |
| `category`    | ja      | Text         | `oberteil`, `hose`, `jacke`, `schuhe`, `kleid`, `accessoire`, `sport`, `unterwaesche` |
| `subcategory` |         | Text         | frei: `chino`, `t-shirt`, `hemd`, `hoodie`, `sneaker`, `mantel` … |
| `colors`      | ja      | Liste        | Hauptfarbe zuerst: `[navy, weiss]` (siehe Farbnamen unten) |
| `pattern`     |         | Text         | `uni`, `gestreift`, `kariert`, `gemustert`, `print` |
| `material`    |         | Text         | `baumwolle`, `wolle`, `leinen`, `denim`, `leder`, `polyester` … |
| `brand`       |         | Text         | `Uniqlo` |
| `size`        |         | Text         | `"M"`, `"32/32"`, `"43"` (immer in Anführungszeichen) |
| `fit`         |         | Text         | frei: `slim`, `regular`, `oversized`, `relaxed` … |
| `seasons`     |         | Liste        | `fruehling`, `sommer`, `herbst`, `winter` |
| `formality`   |         | Zahl 1–5     | 1 Sport/Lounge · 2 Casual · 3 Smart Casual · 4 Business · 5 Formell |
| `status`      | ja      | Text         | `aktiv`, `aussortiert`, `reparatur` |
| `purchase`    |         | Objekt       | `{ date: "2024-03", price: 39.90, shop: Uniqlo }` |
| `photos`      |         | Liste        | `[photo-1.webp]` |
| `tags`        |         | Liste        | frei: `[lieblingsteil, buero]` |
| `link`        |         | Text         | Produktseite im Shop (wird beim Import per Lesezeichen gesetzt) |

Der Text unter dem Frontmatter ist für Notizen: Passform, Pflege, Kombinationstipps, Mängel.

**Farbnamen**: Bevorzugt diese verwenden. Die Website zeigt für sie ein passendes Farbmuster
(definiert in `web/lib/labels.ts`), andere Namen sind erlaubt, werden aber grau dargestellt:
schwarz, weiss, creme, beige, sand, khaki, braun, cognac, grau, hellgrau, anthrazit, navy, blau, hellblau,
denim, gruen, hellgruen, dunkelgruen, oliv, mint, rot, bordeaux, rosa, pink, lila, gelb, senf, orange, gold, silber.

```markdown
---
name: Navy Chino
category: hose
subcategory: chino
colors: [navy]
pattern: uni
material: baumwolle
brand: Uniqlo
size: "32/32"
fit: slim
seasons: [fruehling, sommer, herbst]
formality: 3
status: aktiv
purchase: { date: "2024-03", price: 39.90, shop: Uniqlo }
photos: [photo-1.webp]
tags: []
---

Sitzt an der Hüfte gut, Beinlänge leicht zu lang – wird gekrempelt getragen.
```

---

## Outfit: `outfits/<id>.md`

| Feld       | Pflicht | Typ      | Werte / Beispiel |
|------------|---------|----------|------------------|
| `name`     | ja      | Text     | `Büro Herbst` |
| `items`    | ja      | Liste    | IDs aus `wardrobe/`: `[2026-10-02-navy-chino, 2026-10-02-weisses-oxford-hemd]` |
| `occasion` |         | Text     | frei: `buero`, `date`, `freizeit`, `hochzeit` … |
| `seasons`  |         | Liste    | wie oben |
| `rating`   |         | Zahl 1–5 | Wie gut gefällt dir das Outfit? |
| `source`   |         | Text     | `ich` oder `claude` |

---

## Wunschliste: `wishlist/<id>.md`

| Feld        | Pflicht | Typ      | Werte / Beispiel |
|-------------|---------|----------|------------------|
| `name`      | ja      | Text     | `Dunkelgrüner Merino-Pullover` |
| `category`  |         | Text     | wie bei Kleidungsstücken |
| `link`      |         | Text     | Produkt-URL |
| `price`     |         | Zahl     | `89.95` |
| `priority`  |         | Zahl 1–3 | 1 hoch · 2 mittel · 3 niedrig |
| `reason`    |         | Text     | Warum dieses Teil? |
| `status`    | ja      | Text     | `offen`, `gekauft`, `verworfen` |
| `fills_gap` |         | Text     | Welche Lücke schließt es? z. B. `warme Schicht fürs Büro` |

Wird ein Wunsch gekauft: `status: gekauft` setzen und ein neues Kleidungsstück in `wardrobe/` anlegen.
