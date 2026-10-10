# Fashion Tracker

Ein Kleiderschrank zum Selbst-Hosten. Kleidungsstücke, Outfits, Wunschliste und Stilprofil liegen entweder als
Markdown-Dateien mit Fotos in einem eigenen, privaten Git-Repo oder in einer SQLite-Datenbank. Eine Website (Next.js) zum
Erfassen und Ansehen läuft dauerhaft auf einem Server, und **Claude Code ist der Stilberater**: Er liest dieselben Daten,
sieht sich die Fotos an und gibt Outfit- und Kaufempfehlungen.

Dieses Repo enthält nur den Code. Jeder betreibt seine eigene Instanz mit eigenen Daten:
[Einrichtung und Speicher-Modi](docs/betrieb.md), [NixOS-Modul](docs/nix.md).

![Kleiderschrank](docs/screenshots/schrank.webp)

## Funktionen

| | |
|---|---|
| **Kleiderschrank** nach Kategorien gruppiert, filterbar nach Kategorie, Saison und Farbe. Fotos werden nie abgeschnitten. | **Outfit-Builder**: Outfit als Flatlay zusammenstellen; die Vorschläge sortieren sich live nach Farbharmonie, Formalität und Saison. |
| ![Kleiderschrank](docs/screenshots/schrank.webp) | ![Outfit-Builder](docs/screenshots/builder.webp) |
| **Detailseite** mit Farben, Größe, Kauf und den Outfits, in denen das Teil vorkommt. | **Outfits** als Collage, mit Anlass und Bewertung. |
| ![Teil](docs/screenshots/teil.webp) | ![Outfits](docs/screenshots/outfits.webp) |
| **Wunschliste** mit Bildern, Priorität und Begründung. „Gekauft“ macht daraus ein Kleidungsstück samt Fotos. | **Profil** mit Farbpalette, Körpermaßen (interaktive Grafik) und Größen als Grundlage für Empfehlungen. |
| ![Wunschliste](docs/screenshots/wunschliste.webp) | ![Profil](docs/screenshots/profil.webp) |
| **Statistik**: Wert, Kategorien, Farben, Ausgaben, Teile ohne Outfit. | **Empfehlungen**: Fragen an Claude stellen und seine Antworten nachlesen. |
| ![Statistik](docs/screenshots/statistik.webp) | ![Empfehlungen](docs/screenshots/empfehlungen.webp) |

Fürs Handy gebaut: Erfassen mit der Kamera, Navigation unten, der Builder passt sich an.

<p>
  <img src="docs/screenshots/handy-schrank.webp" width="240" alt="Kleiderschrank am Handy">
  <img src="docs/screenshots/handy-builder.webp" width="240" alt="Outfit-Builder am Handy">
</p>

Alle Seiten im Detail: [docs/website.md](docs/website.md)

## So hängt alles zusammen

Im Git-Modus:

```
 Handy / PC (Browser)                Server (NixOS)                        Daten-Repo (privat)    Laptop mit Claude Code
 ───────────────────      ─────────────────────────────────────      ─────────────────      ──────────────────────
 Website benutzen  ──────▶ Next.js liest/schreibt Markdown + Fotos  ──▶  git push  ──────▶  git pull, /outfit,
                           committet jede Änderung automatisch      ◀──  git pull  ◀──────  /kaufempfehlung, ...
                           holt neue Commits (höchstens alle 15 min)                        committet Antworten
```

- **Daten** (`wardrobe/`, `outfits/`, `wishlist/`, `recommendations/`, `profile.md`) liegen im Datenverzeichnis und ändert man
  über die Website oder über Claude. Beide Wege landen als Commit im Daten-Repo.
- **Code** (`web/`, `scripts/`) kommt aus diesem Repo, per `nixos-rebuild` oder mit Auto-Update: Der Server holt neuen Code
  selbst und baut sich neu. Beispiel-Setup und Fehlerbehebung: [docs/home-pc.md](docs/home-pc.md)
- Im **Datenbankmodus** fällt das Daten-Repo weg; Claude arbeitet dann über `export`/`import` ([docs/betrieb.md](docs/betrieb.md)).

## Mit Claude arbeiten

Code-Repo in Claude Code öffnen; das Datenverzeichnis steht in `.env` (`DATA_DIR`). Claude liest vor jeder Empfehlung
`profile.md` und holt mit `git pull` im Daten-Repo die neuesten Teile.

