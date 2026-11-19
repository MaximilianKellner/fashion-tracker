import type { SVGProps } from "react";

/** Kleine Linien-Icons (Lucide-Stil), Farbe folgt der Textfarbe */
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export const Pencil = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M21.2 5.6a2.1 2.1 0 0 0-3-3L3.5 17.3 2 22l4.7-1.5z" />
    <path d="m15 5 4 4" />
  </Icon>
);

export const ShoppingBag = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Icon>
);

export const Trash2 = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
);

export const LayoutGrid = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </Icon>
);

export const Search = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const SlidersHorizontal = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 6h11M18 6h3M3 12h3M10 12h11M3 18h13M20 18h1" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);

export const Rows =(props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 5h18" />
    <path d="M3 12h18" />
    <path d="M3 19h18" />
  </Icon>
);
