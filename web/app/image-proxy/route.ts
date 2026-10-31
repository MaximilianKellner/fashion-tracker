// Produktbild eines fremden Shops über den eigenen Server laden, damit der Browser es bearbeiten kann
// („Hintergrund weiß“): Shops erlauben meist kein CORS. Gleiche Prüfungen wie beim Speichern (nur öffentliches https).
import sharp from "sharp";
import { downloadImage } from "@lib/product-import.mjs";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return new Response("url fehlt", { status: 400 });
  try {
    // Als JPEG ausliefern, damit der Browser jedes Format (AVIF, HEIC …) dekodieren kann
    const jpeg = await sharp(await downloadImage(url))
      .rotate()
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90 })
      .toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch (e) {
    return new Response(`Bild nicht verfügbar: ${(e as Error).message}`, { status: 502 });
  }
}
