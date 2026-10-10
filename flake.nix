{
  description = "Fashion Tracker: Kleiderschrank-Website mit Outfit-Builder, Wunschliste und Claude als Stilberater";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs }:
    let
      linux = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      systems = linux ++ [
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAll = list: f: nixpkgs.lib.genAttrs list (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # Fertig gebaute Website und Kommandozeile (siehe nix/package.nix, docs/nix.md)
      packages = forAll linux (pkgs: {
        default = pkgs.callPackage ./nix/package.nix { };
      });

      # services.fashion-tracker mit Git- oder Datenbankmodus, siehe docs/nix.md
      nixosModules.default = ./nix/module.nix;

      # `nix develop`: Node, Git und die Bibliotheken, die sharp (Fotos) zur Laufzeit braucht
      devShells = forAll systems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.git
          ];
          shellHook = pkgs.lib.optionalString pkgs.stdenv.isLinux ''
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ]}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
          '';
        };
      });

      # `nix run` im Repo-Ordner: baut bei Bedarf (npm ci + Build) und startet die Website auf Port 3000.
      # Einstellungen (STORAGE, DATA_DIR, …) aus .env oder der Umgebung, siehe .env.example. Optional: PORT=3000
      apps = forAll systems (pkgs: {
        default = {
          type = "app";
          program = toString (
            pkgs.writeShellScript "fashion-tracker" ''
              export PATH="${
                pkgs.lib.makeBinPath [
                  pkgs.nodejs_22
                  pkgs.git
                  pkgs.coreutils
                ]
              }:$PATH"
              ${pkgs.lib.optionalString pkgs.stdenv.isLinux ''
                export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ]}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
              ''}
              export NEXT_TELEMETRY_DISABLED=1
              if [ ! -f scripts/prepare-server.mjs ]; then
                echo "Bitte im Ordner des geklonten Repos ausführen (nix run .)." >&2
                exit 1
              fi
              node scripts/prepare-server.mjs
              exec npm run start:lan
            ''
          );
        };
      });

      formatter = forAll systems (pkgs: pkgs.nixfmt-rfc-style);
    };
}
