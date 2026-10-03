# Wie der Outfit-Builder bewertet

Die Bewertung steht in [`scripts/lib/outfit-match.mjs`](../scripts/lib/outfit-match.mjs). Das Modul hat keine
Node-Abhängigkeiten und läuft deshalb direkt im Browser, ohne Server-Anfrage und ohne KI. Claude kann es auch im Terminal nutzen.

Ein Kandidat wird immer gegen die **schon gewählten Teile** bewertet. Ergebnis ist eine Punktzahl von 0 bis 100 und eine
Liste von Gründen; Probleme stehen vorne.

## 1. Plätze

| Platz | Welche Teile |
|---|---|
| Oberteil, Darunter | Kategorie `oberteil` (und `kleid`) |
| Hose | `hose` |
| Schuhe | `schuhe` |
| Jacke | `jacke` |
| Kopf | Accessoires mit Unterkategorie `cap` oder `muetze` |
| Accessoire | übrige Accessoires (Gürtel, Schal, Uhr …) |

Sportteile werden über ihre Unterkategorie zugeordnet (`sporthose` → Hose usw.), Unterwäsche gar nicht.

## 2. Farbharmonie

Jede Farbe aus der Farbliste (`scripts/lib/colors.mjs`) wird von Hex in **OKLCH** umgerechnet: wahrgenommene Helligkeit,
Buntheit (Chroma) und Farbton als Winkel im Farbkreis.

**Neutral** ist eine Farbe, wenn sie kaum Chroma hat (Schwarz, Grau, Weiß …) oder in der Herrenmode wie eine Neutrale
behandelt wird: Navy, Denim, Hellblau, Braun, Cognac, Camel, Khaki, Taupe, Sand, Beige, Ecru, Creme, Oliv, Silber, Gold.

Bewertung eines Farbpaars (0–1):

| Paar | Wert | Begründung im Builder |
|---|---|---|
| zwei Neutrale | 0,82–0,92, mehr Helligkeitsabstand = besser | „ruhige neutrale Farben“ |
| heikle Neutrale: Schwarz/Braun, Schwarz/Navy, Schwarz/Cognac, Gold/Silber | 0,40–0,60 | „… sind heikel“ |
| Neutral + Farbe | 0,78–0,90; Kontrast hilft, sehr grelle Farben bekommen Abzug | „neutral, erdet …“ |
| zwei Farben, Farbton < 25° auseinander | 0,82, plus Bonus für hell/dunkel | „Ton in Ton mit …“ |
| 25–55° | 0,70 | „harmoniert mit …“ |
| 55–110° | 0,32 | „… beißt sich mit …“ |
| ab 110° (gegenüber) | 0,68, wenn höchstens eine grell ist, sonst 0,45 | „Kontrast zu …“ |

Sind beide Farben grell (Chroma > 0,14), gibt es zusätzlich 0,12 Abzug. Die Grenze für „gegenüber“ liegt bewusst schon bei
110°: Im Malerfarbkreis, nach dem Mode kombiniert wird, liegen Rot und Grün oder Blau und Orange gegenüber, in OKLCH nur gut
120° auseinander.

Für ein Teil werden alle Farbpaare gegen alle gewählten Teile gemittelt. Die **Hauptfarbe** (erste in `colors`) zählt voll,
Nebenfarben mit 40 %.

## 3. Regeln für das ganze Outfit

| Regel | Abzug / Bonus | Begründung |
|---|---|---|
| mehr als zwei bunte Farbfamilien (30°-Sektoren der Hauptfarben) | −15 | „zu viele Farben“ |
| zweites gemustertes Teil | −12 | „zweites Muster“ |
| Formalität weicht zu stark ab (siehe unten) | −4 und mehr | „zu schick dafür“ / „zu lässig dafür“ |
| keine gemeinsame Saison mit einem gewählten Teil | −10 | „andere Saison“ |
| passt nicht zur gewählten Saison im Filter | −15 | „nicht für diese Saison“ |
| schon zusammen in einem gespeicherten Outfit | +4, je nach Bewertung bis +8 | „schon zusammen getragen“ |
| Hauptfarbe unter „Steht mir besonders“ im Profil | +4 | „steht dir besonders“ |
| Hauptfarbe unter „Sparsam einsetzen“ | −3 | |

### Formalität

Jedes Teil hat eine Stufe von 1 (Sport/Lounge) bis 5 (formell): das Feld `formality`, sonst ein Standardwert nach
Unterkategorie, z. B. Hoodie 1, T-Shirt/Jeans/Sneaker 2, Strickpullover/Polo/Chino 3, Hemd/Anzughose/Mantel 4.

Der Kandidat wird mit dem Durchschnitt der gewählten Teile verglichen. Erlaubt sind 1,75 Stufen Abstand. **Schuhe** dürfen
bewusst brechen (Sneaker zur Bundfaltenhose): Sie zählen nicht in den Durchschnitt und haben 2,25 Stufen Spielraum.

Je mehr Teile eine eigene `formality` und `seasons` haben, desto genauer werden die Vorschläge.

### Saison

`seasons` des Teils, sonst ein Standard für eindeutige Unterkategorien (Shorts und Tanktop: Frühling/Sommer; Mantel, Parka,
Steppjacke, Rollkragen, Mütze: Herbst/Winter). Teile ohne Saison gelten als ganzjährig.

## 4. Gesamturteil und Auffüllen

- **Gesamturteil**: Jedes Teil wird gegen die übrigen bewertet, der Durchschnitt ergibt die Punktzahl.
  Ab 80 *Sehr stimmig*, ab 68 *Stimmig*, ab 55 *Mutig*, darunter *Unruhig*.
- **Leeres Outfit**: Statt gegen nichts zu bewerten, sortiert der Builder nach **Vielseitigkeit**, also der durchschnittlichen
  Punktzahl gegen alle Teile anderer Plätze.
- **Auffüllen** (`completeOutfit`): füllt nacheinander Oberteil, Hose, Schuhe (ab Herbst auch Jacke) mit dem jeweils besten
  Kandidaten zum bis dahin gewählten Outfit. **Würfeln** wählt zufällig unter den bis zu vier Kandidaten, die höchstens
  12 Punkte hinter dem besten liegen.

Zur Kontrolle: Alle gespeicherten Outfits erreichten bei der Einführung 84–92 Punkte.

## Im Terminal nutzen

```bash
node -e "
import('./scripts/lib/data.mjs').then(async ({ readItems, readProfile }) => {
  const { scoreCandidate, slotsFor } = await import('./scripts/lib/outfit-match.mjs');
  const items = (await readItems()).filter((i) => i.data.status === 'aktiv');
  const palette = (await readProfile()).data.palette;
  const top = items.find((i) => i.id.endsWith('oversize-zipper-knit-polo-t-shirt'));
  for (const i of items.filter((i) => slotsFor(i).includes('hose')))
    console.log(scoreCandidate(i, [top], { palette }).score, i.data.name);
})"
```

## Erweitern

- Neue Farbe: in `scripts/lib/colors.mjs` eintragen; soll sie als neutral gelten, zusätzlich in `STYLE_NEUTRALS`.
- Heikle Kombination: in `NEUTRAL_CLASHES` (Schlüssel alphabetisch sortiert, mit `|` getrennt).
- Neue Unterkategorie: in `SUBCATEGORIES` (`schema.mjs`) und, falls eindeutig, in `DEFAULT_FORMALITY` bzw. `DEFAULT_SEASONS`.
