"use client";

import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "@/lib/bookmarklet";

/**
 * Ziehbarer Lesezeichen-Link. React blockiert javascript:-URLs im href-Attribut,
 * deshalb wird es nach dem Rendern direkt am Element gesetzt.
 */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const o = window.location.origin;
    ref.current?.setAttribute("href", bookmarkletHref(o));
    setOrigin(o); // eslint-disable-line react-hooks/set-state-in-effect -- origin gibt es erst im Browser
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <a
        ref={ref}
        onClick={(e) => {
          e.preventDefault();
          alert("Nicht anklicken, sondern in die Lesezeichen-Symbolleiste ziehen.");
        }}
        className="btn-primary cursor-grab px-6 py-3 text-lg"
      >
        🧥 Zum Kleiderschrank
      </a>
      {origin && <span className="text-xs text-muted">zeigt auf {origin}</span>}
    </div>
  );
}
