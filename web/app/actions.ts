"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as lib from "@lib/data.mjs";
import { processPhoto } from "@lib/photo.mjs";
import { commitAndPush } from "@lib/git-sync.mjs";
import { downloadImage } from "@lib/product-import.mjs";
import {
  ITEM_FIELDS,
  APPEARANCE,
  MEASUREMENTS,
  OUTFIT_FIELDS,
  PALETTE,
  PROFILE_FIELDS,
  RECOMMENDATION_FIELDS,
  RECOMMENDATION_STATUS,
  SIZES,
  WISHLIST_FIELDS,
  isIsoDate,
  normalizeDate,
  normalizePrice,
  subcategoryError,
  validateFields,
} from "@lib/schema.mjs";
import { isSafeId } from "@/lib/data";
import type { FormState, ItemData, OutfitData, ProfileData, RecommendationData, WishData } from "@/lib/types";

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

/** Preis aus dem Formular: "49,95 €", "1.299,00" usw. -> Zahl; NaN bei ungültiger Eingabe */
const price = (fd: FormData, key: string) => {
  const v = text(fd, key);
  return v === undefined ? undefined : (normalizePrice(v) ?? NaN);
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

const PHOTO_FILE = /^photo-\d+\.webp$/;

/**
 * Produktbilder aus dem Shop-Import (Feld importPhotos) herunterladen. Passiert vor dem Speichern,
 * damit bei einem Fehler nichts halb angelegt wird.
 */
async function downloadImports(fd: FormData): Promise<Buffer[] | { error: string }> {
  const images: Buffer[] = [];
  for (const url of all(fd, "importPhotos").slice(0, 8)) {
    try {
      images.push(await downloadImage(url));
    } catch (err) {
      return { error: `Produktbild konnte nicht geladen werden (${(err as Error).message}). Haken entfernen und erneut speichern.` };
    }
  }
  return images;
}

/**
 * Speichert Fotos in dir als photo-N.webp: heruntergeladene Bilder, hochgeladene Dateien (Feld photos) und
 * Dateien aus copyFrom (z. B. Fotos eines Wunsches). Entfernt die Fotos aus removePhotos. Gibt die neuen Dateinamen zurück.
 */
async function storePhotos(
  fd: FormData,
  dir: string,
  downloaded: Buffer[],
  copyFrom: string[] = [],
): Promise<string[] | { error: string }> {
  const added: string[] = [];
  for (const file of copyFrom) {
    try {
      added.push(await processPhoto(file, dir));
    } catch {
      return { error: "Ein Foto vom Wunsch konnte nicht übernommen werden" };
    }
  }
  for (const image of downloaded) {
    try {
      added.push(await processPhoto(image, dir));
    } catch {
      return { error: "Ein Produktbild hat ein unbekanntes Format. Haken entfernen und erneut speichern." };
    }
  }
  for (const file of fd.getAll("photos")) {
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      added.push(await processPhoto(Buffer.from(await file.arrayBuffer()), dir));
    } catch {
      return { error: `Foto "${file.name}" konnte nicht gelesen werden (Format nicht unterstützt?)` };
    }
  }
  for (const photo of all(fd, "removePhotos")) {
    if (PHOTO_FILE.test(photo)) await fs.rm(path.join(dir, photo), { force: true });
  }
  return added;
}

/** Seiten neu laden lassen und die Änderung (falls GIT_AUTOSYNC=1) committen und pushen */
function refreshAll(commitMessage: string) {
  revalidatePath("/", "layout");
  commitAndPush(commitMessage);
}

// ---------- Kleidungsstücke ----------

