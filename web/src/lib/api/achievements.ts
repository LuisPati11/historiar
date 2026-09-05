import { supabase } from "../supabaseClient";
import { currentLocale, type Locale } from "../i18n";
import { getContentTranslations, translateContent } from "./translations";

export interface UserMedal {
  medal_id: string;
  earned_at: string;
  medal: { name: string; tier: string; description: string | null; image_url: string | null };
}

export interface EarnedMedal {
  id: string;
  name: string;
  description: string | null;
  tier: string;
  image_url: string | null;
  earned_at: string;
}

export interface CollectionProgress {
  collection_id: string;
  collection_name: string;
  collection_description: string | null;
  medal_id: string;
  medal_name: string;
  medal_tier: string;
  total_monuments: number;
  visited_monuments: number;
  earned_at: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  visit_count: number;
  medal_count: number;
}

export async function getNewlyEarnedMedals(locale: Locale = currentLocale()): Promise<EarnedMedal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_medals")
    .select("earned_at, medals(id, name, description, tier, image_url)")
    .eq("user_id", user.id)
    .gte("earned_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  if (error) throw error;

  const medals = (data ?? []).flatMap((row) => {
    const medal = row.medals;
    return medal ? [{ ...medal, earned_at: row.earned_at }] : [];
  });
  return translateContent("medal", medals, locale);
}

async function translateMedals(items: UserMedal[], locale: Locale): Promise<UserMedal[]> {
  const translations = await getContentTranslations("medal", items.map((item) => item.medal_id), locale);
  return items.map((item) => {
    const translation = translations.get(item.medal_id);
    return translation ? {
      ...item,
      medal: { ...item.medal, name: translation.name, description: translation.description ?? item.medal.description },
    } : item;
  });
}

export async function getUserMedals(locale: Locale = currentLocale()): Promise<UserMedal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_medals")
    .select("medal_id, earned_at, medals(name, tier, description, image_url)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });
  if (error) throw error;

  return translateMedals((data ?? []).flatMap((row) => row.medals ? [{
    medal_id: row.medal_id,
    earned_at: row.earned_at,
    medal: row.medals,
  }] : []), locale);
}

export async function getPublicUserMedals(userId: string, locale: Locale = currentLocale()): Promise<UserMedal[]> {
  const { data, error } = await supabase
    .from("user_medals")
    .select("medal_id, earned_at, medal:medals(name, description, tier, image_url)")
    .eq("user_id", userId);
  if (error) throw error;
  return translateMedals(data ?? [], locale);
}

export async function getCollectionsProgress(locale: Locale = currentLocale()): Promise<CollectionProgress[]> {
  const { data, error } = await supabase.rpc("get_collections_progress");
  if (error) throw error;
  const items = (data ?? []) as CollectionProgress[];
  const [collections, medals] = await Promise.all([
    getContentTranslations("collection", items.map((item) => item.collection_id), locale),
    getContentTranslations("medal", items.map((item) => item.medal_id), locale),
  ]);
  return items.map((item) => ({
    ...item,
    collection_name: collections.get(item.collection_id)?.name ?? item.collection_name,
    collection_description: collections.get(item.collection_id)?.description ?? item.collection_description,
    medal_name: medals.get(item.medal_id)?.name ?? item.medal_name,
  }));
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function getMyRank(): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_my_rank");
  if (error) throw error;
  return data == null ? null : Number(data);
}
