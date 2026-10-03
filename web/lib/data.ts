// Serverseitiger Datenzugriff. Dünne Hülle um scripts/lib, damit Seiten immer frisch von der Platte lesen.
import { connection } from "next/server";
import * as lib from "@lib/data.mjs";
import { syncIfStale } from "@lib/git-sync.mjs";
import type { Item, Outfit, Profile, Recommendation, Wish } from "./types";

/** Immer frisch von der Platte lesen; bei Benutzung ggf. im Hintergrund neue Commits holen (Home-PC) */
async function fresh() {
  await connection();
  syncIfStale();
}

export async function getItems(): Promise<Item[]> {
  await fresh();
  return (await lib.readItems()) as Item[];
}

export async function getItem(id: string): Promise<Item | null> {
  await fresh();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readItem(id)) as Item;
  } catch {
    return null;
  }
}

export async function getOutfits(): Promise<Outfit[]> {
  await fresh();
  return (await lib.readOutfits()) as Outfit[];
}

export async function getOutfit(id: string): Promise<Outfit | null> {
  await fresh();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readOutfit(id)) as Outfit;
  } catch {
    return null;
  }
}

export async function getWishlist(): Promise<Wish[]> {
  await fresh();
  return (await lib.readWishlist()) as Wish[];
}

export async function getWish(id: string): Promise<Wish | null> {
  await fresh();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readWish(id)) as Wish;
  } catch {
    return null;
  }
}

export async function getRecommendations(): Promise<Recommendation[]> {
  await fresh();
  return (await lib.readRecommendations()) as Recommendation[];
}

export async function getRecommendation(id: string): Promise<Recommendation | null> {
  await fresh();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readRecommendation(id)) as Recommendation;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<Profile> {
  await fresh();
  return (await lib.readProfile()) as Profile;
}

/** Schützt vor Pfaden wie "../../etc" in IDs aus URLs und Formularen. */
export function isSafeId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(id);
}

export function photoUrl(item: Item, index = 0): string | null {
  const photo = item.data.photos?.[index];
  return photo ? `/photos/${item.id}/${photo}` : null;
}