export async function saveItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const existingId = text(fd, "id");
  if (existingId !== undefined && !isSafeId(existingId)) return { errors: ["Ungültige ID"] };

  const previous = existingId ? await lib.readItem(existingId).catch(() => null) : null;
  if (existingId && !previous) return { errors: ["Teil nicht gefunden"] };

  const removePhotos = new Set(all(fd, "removePhotos"));
  const keptPhotos = ((previous?.data.photos as string[] | undefined) ?? []).filter((p) => !removePhotos.has(p));

  const rawDate = text(fd, "purchaseDate");
  const purchase = {
    date: rawDate === undefined ? undefined : (normalizeDate(rawDate) ?? rawDate),
    price: price(fd, "purchasePrice"),
    shop: text(fd, "purchaseShop"),
  };
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
    link: text(fd, "link"),
  };

  const errors = validateFields(data, ITEM_FIELDS);
  const subError = subcategoryError(data.category, data.subcategory);
  if (subError) errors.push(subError);
  if (purchase.price !== undefined && Number.isNaN(purchase.price)) errors.push("Preis nicht erkannt (z. B. 39,90 oder 39,90 €)");
  if (purchase.date !== undefined && !isIsoDate(purchase.date)) errors.push("Kaufdatum ist kein gültiges Datum (JJJJ-MM-TT oder TT.MM.JJJJ)");
  if (data.link && !/^https?:\/\//.test(data.link)) errors.push("Link muss mit http:// oder https:// beginnen");
  if (errors.length) return { errors };

  const downloaded = await downloadImports(fd);
  if ("error" in downloaded) return { errors: [downloaded.error] };

  // Aus der Wunschliste gekauft: angehakte Fotos des Wunsches übernehmen
  const fromWish = text(fd, "fromWish");
  const wishFiles =
    fromWish && isSafeId(fromWish)
      ? all(fd, "wishPhotos")
          .filter((p) => PHOTO_FILE.test(p))
          .map((p) => path.join(lib.dirs.wishPhotos(fromWish), p))
      : [];

  const id = existingId ?? lib.makeId(data.name, await existingIds(lib.dirs.wardrobe(), false));
  const added = await storePhotos(fd, path.join(lib.dirs.wardrobe(), id), downloaded, wishFiles);
  if ("error" in added) return { errors: [added.error] };
  data.photos!.push(...added);

  // Leere Listen nicht in die Datei schreiben
  if (!data.seasons?.length) delete data.seasons;
  if (!data.tags?.length) delete data.tags;
  if (!data.photos?.length) delete data.photos;

  await lib.writeItem(id, data, text(fd, "body") ?? "");

  // Item aus der Wunschliste gekauft -> Wunsch abhaken
  if (fromWish && isSafeId(fromWish)) {
    const wish = await lib.readWish(fromWish).catch(() => null);
    if (wish) await lib.writeWish(fromWish, { ...wish.data, status: "gekauft" }, wish.body);
  }

  refreshAll(`Website: ${existingId ? "Teil geändert" : "Teil hinzugefügt"}: ${data.name}`);
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
  refreshAll(`Website: Teil gelöscht: ${id}`);
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
  refreshAll(`Website: Outfit ${existingId ? "geändert" : "gespeichert"}: ${data.name}`);
  redirect("/outfits");
}

export async function deleteOutfit(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(path.join(lib.dirs.outfits(), `${id}.md`), { force: true });
  refreshAll(`Website: Outfit gelöscht: ${id}`);
}

// ---------- Wunschliste ----------

