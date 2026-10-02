// Liefert die Fotos aus wardrobe/<id>/photo-N.webp aus (sie liegen außerhalb von public/)
import fs from "node:fs/promises";
import path from "node:path";
import { dirs } from "@lib/data.mjs";
import { isSafeId } from "@/lib/data";

export async function GET(_req: Request, ctx: RouteContext<"/photos/[id]/[file]">) {
  const { id, file } = await ctx.params;
  if (!isSafeId(id) || !/^photo-\d+\.webp$/.test(file)) {
    return new Response("Nicht gefunden", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(dirs.wardrobe(), id, file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "no-cache" },
    });
  } catch {
    return new Response("Nicht gefunden", { status: 404 });
  }
}
