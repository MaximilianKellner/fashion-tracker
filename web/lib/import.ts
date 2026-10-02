// Rohdaten vom Lesezeichen (URL-Parameter) einlesen und ins Schema übersetzen
import { normalizeProduct } from "@lib/product-import.mjs";

export type ImportedProduct = ReturnType<typeof normalizeProduct>;

export function parseImport(param: string | string[] | undefined): ImportedProduct | null {
  if (typeof param !== "string" || param.length > 20_000) return null;
  try {
    const raw = JSON.parse(param);
    return raw && typeof raw === "object" ? normalizeProduct(raw) : null;
  } catch {
    return null;
  }
}

/** Notiz-Text für importierte Teile: Material laut Shop und gekürzte Produktbeschreibung */
export function importNotes(p: ImportedProduct) {
  return [p.materialRaw && `Material laut Shop: ${p.materialRaw}`, p.description].filter(Boolean).join("\n\n");
}