| Befehl | Was passiert |
|---|---|
| `/neues-teil` | Fotos aus `inbox/` ansehen, Kleidungsstücke anlegen und die Felder vorausfüllen |
| `/outfit büro` | 2–3 Outfit-Vorschläge aus dem Schrank, auf Wunsch gespeichert |
| `/kaufempfehlung brauner Lederschuh` | Lückenanalyse und echte, aktuell verfügbare Produkte für die Wunschliste |
| `/analyse` | Statistiken, Stil-Feedback, Aussortier-Kandidaten |
| `/empfehlungen` | Fragen beantworten, die auf der Website unter „Empfehlungen“ gestellt wurden |

Die Regeln, nach denen Claude empfiehlt und Daten anlegt, stehen in [CLAUDE.md](CLAUDE.md).

## Lokal starten

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run init-data
```

```bash
npm run dev:lan
```

In `.env` stehen Speicher-Modus und Datenverzeichnis ([docs/betrieb.md](docs/betrieb.md)); `init-data` legt ein leeres an.

- Am PC: http://localhost:3000
- Am Handy (gleiches WLAN): `http://<PC-IP>:3000`. Die IP zeigt der Server beim Start unter „Network“ an.
  Beim ersten Mal fragt Windows ggf. nach einer Firewall-Freigabe für Node.js. Diese nur für **private Netzwerke** erlauben.

Lokal ist der Git-Abgleich aus; Änderungen über die Website muss man dann selbst im Daten-Repo committen.

## Hilfsskripte

| Befehl | Zweck |
|---|---|
| `npm run validate` | alle Daten gegen das Schema prüfen (nach jeder Datenänderung) |
| `npm run stats` | Kennzahlen im Terminal, `npm run stats -- --json` für Skripte und Claude |
| `npm run photo -- <foto> <item-id>` | Foto auf 1024 px verkleinern, als WebP ohne EXIF (GPS!) ablegen |
| `npm run export -- <ordner>` / `npm run import -- <ordner>` | Daten als Markdown-Ordner holen bzw. übernehmen (Backup, Umzug, Claude im Datenbankmodus) |
| `npm run init-data [-- <ordner>] [--git]` | leeres Datenverzeichnis mit Profil-Vorlage anlegen |

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/website.md](docs/website.md) | alle Seiten und Funktionen der Website, Shop-Import per Lesezeichen |
| [docs/outfit-builder.md](docs/outfit-builder.md) | wie der Builder Farben und Outfits bewertet |
| [docs/schema.md](docs/schema.md) | Datenformat: alle Felder, erlaubte Werte, Farbnamen |
| [docs/betrieb.md](docs/betrieb.md) | Speicher-Modi (Git oder Datenbank), eigene Instanz einrichten, Export/Import |
| [docs/nix.md](docs/nix.md) | Flake, Nix-Paket und NixOS-Modul mit allen Optionen |
| [docs/home-pc.md](docs/home-pc.md) | Beispiel-Server auf dem Home-PC: Dienst, Auto-Update, Fehlerbehebung |
| [CLAUDE.md](CLAUDE.md) | Anleitung für Claude: Struktur, Befehle, Regeln für Empfehlungen |

## Projektstruktur

Code (dieses Repo):

```
scripts/lib/               Schema, Speicher (store/files, store/sqlite), Fotos, Farben, Outfit-Bewertung, Git-Abgleich
scripts/                   Kommandozeile: validate, stats, photo, export, import, init-data
web/                       Next.js-16-App (npm-Workspace)
nix/, flake.nix            Nix-Paket und NixOS-Modul
.claude/commands/          Slash-Commands für Claude
```

Datenverzeichnis (privat, eigenes Repo oder neben der Datenbank):

```
profile.md                 Stil, Farbpalette, Maße, Größen
wardrobe/<id>/item.md      ein Ordner pro Kleidungsstück, dazu photo-N.webp
outfits/<id>.md            gespeicherte Kombinationen (verweisen auf Item-IDs)
wishlist/<id>.md           Kaufwünsche, Bilder in wishlist/<id>/
recommendations/<id>.md    Fragen und Antworten von Claude
inbox/                     Rohfotos für /neues-teil (nicht im Repo)
```
