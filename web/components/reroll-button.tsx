"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "./icons";

/** Neu würfeln: rendert die Seite auf dem Server neu (neue Zufallsvorschläge), ohne sie neu zu laden */
export function RerollButton({ label = "Neue Vorschläge" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      title={label}
      aria-label={label}
      className="-m-1 rounded-full p-1.5 text-accent transition hover:bg-accent/15 disabled:opacity-60"
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
    </button>
  );
}
