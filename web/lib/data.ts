// Serverseitiger Datenzugriff. Dünne Hülle um scripts/lib, damit Seiten immer frisch von der Platte lesen.
import { connection } from "next/server";
import * as lib from "@lib/data.mjs";
import type { Item, Outfit, Wish } from "./types";

export async function getItems(): Promise<Item[]> {
  await connection();
  return (await lib.readItems()) as Item[];
}

export async function getItem(id: string): Promise<Item | null> {
  await connection();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readItem(id)) as Item;
  } catch {
    return null;
  }
}

export async function getOutfits(): Promise<Outfit[]> {
  await connection();
  return (await lib.readOutfits()) as Outfit[];
}

export async function getOutfit(id: string): Promise<Outfit | null> {
  await connection();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readOutfit(id)) as Outfit;
  } catch {
    return null;
  }
}

export async function getWishlist(): Promise<Wish[]> {
  await connection();
  return (await lib.readWishlist()) as Wish[];
}

export async function getWish(id: string): Promise<Wish | null> {
  await connection();
  if (!isSafeId(id)) return null;
  try {
    return (await lib.readWish(id)) as Wish;
  } catch {
    return null;
  }
}

/** Schützt vor Pfaden wie "../../etc" in IDs aus URLs und Formularen. */
export function isSafeId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(id);
}

export function photoUrl(item: Item, index = 0): string | null {
  const photo = item.data.photos?.[index];
  return photo ? `/photos/${item.id}/${photo}` : null;
}
