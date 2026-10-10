# NixOS-Modul für den Fashion Tracker. Beispiele und alle Optionen: docs/nix.md
#
#   storage = "sqlite": echte Datenbank, nichts weiter einzurichten
#   storage = "git":    Daten als Markdown in einem eigenen (privaten) Git-Repo; die Website committet und pusht
#                       jede Änderung, so kann Claude Code am Laptop mit denselben Daten arbeiten
#
# Der Code kommt entweder als Nix-Paket (Standard, Update per nixos-rebuild) oder mit autoUpdate.enable aus einem
# Git-Checkout, der sich bei Benutzung selbst aktualisiert und neu baut (scripts/prepare-server.mjs).
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.fashion-tracker;
  inherit (lib)
    mkEnableOption
    mkOption
    mkIf
    types
    optional
    optionalAttrs
    optionalString
    escapeShellArg
    ;
  isGit = cfg.storage == "git";
  nodejs = cfg.autoUpdate.nodejs;
  codeDir = cfg.autoUpdate.checkoutDir;

  environment =
    {
      STORAGE = if isGit then "files" else "sqlite";
      DATA_DIR = cfg.dataDir;
      CACHE_DIR = "${cfg.stateDir}/cache";
      HOST = cfg.host;
      PORT = toString cfg.port;
      NEXT_TELEMETRY_DISABLED = "1";
      GIT_AUTOSYNC = if isGit && cfg.git.autosync then "1" else "0";
      GIT_SYNC_MINUTES = toString cfg.git.syncMinutes;
      CODE_AUTOUPDATE = if cfg.autoUpdate.enable then "1" else "0";
    }
    // optionalAttrs (cfg.sqlite.databaseFile != null) { DATABASE_FILE = cfg.sqlite.databaseFile; }
    // optionalAttrs (cfg.git.authorName != null) {
      GIT_AUTHOR_NAME = cfg.git.authorName;
      GIT_COMMITTER_NAME = cfg.git.authorName;
    }
    // optionalAttrs (cfg.git.authorEmail != null) {
      GIT_AUTHOR_EMAIL = cfg.git.authorEmail;
      GIT_COMMITTER_EMAIL = cfg.git.authorEmail;
    }
    // optionalAttrs (cfg.git.sshKeyFile != null) {
      GIT_SSH_COMMAND = "ssh -i ${cfg.git.sshKeyFile} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new";
    }
    // cfg.environment;

  # Kommandozeile (validate, stats, export, import, …) aus dem Paket bzw. dem Checkout
  cliCommand =
    if cfg.autoUpdate.enable then "${nodejs}/bin/node ${codeDir}/scripts/cli.mjs" else "${cfg.package}/bin/fashion-tracker";

  # `fashion-tracker <befehl>` für Admins, mit denselben Einstellungen wie der Dienst
  cli = pkgs.writeShellScriptBin "fashion-tracker" ''
    ${lib.concatStringsSep "\n" (lib.mapAttrsToList (k: v: "export ${k}=${escapeShellArg v}") environment)}
    exec ${cliCommand} "$@"
  '';

  prepare = pkgs.writeShellScript "fashion-tracker-prepare" ''
    set -eu
    data=${escapeShellArg cfg.dataDir}
    mkdir -p ${escapeShellArg "${cfg.stateDir}/cache"}

    ${optionalString cfg.autoUpdate.enable ''
      # Code: beim ersten Start klonen, sonst vorspulen (offline ist kein Fehler)
      code=${escapeShellArg codeDir}
      if [ ! -d "$code/.git" ]; then
        git clone ${escapeShellArg cfg.autoUpdate.url} "$code"
      else
        git -C "$code" pull --ff-only --quiet || echo "Code-Update fehlgeschlagen, starte mit dem vorhandenen Stand"
      fi
      cd "$code"
      node scripts/prepare-server.mjs
    ''}

    ${optionalString isGit ''
      # Daten-Repo: aktualisieren, beim ersten Start klonen (git.url) oder lokal anlegen
      url=${escapeShellArg (if cfg.git.url == null then "" else cfg.git.url)}
      if [ -d "$data/.git" ]; then
        git -C "$data" pull --rebase --autostash --quiet || echo "git pull im Datenverzeichnis fehlgeschlagen, starte trotzdem"
      elif [ -n "$url" ]; then
        if [ -n "$(ls -A "$data" 2>/dev/null)" ]; then
          echo "$data ist nicht leer und kein Git-Repo, bitte prüfen" >&2
          exit 1
        fi
        git clone "$url" "$data"
      else
        # Ohne Remote: lokales Repo, Änderungen werden nur committet
        ${cliCommand} init-data --git
      fi
    ''}
    ${optionalString (!isGit) "${cliCommand} init-data"}
  '';
