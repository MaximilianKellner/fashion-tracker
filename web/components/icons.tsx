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

const CATEGORY_PATHS: Record<string, string[]> = {
  oberteil: ["M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"],
  hose: ["M7 3h10l1.5 18h-4.5L12 10l-2 11H5.5z"],
  jacke: ["M8 3 4 6v15h4.5V12M16 3l4 3v15h-4.5V12M8 3l4 4 4-4M12 7v14"],
  schuhe: ["M4 3h6v8l8.5 2.5A2 2 0 0 1 20 15.4V19H4z"],
  kleid: ["M9 2l1 6-4 14h12L14 8l1-6z"],
  accessoire: ["M9 6l.5-3h5L15 6M9 18l.5 3h5l.5-3M12 9v3l1.5 1.5", "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"],
  sport: ["M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"],
  unterwaesche: ["M3 5h18l-1 6c-3 0-6 2-8 8-2-6-5-8-8-8z"],
};

/** Icon einer Kategorie (Schema-Wert wie „oberteil“); unbekannte Kategorien bekommen ein Etikett */
export const CategoryIcon = ({ category, ...props }: { category?: string } & SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    {(CATEGORY_PATHS[category ?? ""] ?? ["M12 2 2 12l10 10 10-10zM12 9v.01"]).map((d) => (
      <path key={d} d={d} />
    ))}
  </Icon>
);

export const Pencil =(props: SVGProps<SVGSVGElement>) => (
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

export const X = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const SlidersHorizontal =(props: SVGProps<SVGSVGElement>) => (
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

export const RefreshCw = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </Icon>
);
