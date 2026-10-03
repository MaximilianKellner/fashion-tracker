---
description: Statistiken, Stil-Feedback und Aussortier-Kandidaten für den Kleiderschrank
---

Analysiere meinen Kleiderschrank. $ARGUMENTS

1. Führ `npm run stats -- --json` aus und lies `profile.md`.
2. **Zahlen** kompakt darstellen: Anzahl aktiver Teile, Verteilung nach Kategorie und Farbe, Gesamtwert, Wert pro Kategorie, Ausgaben pro Jahr, Teile ohne Preis.
3. **Stil-Feedback**: Passt der Kleiderschrank zu dem Stil und Alltag, den ich im Profil beschreibe? Gibt es eine stimmige Farbpalette?
   Sieh dir dafür Fotos einer Auswahl der Teile an.
4. **Auffälligkeiten**:
   - Teile, die in keinem Outfit vorkommen oder sich schlecht kombinieren lassen
   - Dubletten (sehr ähnliche Teile)
   - Teile mit `status: reparatur`
   - Aussortier-Kandidaten mit Begründung
5. Schließ mit **3 konkreten nächsten Schritten** (z. B. „Profil ergänzen“, „2 Outfits für X speichern“, „/kaufempfehlung für Y ausführen“).

Ändere dabei keine Dateien, es sei denn, ich bitte darum. Biete aber an, die Analyse als Empfehlung unter
`recommendations/<id>.md` zu speichern (`kind: empfehlung`, `topic: analyse`, Felder siehe `docs/schema.md`), damit ich sie auf der Website nachlesen kann.
