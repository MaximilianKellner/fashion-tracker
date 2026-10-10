# Nix: Flake, Paket und NixOS-Modul

Das Repo ist eine Flake mit

| Ausgabe | Inhalt |
|---|---|
| `packages.<system>.default` | fertig gebaute Website (`fashion-tracker-server`) und Kommandozeile (`fashion-tracker`) |
| `nixosModules.default` | Dienst `services.fashion-tracker` mit Git- oder Datenbankmodus |
| `devShells.<system>.default` | `nix develop`: Node.js 22, Git und die Bibliotheken für sharp (auch macOS) |
| `apps.<system>.default` | `nix run .` im geklonten Repo: baut bei Bedarf und startet die Website (Einstellungen aus `.env`) |

Getestet auf x86_64 mit nixos-26.05. Die Speicher-Modi selbst erklärt [betrieb.md](betrieb.md).

## Einbinden

Mit Flakes (`/etc/nixos/flake.nix`):

```nix
{
  inputs.fashion-tracker.url = "github:MaximilianKellner/fashion-tracker";

  outputs = { nixpkgs, fashion-tracker, ... }: {
    nixosConfigurations.meinpc = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [ ./configuration.nix fashion-tracker.nixosModules.default ];
    };
  };
}
```

Ohne Flakes (`configuration.nix`):

```nix
imports = [ "${builtins.fetchTarball "https://github.com/MaximilianKellner/fashion-tracker/archive/main.tar.gz"}/nix/module.nix" ];
```

## Beispiele

**Datenbankmodus**, das Einfachste für Freunde. Daten in `/var/lib/fashion-tracker/data`:

```nix
services.fashion-tracker = {
  enable = true;
  openFirewall = true; # Website im WLAN erreichbar, z. B. fürs Handy
};
```

**Git-Modus** mit eigenem privatem Daten-Repo. Beim ersten Start wird es geklont, danach committet und pusht die Website
jede Änderung:

```nix
services.fashion-tracker = {
  enable = true;
  storage = "git";
  git.url = "git@github.com:<name>/kleiderschrank-daten.git";
  git.sshKeyFile = "/var/lib/fashion-tracker/deploy-key";
  openFirewall = true;
};
```

Deploy-Key einrichten (einmalig, auf dem Server):

```bash
sudo -u fashion-tracker ssh-keygen -t ed25519 -N "" -f /var/lib/fashion-tracker/deploy-key
```

Den Inhalt von `deploy-key.pub` im Daten-Repo auf GitHub unter Settings → Deploy keys mit **Allow write access** eintragen.

**Mit Auto-Update aus einem Checkout** (so läuft der Home-PC, siehe [home-pc.md](home-pc.md)): Der Code kommt nicht aus dem
Nix-Store, sondern aus einem Git-Checkout, der bei Benutzung neuen Code holt und im Hintergrund baut. Kein
`nixos-rebuild` für Code-Updates, dafür braucht der Build Internet (`npm ci`).

```nix
services.fashion-tracker = {
  enable = true;
  storage = "git";
  user = "max";
  group = "users";
  dataDir = "/home/max/fashion-tracker-data";
  git.url = "git@github.com:MaximilianKellner/fashion-tracker-data.git";
  git.authorName = null; # git config von max benutzen
  git.authorEmail = null;
  autoUpdate.enable = true;
  autoUpdate.checkoutDir = "/home/max/fashion-tracker";
  openFirewall = true;
};
```

## Optionen

| Option | Standard | Bedeutung |
|---|---|---|
| `enable` | `false` | Dienst einschalten |
| `storage` | `"sqlite"` | `"sqlite"` (Datenbank) oder `"git"` (Markdown im Git-Repo) |
| `stateDir` | `/var/lib/fashion-tracker` | Arbeitsverzeichnis: Cache, standardmäßig auch Daten und Checkout |
| `dataDir` | `stateDir/data` | Datenverzeichnis; bei `"git"` das Daten-Repo selbst |
| `host`, `port` | `0.0.0.0`, `3000` | Adresse der Website |
| `openFirewall` | `false` | Port in der Firewall öffnen |
| `user`, `group` | `fashion-tracker` | Benutzer des Dienstes; der Standardbenutzer wird angelegt |
| `sqlite.databaseFile` | `dataDir/fashion-tracker.db` | Datenbank-Datei |
| `git.url` | `null` | Remote des Daten-Repos; leeres `dataDir` wird beim Start geklont. Ohne: lokales Repo ohne Push |
| `git.autosync` | `true` | Änderungen committen und pushen, bei Benutzung neue Commits holen |
| `git.syncMinutes` | `15` | höchstens so oft abgleichen |
| `git.sshKeyFile` | `null` | Deploy-Key; ohne: `~/.ssh` des Benutzers |
| `git.authorName`, `git.authorEmail` | `Fashion Tracker`, `fashion-tracker@<hostname>` | Autor der Website-Commits; `null`: git config des Benutzers |
| `autoUpdate.enable` | `false` | aus einem Checkout statt aus dem Paket laufen, Code bei Benutzung aktualisieren |
| `autoUpdate.url` | dieses Repo | woher der Checkout kommt |
| `autoUpdate.checkoutDir` | `stateDir/code` | wo der Checkout liegt |
| `autoUpdate.nodejs` | `pkgs.nodejs_22` | Node.js für Checkout und Build |
| `package` | aus `nix/package.nix` | gebaute Website (nur ohne `autoUpdate`) |
| `environment` | `{ }` | weitere Umgebungsvariablen |

## Kommandozeile auf dem Server

Das Modul installiert `fashion-tracker` mit denselben Einstellungen wie der Dienst. Als Dienstbenutzer ausführen, damit
die Dateirechte stimmen:

```bash
sudo -u fashion-tracker fashion-tracker stats
```

```bash
sudo -u fashion-tracker fashion-tracker export /tmp/kleiderschrank
```

Befehle: `validate`, `stats`, `export`, `import`, `init-data`, `photo` (wie die npm-Skripte, siehe [betrieb.md](betrieb.md)).

## Was beim Start passiert

`ExecStartPre` (als Dienstbenutzer):

1. mit `autoUpdate`: Code klonen bzw. `git pull --ff-only`, dann `scripts/prepare-server.mjs` (baut nur bei geändertem Code)
2. `"git"`: Daten-Repo `git pull --rebase` bzw. beim ersten Start klonen (`git.url`) oder lokal anlegen
3. `"sqlite"`: `fashion-tracker init-data` legt Datenbank und Profil-Vorlage an, falls sie fehlen

Danach startet die Website. Ein fehlgeschlagener Pull (z. B. offline) verhindert den Start nicht.

## Paket aktualisieren

Nach jeder Änderung an `package-lock.json` stimmt `npmDepsHash` in `nix/package.nix` nicht mehr; der Build bricht dann mit
einem Hinweis ab. Neuen Hash berechnen:

```bash
nix run nixpkgs#prefetch-npm-deps -- package-lock.json
```

Wichtig: mit der Datei, wie sie im Git steht (LF-Zeilenenden). Unter Windows mit `core.autocrlf` daher auf einem
Linux-Rechner oder aus einem frischen Klon berechnen. Mit `autoUpdate` ist der Hash egal, dort baut npm selbst.

Selbst bauen und lokal starten:

```bash
nix build github:MaximilianKellner/fashion-tracker
```

```bash
STORAGE=sqlite DATA_DIR=/tmp/kleiderschrank PORT=3000 ./result/bin/fashion-tracker-server
```
