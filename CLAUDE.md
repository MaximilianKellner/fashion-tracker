# Fashion Tracker

Persönlicher Kleiderschrank. Die Daten sind Markdown-Dateien mit YAML-Frontmatter plus Fotos (oder eine SQLite-Datenbank).
Claude ist der Stilberater: Er liest die Daten, sieht sich die Fotos an und gibt Outfit- und Kaufempfehlungen.
**Antworte immer auf Deutsch.**

## Code und Daten sind getrennt
Dieses Repo ist öffentlich und enthält nur Code. Die Daten liegen im **Datenverzeichnis** aus `.env` (`DATA_DIR`, relativ zu
diesem Repo; Standard `data/`), meist ein eigenes, privates Git-Repo. Alle Datenpfade unten (`profile.md`, `wardrobe/` …)
gelten **im Datenverzeichnis**. Vor der Arbeit `.env` lesen (fehlt sie, gelten `STORAGE=files` und `data/`).
**Niemals Daten (Kleidung, Profil, Fotos) in dieses Repo committen.**

- `STORAGE=files`: direkt im Datenverzeichnis arbeiten. Git-Befehle für Daten immer dort ausführen (`git -C <DATA_DIR> …`).
- `STORAGE=sqlite`: Die Daten stehen in einer Datenbank. Vor der Arbeit `npm run export -- .export --prune` ausführen und dann
  wie bei `files` mit dem Ordner `.export/` arbeiten: allen `npm run`-Befehlen `STORAGE=files DATA_DIR=.export` voranstellen.
  Danach Änderungen mit `npm run import -- .export` zurückspielen (prüft vorher gegen das Schema). Liegt die Datenbank
  auf einem Server, dort `fashion-tracker export`/`import` ausführen (siehe `docs/nix.md`).

## Struktur der Daten (im Datenverzeichnis)
- `profile.md`: Stil, Größen, Budget, Anlässe des Nutzers. **Vor jeder Empfehlung lesen.** Größe, Gewicht, Körpermaße (cm) und
  Konfektionsgrößen stehen im Frontmatter, der Rest als Text. Statt des Alters steht dort `birthdate`; das Alter mit
  `ageFromBirthdate` aus `scripts/lib/schema.mjs` bzw. aus dem heutigen Datum berechnen. Auf der Website unter „Profil“ bearbeitbar.
- `wardrobe/<id>/item.md` + `photo-N.webp`: ein Ordner pro Kleidungsstück
- `outfits/<id>.md`: gespeicherte Kombinationen (verweisen auf Item-IDs)
- `wishlist/<id>.md`: Kaufwünsche und -empfehlungen
- `recommendations/<id>.md`: Fragen von der Website und Claudes Antworten bzw. Empfehlungen (auf der Website unter „Empfehlungen“)
- `inbox/`: neue Rohfotos, die noch erfasst werden müssen (siehe `/neues-teil`)

## Struktur des Codes
- `docs/`: `website.md` (alle Seiten), `outfit-builder.md` (Bewertung), `betrieb.md` (Speicher-Modi, Einrichtung für neue
  Nutzer), `nix.md` (Flake und NixOS-Modul), `home-pc.md` (Server, Auto-Update), Screenshots in `docs/screenshots/`.
  Bei Änderungen an Website, Builder, Speicher oder Server die passende Seite aktualisieren.
- `docs/schema.md`: alle Felder und erlaubten Werte. Die maschinenlesbare Version steht in `scripts/lib/schema.mjs`.
- `scripts/lib/data.mjs`: Lesen und Schreiben, egal welcher Speicher (`scripts/lib/store/files.mjs`, `store/sqlite.mjs`).
  Lädt `.env` selbst, funktioniert also auch per `node -e`.
- `scripts/lib/outfit-match.mjs`: Farb- und Outfit-Bewertung des Outfit-Builders (Website unter Outfits → „Outfit bauen“). Für Outfit-Vorschläge
  kann sie per `node -e` genutzt werden (`scoreCandidate`, `scoreOutfit`, `completeOutfit`), statt alle Farben selbst abzuwägen.
- `scripts/lib/color-gaps.mjs`: welche Farbe und Art je Kategorie (Hosen, Oberteile, Schuhe, Jacken) den Schrank am meisten ergänzt
  (`colorGaps(items, { palette })`, Website unter „Empfehlungen“). Guter Ausgangspunkt für `/kaufempfehlung`.
