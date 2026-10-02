# Fashion Tracker

Mein Kleiderschrank als Git-Repo: Kleidungsstücke, Outfits und eine Wunschliste als Markdown-Dateien mit Fotos.
Die Website dient zum Erfassen und Ansehen. Für Empfehlungen öffne ich das Repo in Claude Code.

## Start

```bash
npm install
npm run dev:lan
```

- Am PC: http://localhost:3000
- Am Handy (gleiches WLAN): `http://<PC-IP>:3000`. Die IP zeigt der Server beim Start unter „Network“ an.
  Beim ersten Mal fragt Windows ggf. nach einer Firewall-Freigabe für Node.js. Diese nur für **private Netzwerke** erlauben.

## Mit Claude arbeiten

| Befehl | Was passiert |
|---|---|
| `/neues-teil` | Fotos aus `inbox/` ansehen, Kleidungsstücke anlegen und die Beschreibung vorausfüllen |
| `/outfit büro` | 2–3 Outfit-Vorschläge aus dem Schrank, optional speichern |
| `/kaufempfehlung` | Lückenanalyse und echte Produkte für die Wunschliste |
| `/analyse` | Statistiken, Stil-Feedback, Aussortier-Kandidaten |

Vorher einmal `profile.md` ausfüllen oder Claude bitten, dich dazu zu interviewen. Je besser das Profil, desto besser die Empfehlungen.

## Hilfsskripte

- `npm run validate`: alle Dateien gegen das Schema prüfen
- `npm run stats`: Kennzahlen im Terminal
- `npm run photo -- <foto> <item-id>`: Foto verkleinern und ohne EXIF ablegen

Datenformat: [docs/schema.md](docs/schema.md)

> Das Repo enthält Fotos, Größen und Ausgaben. Wenn du es auf GitHub pushst, dann nur als **privates** Repository.
