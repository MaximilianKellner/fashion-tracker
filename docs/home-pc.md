# Server auf dem Home-PC

Die Website läuft dauerhaft auf dem Home-PC: NixOS von einer microSD-Karte, `max@192.168.178.151`, Port 3000.
Das Repo liegt dort unter `/home/max/fashion-tracker`.

## Der Dienst

systemd-Service `fashion-tracker`, definiert in der NixOS-Konfiguration des Home-PCs (nicht in diesem Repo):

| Einstellung | Wert |
|---|---|
| Benutzer, Verzeichnis | `max`, `/home/max/fashion-tracker` |
| vor dem Start | `git pull --rebase --autostash` (darf fehlschlagen), dann `node scripts/prepare-server.mjs` |
| Start | `npm run start:lan` (Produktions-Build, an allen Interfaces) |
| Umgebung | `PORT=3000`, `GIT_AUTOSYNC=1`, `GIT_SYNC_MINUTES=15`, `NEXT_TELEMETRY_DISABLED=1` |
| Neustart | `Restart=on-failure`, nach 30 s (`RestartSec`; seit dem Bauen im Hintergrund würden auch 3 s reichen) |

Zum Push braucht der Benutzer `max` Schreibzugriff auf das GitHub-Repo, z. B. per Deploy-Key.

## Git-Abgleich (`scripts/lib/git-sync.mjs`)

- **Änderung über die Website**: sofort committen (`Website: Teil hinzugefügt: …`), mit `git pull --rebase` abgleichen und pushen.
  Alle Git-Aufrufe laufen nacheinander in einer Warteschlange.
- **Neue Commits holen** (z. B. Claudes Antworten): nur wenn jemand die Website benutzt, und höchstens alle 15 Minuten.
  Ohne Besucher passiert nichts, das schont die SD-Karte.
- **Neuer Code**: Bringt ein Pull Änderungen am Website-Code mit (`web/`, `scripts/lib/`, `package.json`,
  `package-lock.json`, jeweils ohne `.md`-Dateien), baut `prepare-server.mjs --background` ihn mit niedriger Priorität,
  **während die alte Version weiterläuft**. Erst danach beendet sich der Server (Exit-Code 75, nachdem noch ausstehende
  Commits rausgegangen sind), und systemd startet ihn mit dem fertigen Build neu.
  - Schlägt der Build fehl, läuft die bisherige Version einfach weiter.
  - Haben sich die Abhängigkeiten geändert (`package-lock.json`), startet der Server sofort neu: `npm ci` kann nicht unter
    dem laufenden Server laufen. Dann ist die Website wie früher für die Bauzeit weg.

Reine Datenänderungen, Doku und Kommandozeilen-Skripte (`scripts/*.mjs` außerhalb von `lib/`) lösen nie einen Neubau aus.
Code-Änderungen sind nach dem nächsten Besuch plus etwa einer Minute Bauzeit live; offline ist die Website nur für den
Neustart (`RestartSec`).

## Bauen nur bei Bedarf (`scripts/prepare-server.mjs`)

Ein kompletter `npm ci` plus Build schreibt etwa 600 MB, was eine SD-Karte auf Dauer abnutzt. Deshalb:

- **Fingerabdruck** des Codes (`scripts/lib/code-version.mjs`): Git-Blob-Hashes aller Dateien in `web/`, `scripts/lib/` und
  den `package*.json` außer Markdown, plus Inhalt lokal geänderter Dateien. Gleicher Fingerabdruck wie beim letzten Build:
  kein Build, der Server startet sofort.
- `npm ci` nur, wenn sich `package-lock.json` geändert hat.
- **Zwei Build-Ordner im Wechsel**: `web/.next` und `web/.next-alt`. Gebaut wird immer in den, aus dem der Server gerade
  nicht läuft (`NEXT_DIST_DIR`). Erst nach erfolgreichem Build trägt das Skript ihn in `web/.build-state.json` als aktiv ein;
  `web/next.config.ts` liest das beim `next start`. Jeder Ordner hat seinen Fingerabdruck in `build-stamp.json`.
  Umbenennen statt zweier Ordner geht nicht, weil Next.js den Ordnernamen in die gebauten Dateien schreibt.
- **Schlägt der Build fehl**, wird der Fingerabdruck in `web/.build-state.json` als fehlgeschlagen gemerkt und die bisherige
  Version läuft weiter (auch nach einem Neustart des PCs). Derselbe Code wird nicht noch einmal gebaut, erst ein neuer Commit
  versucht es wieder. Gibt es keine bisherige Version oder ist `npm ci` fehlgeschlagen, bricht der Start ab und systemd
  versucht es alle 30 Sekunden, ohne erneut zu bauen.

| Aufruf | Wann | Ergebnis |
|---|---|---|
| `node scripts/prepare-server.mjs` | systemd vor dem Start | baut bei Bedarf (auch `npm ci`), schaltet um |
| `node scripts/prepare-server.mjs --background` | git-sync nach neuem Code | Exit 0 gebaut und umgeschaltet, 1 fehlgeschlagen, 2 Abhängigkeiten geändert, 3 nichts zu tun |

Weitere Schonung der SD-Karte in der NixOS-Konfiguration: `noatime` und ein Journal nur im Arbeitsspeicher.

## Häufige Aufgaben

Neuen Code sofort übernehmen, statt auf den nächsten Abgleich zu warten:

```bash
ssh -t max@192.168.178.151 sudo systemctl restart fashion-tracker
```

Läuft der Dienst, und was hat er zuletzt getan?

```bash
ssh max@192.168.178.151 systemctl status fashion-tracker
```

```bash
ssh -t max@192.168.178.151 journalctl -u fashion-tracker -n 100
```

Nach einem fehlgeschlagenen Build: Fehler im Journal suchen, im Repo beheben, committen und pushen. Der Dienst holt den Fix
beim nächsten Abgleich (Website benutzen) und baut ihn im Hintergrund.

## Fehlerbehebung

| Problem | Ursache und Lösung |
|---|---|
| Neue Teile von der Website fehlen bei Claude | Am Laptop `git pull`. Claude macht das vor jeder Empfehlung selbst. |
| Claudes Änderungen fehlen auf der Website | Erst nach Commit + Push und dem nächsten Abgleich (Website benutzen, bis zu 15 min). |
| Website ein paar Sekunden nicht erreichbar | Neustart nach einem fertigen Build. Bei geänderten Abhängigkeiten dauert es länger (`npm ci` plus Build). |
| Neuer Code kommt nicht an | Build fehlgeschlagen, die alte Version läuft weiter: im Journal nach `[prepare` suchen, Fehler beheben und pushen. |
| Website dauerhaft nicht erreichbar | Start fehlgeschlagen (z. B. `npm ci`): Journal ansehen, Fehler beheben und pushen (siehe oben). |
| `nixos-rebuild switch` übernimmt keinen neuen Code | Ein Rebuild startet den Dienst nicht neu. `systemctl restart fashion-tracker` ausführen. |
| Push vom Home-PC schlägt fehl | Konflikt oder fehlende Rechte: im Journal nach `git` suchen, im Repo auf dem Home-PC `git status` prüfen. |
