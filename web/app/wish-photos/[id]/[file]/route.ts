// Fotos der Wunschliste: wishlist/<id>/photo-N.webp
import { servePhoto } from "@/lib/serve-photo";

export async function GET(_req: Request, ctx: RouteContext<"/wish-photos/[id]/[file]">) {
  const { id, file } = await ctx.params;
  return servePhoto("wishlist", id, file);
}
