"use client";

import { useTransition, type ReactNode } from "react";

/** Button, der nach Rückfrage eine Server Action ausführt (z. B. Löschen) */
export function ConfirmButton({
  action,
  confirm,
  children,
  className = "btn-ghost text-danger",
  title,
}: {
  action: () => Promise<void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      title={title}
      aria-label={title}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(() => action());
      }}
    >
      {children}
    </button>
  );
}
