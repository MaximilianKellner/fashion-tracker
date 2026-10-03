import { marked } from "marked";

/**
 * Zeigt Markdown aus dem Repo formatiert an (Profil, Empfehlungen von Claude).
 * Die Texte stammen nur vom Nutzer und von Claude, nicht von fremden Seiten. HTML wie <details> bleibt deshalb erlaubt.
 */
export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const html = marked.parse(source, { async: false, gfm: true, breaks: false });
  return <div className={`markdown ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
