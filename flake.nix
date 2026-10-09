{
  description = "Fashion Tracker: persönlicher Kleiderschrank als Git-Repo mit Website";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      # `nix develop`: Node, Git und die Bibliotheken, die sharp (Fotos) zur Laufzeit braucht
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_22 pkgs.git ];
          shellHook = pkgs.lib.optionalString pkgs.stdenv.isLinux ''
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ]}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
          '';
        };
      });

      # `nix run` im Repo-Ordner: baut bei Bedarf (npm ci + Build) und startet die Website auf Port 3000.
      # Optional: DATA_DIR=/pfad/zu/eigenen/daten, PORT=3000
      apps = forAll (pkgs: {
        default = {
          type = "app";
          program = toString (pkgs.writeShellScript "fashion-tracker" ''
            export PATH="${pkgs.lib.makeBinPath [ pkgs.nodejs_22 pkgs.git pkgs.coreutils ]}:$PATH"
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
          '');
        };
      });
    };
}
