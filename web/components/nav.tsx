"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Schrank", icon: "M4 4h16v16H4zM12 4v16M9 11v2M15 11v2" },
  { href: "/outfits", label: "Outfits", icon: "M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z" },
  { href: "/items/new", label: "Neu", icon: "M12 5v14M5 12h14", primary: true },
  { href: "/wishlist", label: "Wünsche", icon: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" },
  { href: "/stats", label: "Statistik", icon: "M5 20V10M12 20V4M19 20v-7" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || (pathname.startsWith("/items/") && pathname !== "/items/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop: Leiste oben */}
      <header className="sticky top-0 z-20 hidden border-b border-line bg-bg/90 backdrop-blur sm:block">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
          <span className="mr-4 font-semibold tracking-tight">Kleiderschrank</span>
          {LINKS.map((l) =>
            l.primary ? (
              <Link key={l.href} href={l.href} className="btn-primary ml-auto order-last py-1.5">
                <Icon d={l.icon} /> Neues Teil
              </Link>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm ${isActive(pathname, l.href) ? "bg-surface-2 font-medium text-ink" : "text-muted hover:text-ink"}`}
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>
      </header>

      {/* Mobil: Tab-Leiste unten */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <ul className="grid grid-cols-5">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(pathname, l.href) ? "text-accent font-medium" : "text-muted"}`}
              >
                {l.primary ? (
                  <span className="-mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink">
                    <Icon d={l.icon} />
                  </span>
                ) : (
                  <Icon d={l.icon} />
                )}
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
