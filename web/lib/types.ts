// TypeScript-Sicht auf das Schema aus scripts/lib/schema.mjs (siehe docs/schema.md)

export type Purchase = { date?: string; price?: number; shop?: string };

export type ItemData = {
  name: string;
  category: string;
  subcategory?: string;
  colors: string[];
  pattern?: string;
  material?: string;
  brand?: string;
  size?: string;
  fit?: string;
  seasons?: string[];
  formality?: number;
  status: string;
  purchase?: Purchase;
  photos?: string[];
  tags?: string[];
  link?: string;
};

export type OutfitData = {
  name: string;
  items: string[];
  occasion?: string;
  seasons?: string[];
  rating?: number;
  source?: string;
};

export type WishData = {
  name: string;
  category?: string;
  link?: string;
  price?: number;
  priority?: number;
  reason?: string;
  status: string;
  fills_gap?: string;
};

export type RecommendationData = {
  title: string;
  kind: string;
  topic?: string;
  date: string;
  status: string;
  answers?: string;
  items?: string[];
  outfits?: string[];
  wishes?: string[];
};

export type ProfileData = {
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  measurements?: Record<string, number>;
  sizes?: Record<string, string>;
};

export type Entry<T> = { id: string; data: T; body: string };
export type Item = Entry<ItemData>;
export type Outfit = Entry<OutfitData>;
export type Wish = Entry<WishData>;
export type Recommendation = Entry<RecommendationData>;
export type Profile = { data: ProfileData; body: string };

/** Rückgabe der Server Actions an Formulare */
export type FormState = { errors?: string[] } | null;