export async function saveWish(_prev: FormState, fd: FormData): Promise<FormState> {
  const existingId = text(fd, "id");
  if (existingId !== undefined && !isSafeId(existingId)) return { errors: ["Ungültige ID"] };

  const previous = existingId ? await lib.readWish(existingId).catch(() => null) : null;
  if (existingId && !previous) return { errors: ["Wunsch nicht gefunden"] };
  const removePhotos = new Set(all(fd, "removePhotos"));

  const data: WishData = {
    name: text(fd, "name") ?? "",
    category: text(fd, "category"),
    link: text(fd, "link"),
    price: price(fd, "price"),
    priority: num(fd, "priority"),
    reason: text(fd, "reason"),
    status: text(fd, "status") ?? "offen",
    fills_gap: text(fd, "fills_gap"),
    photos: ((previous?.data.photos as string[] | undefined) ?? []).filter((p) => !removePhotos.has(p)),
  };
  const errors = validateFields(data, WISHLIST_FIELDS);
  if (data.price !== undefined && Number.isNaN(data.price)) errors.push("Preis nicht erkannt (z. B. 39,90 oder 39,90 €)");
  if (data.link && !/^https?:\/\//.test(data.link)) errors.push("Link muss mit http:// oder https:// beginnen");
  if (errors.length) return { errors };

  const downloaded = await downloadImports(fd);
  if ("error" in downloaded) return { errors: [downloaded.error] };

  const id = existingId ?? lib.makeId(data.name, await existingIds(lib.dirs.wishlist(), true));
  const added = await storePhotos(fd, lib.dirs.wishPhotos(id), downloaded);
  if ("error" in added) return { errors: [added.error] };
  data.photos!.push(...added);
  if (!data.photos?.length) {
    delete data.photos;
    await fs.rm(lib.dirs.wishPhotos(id), { recursive: true, force: true });
  }

  await lib.writeWish(id, data, text(fd, "body") ?? "");
  refreshAll(`Website: Wunsch ${existingId ? "geändert" : "hinzugefügt"}: ${data.name}`);
  redirect("/wishlist");
}

export async function setWishStatus(id: string, status: string) {
  if (!isSafeId(id) || !["offen", "gekauft", "verworfen"].includes(status)) return;
  const wish = await lib.readWish(id);
  await lib.writeWish(id, { ...wish.data, status }, wish.body);
  refreshAll(`Website: Wunsch ${status}: ${wish.data.name}`);
}

export async function deleteWish(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(path.join(lib.dirs.wishlist(), `${id}.md`), { force: true });
  await fs.rm(lib.dirs.wishPhotos(id), { recursive: true, force: true });
  refreshAll(`Website: Wunsch gelöscht: ${id}`);
}

// ---------- Empfehlungen ----------

/** Frage an den Stilberater. Claude beantwortet offene Fragen im Repo mit /empfehlungen. */
export async function askQuestion(_prev: FormState, fd: FormData): Promise<FormState> {
  const question = text(fd, "question");
  if (!question) return { errors: ["Bitte eine Frage eingeben"] };
  // Titel: erster Satz bzw. die ersten Wörter der Frage
  const firstLine = question.split(/\n|(?<=[.?!])\s/)[0];
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77).trimEnd()}…` : firstLine;
  const data: RecommendationData = {
    title,
    kind: "frage",
    topic: text(fd, "topic"),
    date: lib.today(),
    status: "offen",
  };
  const errors = validateFields(data, RECOMMENDATION_FIELDS);
  if (errors.length) return { errors };

  const id = lib.makeId(title, await existingIds(lib.dirs.recommendations(), true));
  await lib.writeRecommendation(id, data, question);
  refreshAll(`Website: Frage an Claude: ${title}`);
  redirect("/empfehlungen");
}

export async function setRecommendationStatus(id: string, status: string) {
  if (!isSafeId(id) || !RECOMMENDATION_STATUS.includes(status)) return;
  const rec = await lib.readRecommendation(id);
  await lib.writeRecommendation(id, { ...rec.data, status }, rec.body);
  refreshAll(`Website: Empfehlung ${status}: ${rec.data.title}`);
}

export async function deleteRecommendation(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(path.join(lib.dirs.recommendations(), `${id}.md`), { force: true });
  // Antworten auf eine gelöschte Frage verlieren nur den Verweis
  for (const rec of await lib.readRecommendations()) {
    if (rec.data.answers === id) {
      await lib.writeRecommendation(rec.id, { ...rec.data, answers: undefined }, rec.body);
    }
  }
  refreshAll(`Website: Empfehlung gelöscht: ${id}`);
  redirect("/empfehlungen");
}

// ---------- Farb-Lücken (Empfehlungen → „Welche Farbe fehlt?“) ----------

const GAP_KEY = /^[a-z]+\/[a-z-]+\/[a-z]+$/;

/** Blendet einen Vorschlag dauerhaft aus (Schlüssel wie „schuhe/loafer/braun“, gespeichert im Profil) */
export async function hideGap(key: string) {
  if (!GAP_KEY.test(key)) return;
  const profile = await lib.readProfile();
  const hidden = new Set(profile.data.hidden_gaps ?? []).add(key);
  await lib.writeProfile({ ...profile.data, hidden_gaps: [...hidden].sort() }, profile.body);
  refreshAll(`Website: Farbempfehlung ausgeblendet: ${key}`);
}

/** Holt die ausgeblendeten Vorschläge einer Kategorie (z. B. „schuhe“) zurück */
export async function restoreGaps(slot: string) {
  if (!/^[a-z]+$/.test(slot)) return;
  const profile = await lib.readProfile();
  const hidden = (profile.data.hidden_gaps ?? []).filter((k: string) => !k.startsWith(`${slot}/`));
  await lib.writeProfile({ ...profile.data, hidden_gaps: hidden.length ? hidden : undefined }, profile.body);
  refreshAll(`Website: Farbempfehlungen zurückgeholt: ${slot}`);
}

// ---------- Profil ----------

export async function saveProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const previous = await lib.readProfile();
  const errors: string[] = [];

  // Zahlen in cm/kg; leere Felder werden weggelassen
  const measure = (key: string, what: string) => {
    const n = num(fd, key);
    if (Number.isNaN(n) || (n !== undefined && n <= 0)) errors.push(`${what}: bitte eine Zahl eingeben`);
    return n !== undefined && !Number.isNaN(n) ? Math.round(n * 10) / 10 : undefined;
  };

  const measurements: Record<string, number> = {};
  for (const [key, { label }] of Object.entries(MEASUREMENTS) as [string, { label: string }][]) {
    const n = measure(`m_${key}`, label);
    if (n !== undefined) measurements[key] = n;
  }
  const appearance: Record<string, string> = {};
  for (const key of Object.keys(APPEARANCE)) {
    const v = text(fd, `a_${key}`);
    if (v) appearance[key] = v;
  }
  const palette: Record<string, string[]> = {};
  for (const key of Object.keys(PALETTE)) {
    const colors = list(fd, `p_${key}`);
    if (colors.length) palette[key] = colors;
  }
  const sizes: Record<string, string> = {};
  for (const key of Object.keys(SIZES)) {
    const v = text(fd, `s_${key}`);
    if (v) sizes[key] = v;
  }

  const data: ProfileData = {
    ...previous.data,
    height_cm: measure("height_cm", "Größe"),
    weight_kg: measure("weight_kg", "Gewicht"),
    age: measure("age", "Alter"),
    appearance,
    palette,
    measurements,
    sizes,
  };
  errors.push(...validateFields(data, PROFILE_FIELDS));
  if (errors.length) return { errors };

  const body = fd.has("body") ? (text(fd, "body") ?? "") : previous.body;
  await lib.writeProfile(data, body);
  refreshAll("Website: Profil geändert");
  redirect("/profile");
}
