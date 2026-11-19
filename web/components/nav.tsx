"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { PILL_CLASS, useSlidingPill } from "./sliding-pill";

/**
 * Strich über dem aktiven Tab am Handy; gleitet beim Seitenwechsel zum neuen Tab (globals.css `.indicator`).
 * Er überdeckt keinen Text und darf deshalb als eigenes Bild über der Seite liegen.
 */
function Indicator({ name, className }: { name: string; className: string }) {
  return (
    <ViewTransition name={name} share="indicator" default="none">
      <span aria-hidden className={`pointer-events-none absolute ${className}`} />
    </ViewTransition>
  );
}

type NavLink = { href: string; label: string; icon: string; desktopLabel?: string; primary?: boolean };

const LINKS: NavLink[] = [
  { href: "/", label: "Schrank", icon: "M4 4h16v16H4zM12 4v16M9 11v2M15 11v2" },
  {
    href: "/outfits",
    label: "Outfits",
    icon: "M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z",
  },
  { href: "/items/new", label: "Neu", icon: "M12 5v14M5 12h14", primary: true },
  {
    href: "/wishlist",
    label: "Wünsche",
    icon: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  },
  {
    href: "/empfehlungen",
    label: "Tipps",
    desktopLabel: "Empfehlungen",
    icon: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z",
  },
];

// Am Handy oben rechts, am Desktop in der Leiste
const SECONDARY: NavLink[] = [
  { href: "/stats", label: "Statistik", icon: "M5 20V10M12 20V4M19 20v-7" },
  {
    href: "/profile",
    label: "Profil",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || (pathname.startsWith("/items/") && pathname !== "/items/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  // Hintergrund des aktiven Punkts gleitet hinter dem Text zum neuen Punkt
  const { container, pill } = useSlidingPill<HTMLElement>(pathname);
  return (
    <>
      {/* Desktop: Leiste oben */}
      <header className="nav-bar [view-transition-name:top-nav] sticky top-0 z-20 hidden border-b border-line bg-bg/90 backdrop-blur sm:block">
        <nav ref={container} className="group/pill relative mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
          <span ref={pill} aria-hidden className={`${PILL_CLASS} rounded-lg bg-surface-2`} />
          {/* Führt immer zur Startseite zurück, ohne Filter */}
          <Link href="/" className="mr-4 rounded-lg font-semibold tracking-tight hover:text-accent">
            Kleiderschrank
          </Link>
          {[...LINKS, ...SECONDARY].map((l) =>
            l.primary ? (
              <Link key={l.href} href={l.href} className="btn-primary ml-auto order-last py-1.5">
                <Icon d={l.icon} /> Neues Teil
              </Link>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                data-active={isActive(pathname, l.href) || undefined}
                className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors duration-300 ${isActive(pathname, l.href) ? "bg-surface-2 font-medium text-ink group-data-[pill]/pill:bg-transparent" : "text-muted hover:text-ink"}`}
              >
                {l.desktopLabel ?? l.label}
              </Link>
            ),
          )}
        </nav>
      </header>

      {/* Mobil: Statistik und Profil oben rechts */}
      <div className="flex items-center justify-between px-4 pt-2 sm:hidden">
        <Link href="/" className="-ml-2 rounded-lg px-2 py-2 text-sm font-semibold tracking-tight text-muted hover:text-ink">
          Kleiderschrank
        </Link>
        <div className="-mr-2 flex gap-1">
          {SECONDARY.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-label={l.label}
              title={l.label}
              className={`rounded-full p-2 ${isActive(pathname, l.href) ? "bg-surface-2 text-accent" : "text-muted"}`}
            >
              <Icon d={l.icon} />
            </Link>
          ))}
        </div>
      </div>

      {/* Mobil: Tab-Leiste unten. Eigene Ebene im Seitenwechsel, sonst malt die animierte Seite darüber (globals.css `.nav-bar`) */}
      <nav className="nav-bar [view-transition-name:bottom-nav] fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <ul className="grid grid-cols-5">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors active:scale-95 ${isActive(pathname, l.href) ? "text-accent font-medium" : "text-muted"}`}
              >
                {isActive(pathname, l.href) && !l.primary && (
                  <Indicator name="tab-indicator" className="left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent" />
                )}
                {l.primary ? (
                  <span className="-mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm transition-transform duration-200 active:scale-90">
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
