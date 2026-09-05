import { supabase } from "../supabaseClient";
import { currentLocale, type Locale } from "../i18n";
import { translateContent } from "./translations";

export interface Monument {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  description: string | null;
  reference_image_url: string | null;
  mind_target_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  built_year?: number | null;
  lat?: number;
  lng?: number;
}

export interface MonumentPeriod {
  id: string;
  year_from: number | null;
  year_to: number | null;
  title: string;
  description: string | null;
  order_index: number;
}

export interface MonumentDetail extends Monument {
  periods: MonumentPeriod[];
}

export interface CollectionMonument {
  id: string;
  name: string;
  reference_image_url: string | null;
}

export async function getNearbyMonuments(lat: number, lng: number, radiusM = 1000, locale: Locale = currentLocale()) {
  const { data, error } = await supabase.rpc("monuments_nearby", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_only_unvisited: false,
  });
  if (error) throw error;
  return translateContent("monument", (data ?? []) as Array<Monument & { distance_m: number }>, locale);
}

export async function getAllMonuments(locale: Locale = currentLocale()): Promise<Monument[]> {
  const { data, error } = await supabase.rpc("monuments_all");
  if (error) throw error;
  return translateContent("monument", (data ?? []) as Monument[], locale);
}

export async function getMonumentDetail(id: string, locale: "es" | "en" = "es"): Promise<MonumentDetail | null> {
  const [monumentResult, translationsResult, periodsResult] = await Promise.all([
    supabase.rpc("get_monument_by_id", { p_id: id }),
    supabase.from("monument_translations").select("name, description, locale").eq("monument_id", id),
    supabase.from("monument_periods").select("*").eq("monument_id", id).order("order_index"),
  ]);
  if (monumentResult.error) throw monumentResult.error;
  if (translationsResult.error) throw translationsResult.error;
  if (periodsResult.error) throw periodsResult.error;
  if (!monumentResult.data?.length) return null;

  const raw = monumentResult.data[0] as Monument;
  const translation = translationsResult.data?.find((item) => item.locale === locale);
  return {
    ...raw,
    name: translation?.name ?? raw.name,
    description: translation?.description ?? raw.description,
    periods: (periodsResult.data ?? []) as MonumentPeriod[],
  };
}

export async function getMonument(id: string, locale: "es" | "en" = "es"): Promise<Monument | null> {
  const { data, error } = await supabase
    .from("monuments")
    .select("*, monument_translations(name, description, locale)")
    .eq("id", id)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  if (!data) return null;

  const translations = data.monument_translations;
  const translation = translations?.find((item) => item.locale === locale);
  return {
    ...(data as Monument),
    name: translation?.name ?? data.name,
    description: translation?.description ?? data.description,
  };
}

export async function getCollectionMonuments(collectionId: string, limit = 4, locale: Locale = currentLocale()): Promise<CollectionMonument[]> {
  const { data, error } = await supabase.rpc("get_collection_monuments", {
    p_collection_id: collectionId,
    p_limit: limit,
  });
  if (error) throw error;
  return translateContent("monument", data ?? [], locale);
}

export async function checkMonumentWithin(monumentId: string, lat: number, lng: number, radiusM = 75): Promise<boolean> {
  const { data, error } = await supabase.rpc("monument_within", {
    p_monument_id: monumentId,
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });
  if (error) throw error;
  return data === true;
}
