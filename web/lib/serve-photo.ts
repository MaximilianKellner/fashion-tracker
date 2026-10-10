// Liefert die Fotos aus <ordner>/<id>/photo-N.webp im Datenverzeichnis aus (sie liegen außerhalb von public/)
import fs from "node:fs/promises";
import path from "node:path";
import { photoDir } from "@lib/data.mjs";
import { isSafeId } from "@/lib/data";

export async function servePhoto(kind: "items" | "wishlist", id: string, file: string) {
  if (!isSafeId(id) || !/^photo-\d+\.webp$/.test(file)) {
    return new Response("Nicht gefunden", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(photoDir(kind, id), file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "no-cache" },
    });
  } catch {
    return new Response("Nicht gefunden", { status: 404 });
  }
}
