# Fertig gebaute Website plus Kommandozeile als Nix-Paket.
#   bin/fashion-tracker-server   startet die Website (HOST, PORT und die Variablen aus .env.example als Umgebung)
#   bin/fashion-tracker          Kommandozeile: validate, stats, export, import, init-data, photo
# Nach Änderungen an package-lock.json muss npmDepsHash neu berechnet werden (siehe docs/nix.md).
{
  lib,
  buildNpmPackage,
  nodejs_22,
  makeWrapper,
}:

let
  root = ../.;
  # Nur was zum Bauen nötig ist: keine Daten, keine Doku, keine lokalen Builds
  src = lib.fileset.toSource {
    inherit root;
    fileset = lib.fileset.difference (lib.fileset.unions [
      ../package.json
      ../package-lock.json
      ../scripts
      ../web
    ]) (lib.fileset.unions (map lib.fileset.maybeMissing [
      ../web/node_modules
      ../web/.next
      ../web/.next-alt
      ../web/.build-state.json
      ../web/tsconfig.tsbuildinfo
    ]));
  };
in
buildNpmPackage {
  pname = "fashion-tracker";
  version = (lib.importJSON ../web/package.json).version;
  inherit src;

  nodejs = nodejs_22;
  npmDepsHash = "sha256-BMsNfqBiIRC4RZckgD+CxmYIbr3abe2M1V632GJ2Koo=";

  nativeBuildInputs = [ makeWrapper ];

  env.NEXT_TELEMETRY_DISABLED = "1";
  # Next.js schreibt beim Bauen nach $HOME
  preBuild = ''
    export HOME=$TMPDIR
  '';
  npmBuildScript = "build";

  installPhase = ''
    runHook preInstall

    app=$out/lib/fashion-tracker
    mkdir -p $app $out/bin
    cp -r package.json node_modules scripts $app/
    mkdir -p $app/web
    cp -r web/package.json web/next.config.ts web/tsconfig.json web/.next $app/web/
    rm -rf $app/web/.next/cache

    makeWrapper ${nodejs_22}/bin/node $out/bin/fashion-tracker \
      --add-flags $app/scripts/cli.mjs

    cat > $out/bin/fashion-tracker-server <<EOF
    #!$SHELL
    exec ${nodejs_22}/bin/node $app/node_modules/next/dist/bin/next start $app/web -H "\''${HOST:-0.0.0.0}" -p "\''${PORT:-3000}"
    EOF
    chmod +x $out/bin/fashion-tracker-server

    runHook postInstall
  '';

  meta = {
    description = "Kleiderschrank-Website mit Outfit-Builder, Wunschliste und Claude als Stilberater";
    homepage = "https://github.com/MaximilianKellner/fashion-tracker";
    mainProgram = "fashion-tracker";
    platforms = lib.platforms.linux;
  };
}
