"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as lib from "@lib/data.mjs";
import { processPhoto } from "@lib/photo.mjs";
import { ITEM_FIELDS, OUTFIT_FIELDS, WISHLIST_FIELDS, validateFields } from "@lib/schema.mjs";
import { isSafeId } from "@/lib/data";
import type { FormState, ItemData, OutfitData, WishData } from "@/lib/types";

// ---------- Hilfsfunktionen zum Auslesen der Formulare ----------

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

const num = (fd: FormData, key: string) => {
  const v = text(fd, key);
  if (v === undefined) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const all = (fd: FormData, key: string) =>
  fd.getAll(key).filter((v): v is string => typeof v === "string" && v.trim() !== "");

/** "Navy, Weiß" -> ["navy", "weiss"] */
const list = (fd: FormData, key: string) =>
  (text(fd, key) ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss"))
    .filter(Boolean);

async function existingIds(dir: string, flat: boolean) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => (flat ? e.isFile() && e.name.endsWith(".md") : e.isDirectory()))
      .map((e) => e.name.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

function refreshAll() {
  revalidatePath("/", "layout");
}

// ---------- Kleidungsstücke ----------

export async function saveItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const existingId = text(fd, "id");
  if (existingId !== undefined && !isSafeId(existingId)) return { errors: ["Ungültige ID"] };

  const previous = existingId ? await lib.readItem(existingId).catch(() => null) : null;
  if (existingId && !previous) return { errors: ["Teil nicht gefunden"] };

  const removePhotos = new Set(all(fd, "removePhotos"));
  const keptPhotos = ((previous?.data.photos as string[] | undefined) ?? []).filter((p) => !removePhotos.has(p));

  const purchase = { date: text(fd, "purchaseDate"), price: num(fd, "purchasePrice"), shop: text(fd, "purchaseShop") };
  const data: ItemData = {
    name: text(fd, "name") ?? "",
    category: text(fd, "category") ?? "",
    subcategory: text(fd, "subcategory"),
    colors: list(fd, "colors"),
    pattern: text(fd, "pattern"),
    material: text(fd, "material"),
    brand: text(fd, "brand"),
    size: text(fd, "size"),
    fit: text(fd, "fit"),
    seasons: all(fd, "seasons"),
    formality: num(fd, "formality"),
    status: text(fd, "status") ?? "aktiv",
    purchase: Object.values(purchase).some((v) => v !== undefined) ? purchase : undefined,
    photos: keptPhotos,
    tags: list(fd, "tags"),
  };

  const errors = validateFields(data, ITEM_FIELDS);
  if (purchase.price !== undefined && Number.isNaN(purchase.price)) errors.push("Preis muss eine Zahl sein");
  if (errors.length) return { errors };

  const id = existingId ?? lib.makeId(data.name, await existingIds(lib.dirs.wardrobe(), false));
  const itemDir = path.join(lib.dirs.wardrobe(), id);

  for (const file of fd.getAll("photos")) {
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      data.photos!.push(await processPhoto(Buffer.from(await file.arrayBuffer()), itemDir));
    } catch {
      return { errors: [`Foto "${file.name}" konnte nicht gelesen werden (Format nicht unterstützt?)`] };
    }
  }
  for (const photo of removePhotos) {
    if (/^photo-\d+\.webp$/.test(photo)) await fs.rm(path.join(itemDir, photo), { force: true });
  }

  // Leere Listen nicht in die Datei schreiben
  if (!data.seasons?.length) delete data.seasons;
  if (!data.tags?.length) delete data.tags;
  if (!data.photos?.length) delete data.photos;

  await lib.writeItem(id, data, text(fd, "body") ?? "");

  // Item aus der Wunschliste gekauft -> Wunsch abhaken
  const fromWish = text(fd, "fromWish");
  if (fromWish && isSafeId(fromWish)) {
    const wish = await lib.readWish(fromWish).catch(() => null);
    if (wish) await lib.writeWish(fromWish, { ...wish.data, status: "gekauft" }, wish.body);
  }

  refreshAll();
  redirect(`/items/${id}`);
}

export async function deleteItem(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(path.join(lib.dirs.wardrobe(), id), { recursive: true, force: true });
  // Verweise in Outfits entfernen, damit die Daten gültig bleiben
  for (const outfit of await lib.readOutfits()) {
    const items = (outfit.data.items as string[]) ?? [];
    if (items.includes(id)) {
      await lib.writeOutfit(outfit.id, { ...outfit.data, items: items.filter((i) => i !== id) }, outfit.body);
    }
  }
  refreshAll();
  redirect("/");
}

// ---------- Outfits ----------

export async function saveOutfit(_prev: FormState, fd: FormData): Promise<FormState> {
  const existingId = text(fd, "id");
  if (existingId !== undefined && !isSafeId(existingId)) return { errors: ["Ungültige ID"] };

  const data: OutfitData = {
    name: text(fd, "name") ?? "",
    items: all(fd, "items").filter(isSafeId),
    occasion: text(fd, "occasion"),
    seasons: all(fd, "seasons"),
    rating: num(fd, "rating"),
    source: text(fd, "source") ?? "ich",
  };
  const errors = validateFields(data, OUTFIT_FIELDS);
  if (errors.length) return { errors };
  if (!data.seasons?.length) delete data.seasons;

  const id = existingId ?? lib.makeId(data.name, await existingIds(lib.dirs.outfits(), true));
  await lib.writeOutfit(id, data, text(fd, "body") ?? "");
  refreshAll();
  redirect("/outfits");
}

export async function deleteOutfit(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(path.join(lib.dirs.outfits(), `${id}.md`), { force: true });
  refreshAll();
}

// ---------- Wunschliste ----------

export async function saveWish(_prev: FormState, fd: FormData): Promise<FormState> {
  const existingId = text(fd, "id");
  if (existingId !== undefined && !isSafeId(existingId)) return { errors: ["Ungültige ID"] };

  const data: WishData = {
    name: text(fd, "name") ?? "",
    category: text(fd, "category"),
    link: text(fd, "link"),
    price: num(fd, "price"),
    priority: num(fd, "priority"),
    reason: text(fd, "reason"),
    status: text(fd, "status") ?? "offen",
    fills_gap: text(fd, "fills_gap"),
  };
  const errors = validateFields(data, WISHLIST_FIELDS);
  if (data.link && !/^https?:\/\//.test(data.link)) errors.push("Link muss mit http:// oder https:// beginnen");
  if (errors.length) return { errors };

  const id = existingId ?? lib.makeId(data.name, await existingIds(lib.dirs.wishlist(), true));
  await lib.writeWish(id, data, text(fd, "body") ?? "");
  refreshAll();
  redirect("/wishlist");
}

export async function setWishStatus(id: string, status: string) {
  if (!isSafeId(id) || !["offen", "gekauft", "verworfen"].includes(status)) return;
  const wish = await lib.readWish(id);
  await lib.writeWish(id, { ...wish.data, status }, wish.body);
  refreshAll();
}

export async function deleteWish(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(path.join(lib.dirs.wishlist(), `${id}.md`), { force: true });
  refreshAll();
}