- `scripts/lib/item-guess.mjs`: errät aus Name, Shop-Daten, Unterkategorie und Material Kategorie, Farben, Material,
  Formalität und Saisons (Formular und Shop-Import der Website, Fallbacks im Outfit-Builder).
- `scripts/`: Node-Hilfsskripte. `scripts/lib/` (Schema, Lesen/Schreiben, Fotos, Statistik) wird auch von der Website genutzt.
- `web/`: Next.js-16-App (npm-Workspace) zum Erfassen und Ansehen. Sie nutzt dieselbe Datenschicht und hat keine eigene Datenbank.
  Vor Änderungen an `web/` die Hinweise in `web/AGENTS.md` beachten (Next.js 16, Doku in `node_modules/next/dist/docs/`).
- `flake.nix`, `nix/`: Nix-Paket und NixOS-Modul (`services.fashion-tracker`). Nach Änderungen an `package-lock.json`
  `npmDepsHash` in `nix/package.nix` aktualisieren (siehe `docs/nix.md`).

## Befehle
- `npm run dev` / `npm run dev:lan`: Website starten (lokal bzw. auch fürs Handy im WLAN)
- `npm run validate [-- <ordner>]`: alle Daten gegen das Schema prüfen. **Nach jeder Änderung an Daten ausführen.**
- `npm run stats` (oder `npm run stats -- --json`): Kennzahlen (Kategorien, Farben, Wert, Ausgaben)
- `npm run photo -- <foto> <item-id> [--delete]`: Foto verkleinern, als WebP ohne EXIF ablegen, gibt den Dateinamen aus
- `npm run export -- <ordner> [--prune]` / `npm run import -- <ordner> [--prune]`: Daten als Markdown-Ordner aus dem Speicher
  holen bzw. hineinschreiben (Datenbankmodus, Backup, Umzug zwischen den Modi)
- `npm run init-data [-- <ordner>] [--git]`: leeres Datenverzeichnis mit Profil-Vorlage anlegen

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
- Neue Dateien immer im Datenverzeichnis anlegen, nie in diesem Repo.
- IDs: `JJJJ-MM-TT-slug` mit dem heutigen Datum, Slug klein und mit Bindestrichen, Umlaute ausgeschrieben.
- Datumsangaben immer `"JJJJ-MM-TT"`, Preise als Zahl mit Punkt ohne € (`39.9`), Größen in Anführungszeichen (`"M"`).
- Farben immer aus der Farbliste in `docs/schema.md` bzw. `scripts/lib/colors.mjs` wählen (Shop-Namen per `mapColors` übersetzen).
- Fotos nie direkt kopieren, immer über `npm run photo` verarbeiten (Größe + Datenschutz).
- Unbekannte Felder weglassen, nicht raten (z. B. Preis, Marke). Beim Nutzer nachfragen.
- Nicht selbstständig committen, außer der Nutzer bittet darum.

## Sync mit dem Server
Die Website läuft dauerhaft auf einem Server (beim Besitzer dieses Repos der Home-PC, `max@192.168.178.151`, Port 3000,
siehe `docs/home-pc.md`). Im Git-Modus committet und pusht sie jede Änderung ins Daten-Repo (`GIT_AUTOSYNC=1`, siehe
`scripts/lib/git-sync.mjs`) und holt neue Commits nur, wenn jemand die Website benutzt, höchstens alle 15 Minuten.
- **Vor jeder Analyse oder Empfehlung die Daten holen**: im Git-Modus `git -C <DATA_DIR> pull`, im Datenbankmodus exportieren
  (siehe oben). Sonst fehlen Teile, die über die Website erfasst wurden.
- Nach Änderungen an Daten anbieten, sie im **Daten-Repo** zu committen und zu pushen (bzw. zu importieren).
  Erst dann erscheinen sie auf der Website.
- Code-Änderungen (`web/`, `scripts/lib/`, `package*.json`, ohne `.md`) gehen über dieses Repo. Mit `autoUpdate` holt der
  Server neuen Code beim nächsten Abgleich und baut ihn im Hintergrund, während die alte Version weiterläuft; sonst per
  `nixos-rebuild` (siehe `docs/nix.md`). Sofort: `ssh -t max@192.168.178.151 sudo systemctl restart fashion-tracker`.