in
{
  options.services.fashion-tracker = {
    enable = mkEnableOption "Fashion Tracker (Kleiderschrank-Website)";

    package = mkOption {
      type = types.package;
      default = pkgs.callPackage ./package.nix { };
      defaultText = lib.literalExpression "pkgs.callPackage ./package.nix { }";
      description = "Gebaute Website. Wird bei autoUpdate.enable nicht benutzt.";
    };

    storage = mkOption {
      type = types.enum [
        "git"
        "sqlite"
      ];
      default = "sqlite";
      description = ''
        Wo die Daten liegen. "sqlite": Datenbank-Datei, Fotos als Dateien in dataDir.
        "git": Markdown-Dateien und Fotos in dataDir, einem eigenen Git-Repo (siehe git.*).
      '';
    };

    stateDir = mkOption {
      type = types.str;
      default = "/var/lib/fashion-tracker";
      description = "Arbeitsverzeichnis des Dienstes (Cache, standardmäßig auch Daten und Code-Checkout).";
    };

    dataDir = mkOption {
      type = types.str;
      default = "${cfg.stateDir}/data";
      defaultText = lib.literalExpression ''"''${stateDir}/data"'';
      description = "Datenverzeichnis. Bei storage = \"git\" das Daten-Repo selbst.";
    };

    host = mkOption {
      type = types.str;
      default = "0.0.0.0";
      description = "Adresse, an der die Website lauscht.";
    };

    port = mkOption {
      type = types.port;
      default = 3000;
    };

    openFirewall = mkOption {
      type = types.bool;
      default = false;
      description = "Port in der Firewall öffnen (z. B. fürs Handy im WLAN).";
    };

    user = mkOption {
      type = types.str;
      default = "fashion-tracker";
      description = "Benutzer des Dienstes. Der Standardbenutzer wird automatisch angelegt.";
    };

    group = mkOption {
      type = types.str;
      default = "fashion-tracker";
    };

    sqlite.databaseFile = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "Datenbank-Datei. Standard: dataDir/fashion-tracker.db";
    };

    git = {
      url = mkOption {
        type = types.nullOr types.str;
        default = null;
        example = "git@github.com:freund/kleiderschrank-daten.git";
        description = ''
          Remote des Daten-Repos. Ist dataDir beim Start leer, wird es geklont. Ohne URL wird ein lokales Repo angelegt
          (Änderungen werden committet, aber nirgends hin gepusht).
        '';
      };
      autosync = mkOption {
        type = types.bool;
        default = true;
        description = "Änderungen der Website committen und pushen, bei Benutzung neue Commits holen.";
      };
      syncMinutes = mkOption {
        type = types.ints.positive;
        default = 15;
        description = "Höchstens so oft (in Minuten) bei Benutzung abgleichen.";
      };
      sshKeyFile = mkOption {
        type = types.nullOr types.str;
        default = null;
        example = "/var/lib/fashion-tracker/deploy-key";
        description = "Privater SSH-Schlüssel (Deploy-Key mit Schreibrecht) für das Daten-Repo. Ohne: ~/.ssh des Benutzers.";
      };
      authorName = mkOption {
        type = types.nullOr types.str;
        default = "Fashion Tracker";
        description = "Autor der Commits der Website. null: git config des Benutzers.";
      };
      authorEmail = mkOption {
        type = types.nullOr types.str;
        default = "fashion-tracker@${config.networking.hostName}";
        defaultText = lib.literalExpression ''"fashion-tracker@''${config.networking.hostName}"'';
      };
    };

    autoUpdate = {
      enable = mkOption {
        type = types.bool;
        default = false;
        description = ''
          Website aus einem Git-Checkout statt aus dem Nix-Paket betreiben. Der Checkout holt bei Benutzung neuen Code
          (höchstens alle git.syncMinutes) und baut ihn im Hintergrund, während die alte Version weiterläuft.
          Braucht beim Bauen Internet (npm ci).
        '';
      };
      url = mkOption {
        type = types.str;
        default = "https://github.com/MaximilianKellner/fashion-tracker.git";
      };
      checkoutDir = mkOption {
        type = types.str;
        default = "${cfg.stateDir}/code";
        defaultText = lib.literalExpression ''"''${stateDir}/code"'';
      };
      nodejs = mkOption {
        type = types.package;
        default = pkgs.nodejs_22;
        defaultText = lib.literalExpression "pkgs.nodejs_22";
      };
    };

    environment = mkOption {
      type = types.attrsOf types.str;
      default = { };
      description = "Weitere Umgebungsvariablen für den Dienst.";
    };
  };

  config = mkIf cfg.enable {
    users.users = mkIf (cfg.user == "fashion-tracker") {
      fashion-tracker = {
        isSystemUser = true;
        group = cfg.group;
        home = cfg.stateDir;
      };
    };
    users.groups = mkIf (cfg.group == "fashion-tracker") { fashion-tracker = { }; };

    networking.firewall.allowedTCPPorts = optional cfg.openFirewall cfg.port;

    environment.systemPackages = [ cli ];

    systemd.tmpfiles.settings.fashion-tracker = {
      ${cfg.stateDir}.d = {
        inherit (cfg) user group;
        mode = "0750";
      };
    };

    systemd.services.fashion-tracker = {
      description = "Fashion Tracker (Kleiderschrank-Website)";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      inherit environment;
      path =
        with pkgs;
        [
          git
          openssh
          coreutils
          bash
        ]
        ++ optional cfg.autoUpdate.enable nodejs;

      serviceConfig = {
        User = cfg.user;
        Group = cfg.group;
        # Nicht codeDir: den legt ExecStartPre beim ersten Start erst an
        WorkingDirectory = cfg.stateDir;
        ExecStartPre = prepare;
        ExecStart =
          if cfg.autoUpdate.enable then
            "${nodejs}/bin/node ${codeDir}/node_modules/next/dist/bin/next start ${codeDir}/web -H ${cfg.host} -p ${toString cfg.port}"
          else
            "${cfg.package}/bin/fashion-tracker-server";
        # Auch Exit-Code 75 (autoUpdate: neuer Build fertig) führt so zum Neustart
        Restart = "on-failure";
        RestartSec = "10s";
        # Beim ersten Start mit autoUpdate: npm ci + Build
        TimeoutStartSec = if cfg.autoUpdate.enable then "20min" else "2min";
      };
    };
  };
}
