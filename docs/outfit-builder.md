# Wie der Outfit-Builder bewertet

Die Bewertung steht in [`scripts/lib/outfit-match.mjs`](../scripts/lib/outfit-match.mjs). Das Modul hat keine
Node-Abhängigkeiten und läuft deshalb direkt im Browser, ohne Server-Anfrage und ohne KI. Claude kann es auch im Terminal nutzen.

Ein Kandidat wird immer gegen die **schon gewählten Teile** bewertet. Ergebnis ist eine Punktzahl von 0 bis 100 und eine
Liste von Gründen; Probleme stehen vorne.

## 1. Plätze

| Platz | Welche Teile |
|---|---|
| Oberteil | Kategorie `oberteil` (und `kleid`) |
| Darunter | nur Shirts und Hemden (Schicht 1–2, siehe unten), die unter das gewählte Oberteil passen |
| Hose | `hose` |
| Schuhe | `schuhe` |
| Jacke | `jacke` |
| Kopf | Accessoires mit Unterkategorie `cap` oder `muetze` |
| Accessoire | übrige Accessoires (Gürtel, Schal, Uhr …) |

Sportteile werden über ihre Unterkategorie zugeordnet (`sporthose` → Hose usw.), Unterwäsche gar nicht.

### Schichten

Oberteile und Jacken haben eine Schicht (`layerOf`), von innen nach außen:

| Schicht | Unterkategorien |
|---|---|
| 1 Shirt | T-Shirt, Longsleeve, Tanktop, Polo, Sportshirt |
| 2 Hemd | Hemd |
| 3 Pullover | Strickpullover, Rollkragen, Cardigan, Sweatshirt, Hoodie, Half-/Quarter-Zip, Fleecejacke, Trainingsjacke |
| 4 Jacke | Blouson, Overshirt, Jeans-, Leder-, Bomber-, Softshelljacke, Blazer, Weste |
| 5 Mantel | Mantel, Parka, Steppjacke, Regenjacke |

Pro Schicht nur ein Teil: Fleece über Hoodie oder Pullover über Quarter-Zip gibt **−30** („Fleecejacke über Hoodie“).
Zwei Jacken übereinander ebenfalls, außer Mantel oder Parka über Blazer, Weste oder Overshirt. Lädt der Builder ein Outfit,
kommt das äußere Teil auf „Oberteil“ und das innere auf „Darunter“.

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

Schwarz/Navy ist nur auf großen Flächen heikel; zu schwarzen Schuhen oder einer Cap gilt es als normales neutrales Paar.

Für ein Teil werden **alle Farben** gegen **alle Farben** aller gewählten Teile verglichen. Gewichtet wird nach
- Haupt- oder Nebenfarbe: die **Hauptfarbe** (erste in `colors`) zählt voll, Nebenfarben mit 40 %,
- **Sichtbarkeit** (`visibility`): äußerstes Oberteil und Hose 1, die Schicht darunter 0,7, die nächste 0,45, Schuhe 0,6,
  Kopf 0,5, übrige Accessoires 0,35.

Aus dem gewichteten Mittel und dem **schlechtesten** deutlich sichtbaren Paar (30 %) entsteht die Farbnote. So geht ein
einzelner Ausreißer, etwa eine gelbe Nebenfarbe zu Bordeaux, nicht im Durchschnitt unter.

## 3. Regeln für das ganze Outfit

| Regel | Abzug / Bonus | Begründung |
|---|---|---|
| mehr als zwei bunte Farbfamilien (30°-Sektoren über alle Farben, nach Fläche gewichtet; ein Logo zählt nicht) | −15 | „zu viele Farben“ |
| genau ein bunter Akzent zu sonst neutralen Teilen (ab drei Teilen) | +2 | „gezielter Farbakzent“ |
| Schuhe oder Accessoire greifen eine Farbe aus dem Outfit auf (außer Schwarz, Weiß, Grau) | +4 | „greift Bordeaux auf“ |
| zwei Teile in derselben Schicht oder zwei Jacken (siehe Schichten) | −30 | „Fleecejacke über Hoodie“ |
| zweites gemustertes Teil | −12 | „zweites Muster“ |
| Funktionsjacke (Regen, Softshell, Fleece, Training) zu einem Outfit mit Formalität ab 2 | −6 | „Funktionsjacke wirkt hier sportlich“ |
| Formalität weicht zu stark ab (siehe unten) | −4 und mehr | „zu schick dafür“ / „zu lässig dafür“ |
| keine gemeinsame Saison mit einem gewählten Teil | −10 | „andere Saison“ |
| deckt Saisons des Outfits nicht ab | bis −15 (anteilig) | „nicht für Sommer“ |
| schon zusammen in einem gespeicherten Outfit | +4, je nach Bewertung bis +8 | „schon zusammen getragen“ |
| Hauptfarbe unter „Steht mir besonders“ im Profil | +4 | „steht dir besonders“ |
| Hauptfarbe unter „Sparsam einsetzen“ | −3 | |

