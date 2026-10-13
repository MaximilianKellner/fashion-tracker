import Link from "next/link";

const LINKS = [
  { href: "/papierkorb", label: "Papierkorb" },
  { href: "/stats", label: "Statistik" },
  { href: "/profile", label: "Profil" },
];

export function Footer() {
  return (
    // Am Handy unten Platz für die Navigationsleiste lassen
    <footer className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 text-sm text-muted sm:pb-8">
      <div className="border-t border-line pt-4">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-3 grid items-center gap-2 text-xs sm:grid-cols-3">
          <span className="hidden sm:block" />
          <p className="text-center">
            © 2026 Maximilian Kellner ·{" "}
            <a
              href="https://github.com/MaximilianKellner/fashion-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              Projekt auf GitHub ↗
            </a>
          </p>
          <a href="#" className="justify-self-end hover:text-ink">
            Nach oben ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
