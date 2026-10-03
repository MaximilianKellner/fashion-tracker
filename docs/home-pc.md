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
| Neustart | `Restart=on-failure`, nach 30 s |

Zum Push braucht der Benutzer `max` Schreibzugriff auf das GitHub-Repo, z. B. per Deploy-Key.

## Git-Abgleich (`scripts/lib/git-sync.mjs`)

- **Änderung über die Website**: sofort committen (`Website: Teil hinzugefügt: …`), mit `git pull --rebase` abgleichen und pushen.
  Alle Git-Aufrufe laufen nacheinander in einer Warteschlange.
- **Neue Commits holen** (z. B. Claudes Antworten): nur wenn jemand die Website benutzt, und höchstens alle 15 Minuten.
  Ohne Besucher passiert nichts, das schont die SD-Karte.
- **Neuer Code**: Bringt ein Pull Änderungen in `web/`, `scripts/`, `package.json` oder `package-lock.json` mit, beendet sich
  der Server nach 3 Sekunden mit Exit-Code 75. systemd startet ihn neu und `prepare-server.mjs` baut.

Reine Datenänderungen lösen also nie einen Neubau aus; Code-Änderungen sind nach dem nächsten Besuch plus einigen Minuten
Bauzeit live.

## Bauen nur bei Bedarf (`scripts/prepare-server.mjs`)

Ein kompletter `npm ci` plus Build schreibt etwa 600 MB, was eine SD-Karte auf Dauer abnutzt. Deshalb:

- Fingerabdruck des Codes aus den Git-Tree-Hashes von `web/`, `scripts/` und den `package*.json` plus lokalen Änderungen.
  Er wird in `web/.next/build-stamp.json` gespeichert.
- Gleicher Fingerabdruck wie beim letzten Build: kein Build, der Server startet sofort.
- `npm ci` nur, wenn sich `package-lock.json` geändert hat.
- **Schlägt der Build fehl**, wird der Fingerabdruck als fehlgeschlagen gemerkt. systemd startet den Dienst weiter alle
  30 Sekunden neu; jeder Versuch holt per `git pull` neue Commits, bricht aber ohne Build sofort ab, solange der Code derselbe
  ist. So werden nicht alle 30 Sekunden 600 MB geschrieben, und ein Fix-Commit wird innerhalb einer halben Minute gebaut.

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
beim nächsten Neustartversuch (spätestens nach 30 Sekunden) und baut.

## Fehlerbehebung

| Problem | Ursache und Lösung |
|---|---|
| Neue Teile von der Website fehlen bei Claude | Am Laptop `git pull`. Claude macht das vor jeder Empfehlung selbst. |
| Claudes Änderungen fehlen auf der Website | Erst nach Commit + Push und dem nächsten Abgleich (Website benutzen, bis zu 15 min). |
| Website ein paar Minuten nicht erreichbar | Der Server baut nach neuem Code neu. Fortschritt im Journal. |
| Website dauerhaft nicht erreichbar | Build fehlgeschlagen: Journal ansehen, Fehler beheben und pushen (siehe oben). |
| `nixos-rebuild switch` übernimmt keinen neuen Code | Ein Rebuild startet den Dienst nicht neu. `systemctl restart fashion-tracker` ausführen. |
| Push vom Home-PC schlägt fehl | Konflikt oder fehlende Rechte: im Journal nach `git` suchen, im Repo auf dem Home-PC `git status` prüfen. |
