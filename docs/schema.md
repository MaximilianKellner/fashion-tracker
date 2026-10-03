# Datenschema

Alle Daten sind Markdown-Dateien mit YAML-Frontmatter. Die erlaubten Werte sind in
[`scripts/lib/schema.mjs`](../scripts/lib/schema.mjs) definiert. Diese Datei ist die Referenz für Menschen.
Geprüft wird mit `npm run validate`.

**IDs** haben das Format `JJJJ-MM-TT-kurzer-slug` (Datum der Erfassung), z. B. `2026-10-02-navy-chino`.
Slugs bestehen nur aus Kleinbuchstaben, Ziffern und Bindestrichen. Umlaute werden ausgeschrieben (ä → ae).

**Datumsangaben** immer als ISO 8601 `JJJJ-MM-TT` in Anführungszeichen, z. B. `"2024-03-15"`. Kein Monat allein, keine deutsche Schreibweise.
Website und Import wandeln Eingaben wie `15.03.2024` automatisch um, `npm run validate` meldet Abweichungen.

**Preise** immer als Zahl in Euro mit Punkt und höchstens 2 Nachkommastellen, ohne Währungszeichen, z. B. `39.9` oder `1299`.
Eingaben wie `39,90 €` oder `1.299,00` werden beim Speichern umgewandelt.

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
| `purchase`    |         | Objekt       | `{ date: "2024-03-15", price: 39.9, shop: Uniqlo }` |
| `photos`      |         | Liste        | `[photo-1.webp]` |
| `tags`        |         | Liste        | frei: `[lieblingsteil, buero]` |
| `link`        |         | Text         | Produktseite im Shop (wird beim Import per Lesezeichen gesetzt) |

Der Text unter dem Frontmatter ist für Notizen: Passform, Pflege, Kombinationstipps, Mängel.

**Farbnamen**: Immer einen dieser Namen verwenden. Sie sind in `scripts/lib/colors.mjs` definiert, inklusive Farbmuster
für die Website und Synonymen für den Shop-Import (z. B. plum → pflaume, maroon → bordeaux). Andere Namen sind erlaubt, werden aber grau dargestellt:
schwarz, anthrazit, grau, hellgrau, weiss, creme, ecru, beige, sand, taupe, khaki, camel, cognac, braun, navy, blau, kobalt, hellblau, denim, petrol, tuerkis, dunkelgruen, gruen, smaragd, oliv, salbei, hellgruen, mint, bordeaux, weinrot, rot, rost, terrakotta, koralle, lachs, rosa, pink, aubergine, pflaume, lila, mauve, flieder, gelb, senf, ocker, orange, gold, silber.

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
purchase: { date: "2024-03-15", price: 39.9, shop: Uniqlo }
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

## Empfehlung: `recommendations/<id>.md`

Fragen stellt der Nutzer über die Website (Seite „Empfehlungen“), Antworten und eigene Empfehlungen schreibt Claude.
Der Text unter dem Frontmatter ist bei einer Frage die Frage selbst, bei einer Empfehlung die Antwort in Markdown
(Überschriften, Listen, Tabellen und Links werden auf der Website formatiert angezeigt).

| Feld      | Pflicht | Typ        | Werte / Beispiel |
|-----------|---------|------------|------------------|
| `title`   | ja      | Text       | `Smart Casual für das Abendessen` |
| `kind`    | ja      | Text       | `frage` (vom Nutzer), `empfehlung` (von Claude) |
| `topic`   |         | Text       | `outfit`, `kauf`, `analyse`, `stil` |
| `date`    | ja      | Datum      | `"2026-10-03"` |
| `status`  | ja      | Text       | `offen`, `beantwortet` (nur Fragen), `archiviert` |
| `answers` |         | Text       | ID der beantworteten Frage |
| `items`   |         | Liste      | IDs erwähnter Kleidungsstücke, werden mit Foto verlinkt |
| `outfits` |         | Liste      | IDs erwähnter Outfits |
| `wishes`  |         | Liste      | IDs erwähnter Wunschlisten-Einträge |

Eine Frage ist `offen`, bis Claude sie beantwortet hat. Dann bekommt sie `status: beantwortet`, und die Antwort verweist mit `answers` auf sie.
Empfehlungen sind `offen` (sichtbar) oder `archiviert`.

## Profil: `profile.md`

Das Frontmatter enthält die Zahlen, der Text darunter Stil, Anlässe und Einkaufsvorlieben (frei in Markdown).

| Feld           | Typ    | Werte / Beispiel |
|----------------|--------|------------------|
| `height_cm`    | Zahl   | `188` |
| `weight_kg`    | Zahl   | `84` |
| `age`          | Zahl   | `27` |
| `appearance`   | Objekt | Aussehen als Text: `skin` (Haut), `hair` (Haare), `contrast` (niedrig/mittel/hoch), `glasses` (Brille) |
| `palette`      | Objekt | Farb-IDs aus der Farbliste: `best` (steht besonders), `base` (Basis), `sparingly` (sparsam einsetzen) |
| `measurements` | Objekt | Körpermaße in cm: `chest` (Brust), `waist` (Taille/Bund), `hips` (Hüfte), `inseam` (Innenbein), `shoulder` (Schulterbreite), `sleeve` (Ärmellänge), `neck` (Hals), `foot` (Fußlänge) |
| `sizes`        | Objekt | Konfektionsgrößen als Text: `tops`, `shirts`, `trousers`, `jackets`, `shoes`, `notes` (Abweichungen je Marke) |
