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

/** Ein Eintrag per ID, null bei unsicherer oder unbekannter ID */
async function getOne<T>(read: (id: string) => Promise<unknown>, id: string): Promise<T | null> {
  await fresh();
  if (!isSafeId(id)) return null;
  try {
    return (await read(id)) as T;
  } catch {
    return null;
  }
}

export async function getItems(): Promise<Item[]> {
  await fresh();
  return (await lib.readItems()) as Item[];
}

export const getItem = (id: string) => getOne<Item>(lib.readItem, id);

export async function getOutfits(): Promise<Outfit[]> {
  await fresh();
  return (await lib.readOutfits()) as Outfit[];
}

export const getOutfit = (id: string) => getOne<Outfit>(lib.readOutfit, id);

/** Wunschliste ohne die Wünsche im Papierkorb */
export async function getWishlist(): Promise<Wish[]> {
  await fresh();
  return ((await lib.readWishlist()) as Wish[]).filter((w) => !w.data.trashed_at);
}

export async function getTrashedWishes(): Promise<Wish[]> {
  await fresh();
  return ((await lib.readWishlist()) as Wish[]).filter((w) => w.data.trashed_at);
}

export const getWish = (id: string) => getOne<Wish>(lib.readWish, id);

export async function getRecommendations(): Promise<Recommendation[]> {
  await fresh();
  return (await lib.readRecommendations()) as Recommendation[];
}

export const getRecommendation = (id: string) => getOne<Recommendation>(lib.readRecommendation, id);

export async function getProfile(): Promise<Profile> {
  await fresh();
  return (await lib.readProfile()) as Profile;
}

/** Schützt vor Pfaden wie "../../etc" in IDs aus URLs und Formularen. */
export function isSafeId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(id);
}
