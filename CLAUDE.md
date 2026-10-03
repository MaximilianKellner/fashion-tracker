# Fashion Tracker

Persönlicher Kleiderschrank als Git-Repo. Die Daten sind Markdown-Dateien mit YAML-Frontmatter plus Fotos.
Claude ist der Stilberater: Er liest die Daten, sieht sich die Fotos an und gibt Outfit- und Kaufempfehlungen.
**Antworte immer auf Deutsch.**

## Struktur
- `profile.md`: Stil, Größen, Budget, Anlässe des Nutzers. **Vor jeder Empfehlung lesen.** Größe, Gewicht, Körpermaße (cm) und
  Konfektionsgrößen stehen im Frontmatter, der Rest als Text. Auf der Website unter „Profil“ bearbeitbar.
- `wardrobe/<id>/item.md` + `photo-N.webp`: ein Ordner pro Kleidungsstück
- `outfits/<id>.md`: gespeicherte Kombinationen (verweisen auf Item-IDs)
- `wishlist/<id>.md`: Kaufwünsche und -empfehlungen
- `recommendations/<id>.md`: Fragen von der Website und Claudes Antworten bzw. Empfehlungen (auf der Website unter „Empfehlungen“)
- `inbox/`: neue Rohfotos, die noch erfasst werden müssen (siehe `/neues-teil`)
- `docs/schema.md`: alle Felder und erlaubten Werte. Die maschinenlesbare Version steht in `scripts/lib/schema.mjs`.
- `scripts/`: Node-Hilfsskripte. `scripts/lib/` (Schema, Lesen/Schreiben, Fotos, Statistik) wird auch von der Website genutzt.
- `web/`: Next.js-16-App (npm-Workspace) zum Erfassen und Ansehen. Sie liest und schreibt dieselben Dateien und hat keine eigene Datenbank.
  Vor Änderungen an `web/` die Hinweise in `web/AGENTS.md` beachten (Next.js 16, Doku in `node_modules/next/dist/docs/`).

## Befehle
- `npm run dev` / `npm run dev:lan`: Website starten (lokal bzw. auch fürs Handy im WLAN)
- `npm run validate`: alle Dateien gegen das Schema prüfen. **Nach jeder Änderung an Daten ausführen.**
- `npm run stats` (oder `npm run stats -- --json`): Kennzahlen (Kategorien, Farben, Wert, Ausgaben)
- `npm run photo -- <foto> <item-id> [--delete]`: Foto verkleinern, als WebP ohne EXIF ablegen, gibt den Dateinamen aus

## Slash-Commands
- `/neues-teil`: Fotos aus `inbox/` erfassen
- `/outfit [Anlass]`: Outfit-Vorschläge aus dem vorhandenen Kleiderschrank
- `/kaufempfehlung [Wunsch]`: Lückenanalyse und konkrete Produkte für die Wunschliste
- `/analyse`: Statistiken, Stil-Feedback und Aussortier-Kandidaten
- `/empfehlungen`: offene Fragen von der Website beantworten

## Regeln für Empfehlungen
- Nur Teile mit `status: aktiv` für Outfits verwenden.
- Frontmatter für Überblick und Filterung nutzen, **Fotos ansehen**, wenn es auf Farbton, Muster oder Stil ankommt.
- Saison und Wetter beachten. Das heutige Datum ist bekannt; das Wetter am Wohnort aus `profile.md` bei Bedarf per Websuche holen.
- Outfit-Vorschläge immer mit Item-IDs/Namen und kurzer Begründung (Farben, Formalität, Proportionen).
- Kaufempfehlungen: erst begründen, welche Lücke ein Teil schließt und mit wie vielen vorhandenen Teilen es kombinierbar ist. Dann **echte, aktuell verfügbare Produkte per Websuche** im Budget und in bevorzugten Shops aus dem Profil vorschlagen, mit Link und Preis.
- Ehrlich sein: Wenn etwas nicht zusammenpasst oder ein Kauf unnötig ist, das sagen.
- Ist `profile.md` noch leer, zuerst anbieten, den Nutzer kurz zu interviewen und das Profil auszufüllen.

## Konventionen beim Anlegen von Daten
- IDs: `JJJJ-MM-TT-slug` mit dem heutigen Datum, Slug klein und mit Bindestrichen, Umlaute ausgeschrieben.
- Datumsangaben immer `"JJJJ-MM-TT"`, Preise als Zahl mit Punkt ohne € (`39.9`), Größen in Anführungszeichen (`"M"`).
- Farben immer aus der Farbliste in `docs/schema.md` bzw. `scripts/lib/colors.mjs` wählen (Shop-Namen per `mapColors` übersetzen).
- Fotos nie direkt kopieren, immer über `npm run photo` verarbeiten (Größe + Datenschutz).
- Unbekannte Felder weglassen, nicht raten (z. B. Preis, Marke). Beim Nutzer nachfragen.
- Nicht selbstständig committen, außer der Nutzer bittet darum.

## Sync mit dem Home-PC
Die Website läuft dauerhaft auf dem Home-PC (NixOS, `max@192.168.178.151`, Port 3000) und committet und pusht
jede Änderung automatisch (`GIT_AUTOSYNC=1`, siehe `scripts/lib/git-sync.mjs`). Neue Commits holt sie nur, wenn jemand die
Website benutzt, höchstens alle 15 Minuten (schont die SD-Karte des Home-PCs). Beim Start baut `scripts/prepare-server.mjs`
nur neu, wenn sich Code oder Abhängigkeiten geändert haben.
- **Vor jeder Analyse oder Empfehlung `git pull` ausführen**, sonst fehlen Teile, die über die Website erfasst wurden.
- Nach Änderungen an Daten (`wardrobe/`, `outfits/`, `wishlist/`, `recommendations/`, `profile.md`) anbieten, sie zu committen und zu pushen.
  Erst dann erscheinen sie auf der Website.
- Code-Änderungen (`web/`, `scripts/`, `package*.json`) kommen automatisch an: Holt die Website beim nächsten Abgleich neuen
  Code, beendet sie sich, systemd startet sie neu und sie baut einige Minuten lang neu. Schlägt der Build fehl, versucht sie es
  erst beim nächsten Commit wieder. Sofort geht es mit `ssh -t max@192.168.178.151 sudo systemctl restart fashion-tracker`.