### Formalität

Jedes Teil hat eine Stufe von 1 (Sport/Lounge) bis 5 (formell): das Feld `formality`, sonst ein Standardwert nach
Unterkategorie, z. B. Fleece/Regenjacke 1, Hoodie/T-Shirt/Jeans/Sneaker 2, Strickpullover/Polo/Chino 3, Hemd/Anzughose/Mantel 4.

Der Kandidat wird mit dem Durchschnitt der gewählten Teile verglichen. Erlaubt sind 1,75 Stufen Abstand. **Schuhe** dürfen
bewusst brechen (Sneaker zur Bundfaltenhose): Sie zählen nicht in den Durchschnitt und haben 2,25 Stufen Spielraum.

Je mehr Teile eine eigene `formality` und `seasons` haben, desto genauer werden die Vorschläge.

### Saison

`seasons` des Teils, sonst ein Standard für eindeutige Unterkategorien: Shorts und Tanktop Frühling/Sommer; Mantel, Parka,
Steppjacke, Rollkragen, Mütze, Schal, Handschuhe Herbst/Winter; Strick, Hoodie, Sweatshirt, Quarter-Zip, Cardigan, Fleece und
Softshell Frühling bis Winter; Blouson, Jeansjacke und Overshirt Frühling bis Herbst. Übrige Teile ohne Saison gelten als ganzjährig.

Die **Saisons des Outfits** (`context.seasons`, im Builder Saison-Filter und Speicherformular zugleich) sind der Maßstab:
Fehlt einem Teil eine davon, gibt es den Abzug anteilig, z. B. −15 für eine Herbstjacke im reinen Sommer-Outfit, −7,5 im
Frühling/Sommer-Outfit. Die Outfit-Karten bewerten mit den gespeicherten Saisons des Outfits.

## 4. Gesamturteil und Auffüllen

- **Gesamturteil** (`scoreOutfit`): Jedes Teil wird gegen die übrigen bewertet. Der nach Sichtbarkeit gewichtete
  Durchschnitt zählt 70 %, das schwächste Teil 30 %, damit ein Fehlgriff auffällt. Ab 80 *Sehr stimmig*, ab 68 *Stimmig*,
  ab 55 *Mutig*, darunter *Unruhig*. Zurück kommen auch alle erkannten Probleme (`problems`) und je Problem die
  betroffenen Teile (`issues: [{ text, items }]`), die der Builder markiert.
- **Leeres Outfit**: Statt gegen nichts zu bewerten, sortiert der Builder nach **Vielseitigkeit**, also der durchschnittlichen
  Punktzahl gegen alle Teile anderer Plätze.
- **Auffüllen** (`completeOutfit`): füllt Oberteil, Hose, Schuhe (mit Herbst oder Winter in den Saisons auch Jacke). Statt Platz für Platz das gerade
  beste Teil zu nehmen, verfolgt es mehrere Kombinationen parallel (Beam-Suche) und nimmt die mit dem besten Gesamturteil.
  **Würfeln** stellt 24 Outfits aus guten Kandidaten zusammen (je Platz zufällig unter den bis zu fünf, die höchstens
  12 Punkte hinter dem besten liegen) und wählt zufällig eines, das höchstens 5 Punkte hinter dem besten liegt.

Zur Kontrolle: Alle gespeicherten Outfits erreichen 84–91 Punkte; Fleece über Hoodie fällt auf *Unruhig*.

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
- Heikle Kombination: in `NEUTRAL_CLASHES` (Schlüssel alphabetisch sortiert, mit `|` getrennt); gilt sie auf kleinen
  Flächen nicht, zusätzlich in `SMALL_AREA_OK`.
- Neue Ober- oder Jackenart: Schicht in `LAYERS` eintragen; Funktionsjacken zusätzlich in `FUNCTIONAL`.
- Neue Unterkategorie: in `SUBCATEGORIES` (`schema.mjs`) und, falls eindeutig, in `DEFAULT_FORMALITY` bzw. `DEFAULT_SEASONS`
  (`scripts/lib/item-guess.mjs`; dieselben Werte schlägt das Formular beim Erfassen vor) und in `SUBCATEGORY_KEYWORDS`,
  damit sie aus Namen erkannt wird.
