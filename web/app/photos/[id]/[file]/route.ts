// Fotos der Kleidungsstücke: wardrobe/<id>/photo-N.webp
import { servePhoto } from "@/lib/serve-photo";

export async function GET(_req: Request, ctx: RouteContext<"/photos/[id]/[file]">) {
  const { id, file } = await ctx.params;
  return servePhoto("items", id, file);
}
