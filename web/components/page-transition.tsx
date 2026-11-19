"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Animierter Seitenwechsel: Beim Wechsel auf einen anderen Pfad blendet die alte Seite aus und die neue gleitet herein
 * (CSS `.page` in globals.css). Nur Pfadwechsel zählen, Filter und Sortierung (?…) animieren die Seiten selbst.
 * Navigation und Fußzeile liegen außerhalb und bleiben stehen.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
