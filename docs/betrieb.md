# Betrieb: Speicher-Modi und eigene Instanz

Der Code (dieses Repo) ist öffentlich, die Daten nicht. Jede Instanz hat ihren eigenen Kleiderschrank: Wer den Fashion
Tracker nutzen will, betreibt eine eigene Website und wählt, wo die Daten liegen.

| | Git-Modus (`STORAGE=files`) | Datenbankmodus (`STORAGE=sqlite`) |
|---|---|---|
| Daten | Markdown-Dateien + Fotos in einem eigenen, privaten Git-Repo | eine SQLite-Datei, Fotos als Dateien daneben |
| Einrichtung | privates Repo anlegen, Server braucht Schreibrecht (Deploy-Key) | nichts weiter |
| Claude Code am Laptop | direkt: `git pull` im Daten-Repo, Dateien lesen und anlegen | über `export`/`import` auf dem Rechner mit der Datenbank |
| Historie, Backup | jede Änderung ist ein Commit auf GitHub | Datei sichern (`fashion-tracker.db` + Fotos) oder `export` |
| Gut für | wer mit Claude als Stilberater arbeitet | wer nur die Website nutzt |

Zwischen den Modi umziehen geht jederzeit verlustfrei mit `export` und `import` (siehe unten).

## Einstellungen

Lokal in `.env` im Code-Repo (Vorlage: [.env.example](../.env.example)), auf dem Server setzt sie das
[NixOS-Modul](nix.md). Werte aus der Umgebung haben Vorrang vor `.env`.

| Variable | Bedeutung | Standard |
|---|---|---|
| `STORAGE` | `files` oder `sqlite` | `files` |
| `DATA_DIR` | Datenverzeichnis, relativ zum Code-Repo oder absolut | `data/` (in `.gitignore`) |
| `DATABASE_FILE` | nur `sqlite`: Datenbank-Datei | `DATA_DIR/fashion-tracker.db` |
| `CACHE_DIR` | Cache, z. B. das KI-Modell zum Freistellen | `.cache/` |
| `GIT_AUTOSYNC` | `1`: Änderungen der Website ins Daten-Repo committen und pushen (nur `files`) | aus |
| `CODE_AUTOUPDATE` | `1`: neuen Code aus dem Checkout holen und im Hintergrund bauen | aus |
| `GIT_SYNC_MINUTES` | höchstens so oft bei Benutzung abgleichen | `15` |

## Neue Instanz einrichten

### Lokal ausprobieren

```bash
git clone https://github.com/MaximilianKellner/fashion-tracker.git
```

```bash
cd fashion-tracker && npm install && npm run init-data
```

```bash
npm run dev:lan
```

`init-data` legt `data/` mit Ordnern und einer Profil-Vorlage an (`STORAGE=files`). Für die Datenbank vorher `.env` mit
`STORAGE=sqlite` anlegen. Node.js ab 22.13 ist nötig (wegen `node:sqlite`).

### Git-Modus mit eigenem Daten-Repo

1. Auf GitHub ein **privates**, leeres Repo anlegen, z. B. `kleiderschrank-daten`.
2. Datenverzeichnis anlegen und verbinden. Liegt es in `data/`, braucht `.env` keinen Eintrag; sonst `DATA_DIR=../kleiderschrank-daten`.

   ```bash
   npm run init-data -- data --git
   ```

   ```bash
   git -C data remote add origin git@github.com:<name>/kleiderschrank-daten.git
   ```

3. Profil ausfüllen (Website → Profil, oder Claude bitten, dich zu interviewen), dann im Daten-Repo committen und pushen.
4. Für den Server einen Deploy-Key mit Schreibrecht im Daten-Repo hinterlegen und `services.fashion-tracker.git.url`
   setzen (siehe [nix.md](nix.md)).

### Datenbankmodus

```bash
echo STORAGE=sqlite > .env && npm run init-data
```

Auf einem NixOS-Server reicht `services.fashion-tracker.enable = true;` (Datenbank ist der Standard).

## Export und Import

| Befehl | Was passiert |
|---|---|
| `npm run export -- <ordner>` | alle Einträge, Fotos und das Profil als Markdown-Ordner (wie im Git-Modus) |
| `npm run import -- <ordner>` | Markdown-Ordner prüfen und in den eingestellten Speicher übernehmen; gleiche IDs werden überschrieben |
| `--prune` (bei beiden) | im Ziel löschen, was es in der Quelle nicht gibt: das Ziel wird eine genaue Kopie |
| `npm run validate -- <ordner>` | einen Markdown-Ordner prüfen, ohne ihn zu übernehmen |

Auf einem NixOS-Server heißen die Befehle `fashion-tracker export …` usw. und laufen mit den Einstellungen des Dienstes,
z. B. `sudo -u fashion-tracker fashion-tracker export /tmp/export`.

**Umzug Git → Datenbank**: `.env` auf `STORAGE=sqlite` umstellen, dann `npm run import -- <daten-repo>`.
**Umzug Datenbank → Git**: `npm run export -- <neues-daten-repo>`, dort committen, `.env` auf `STORAGE=files` umstellen.

## Claude Code im Datenbankmodus

Claude arbeitet immer mit Markdown-Dateien. Im Datenbankmodus exportiert er vorher nach `.export/`, arbeitet dort wie im
Git-Modus und spielt Änderungen mit `npm run import -- .export` zurück (Ablauf in [CLAUDE.md](../CLAUDE.md)). Das geht dort,
wo die Datenbank liegt. Läuft sie auf einem Server, entweder Claude Code dort nutzen oder den Export per `scp` holen und den
bearbeiteten Ordner zurückkopieren und importieren.

## Was wo liegt

```
Code-Repo (öffentlich)            Datenverzeichnis (privat)
──────────────────────            ─────────────────────────────────────────────
web/, scripts/, nix/, docs/       profile.md
.env  (nicht im Git)              wardrobe/<id>/item.md + photo-N.webp
.cache/  (nicht im Git)           outfits/<id>.md, wishlist/<id>.md (+ Fotos)
.export/ (nicht im Git)           recommendations/<id>.md, inbox/
                                  fashion-tracker.db (nur sqlite; dann ohne die .md-Dateien)
```

Speicher-Schicht im Code: `scripts/lib/data.mjs` wählt anhand von `STORAGE` zwischen `scripts/lib/store/files.mjs` und
`scripts/lib/store/sqlite.mjs`. In SQLite ist jeder Eintrag eine Zeile (`kind`, `id`, Frontmatter als JSON, Markdown-Text);
das Schema bleibt so an einer Stelle (`scripts/lib/schema.mjs`), und Export/Import sind verlustfrei.
