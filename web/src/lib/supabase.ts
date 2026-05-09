import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env");
}

export const supabase = createClient(url, anonKey);

export interface Monument {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  description: string | null;
  reference_image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  lat?: number;
  lng?: number;
}

export async function getNearbyMonuments(lat: number, lng: number, radiusM = 1000) {
  const { data, error } = await supabase.rpc("monuments_nearby", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_only_unvisited: false,
  });
  if (error) throw error;
  return data as Array<Monument & { distance_m: number }>;
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

export async function getMonumentDetail(id: string, locale: "es" | "en" = "es"): Promise<MonumentDetail | null> {
  const [{ data: rows, error: e1 }, { data: translations }, { data: periods }] = await Promise.all([
    supabase.rpc("get_monument_by_id", { p_id: id }),
    supabase.from("monument_translations").select("name, description, locale").eq("monument_id", id),
    supabase.from("monument_periods").select("*").eq("monument_id", id).order("order_index"),
  ]);
  if (e1 || !rows || rows.length === 0) return null;
  const raw = rows[0] as Monument;
  const t = (translations ?? []).find((x: { locale: string }) => x.locale === locale);
  return {
    ...raw,
    name: (t as { name: string } | undefined)?.name ?? raw.name,
    description: (t as { description: string | null } | undefined)?.description ?? raw.description,
    periods: (periods ?? []) as MonumentPeriod[],
  };
}

export async function getMonument(id: string, locale: "es" | "en" = "es"): Promise<Monument | null> {
  const { data, error } = await supabase
    .from("monuments")
    .select("*, monument_translations(name, description, locale)")
    .eq("id", id)
    .single();
  if (error || !data) return null;

  const translations = (data as { monument_translations?: Array<{ locale: string; name: string; description: string | null }> })
    .monument_translations;
  const t = translations?.find((x) => x.locale === locale);
  return {
    ...(data as Monument),
    name: t?.name ?? (data as Monument).name,
    description: t?.description ?? (data as Monument).description,
  };
}

export async function feedForMe(limit = 50) {
  const { data, error } = await supabase.rpc("feed_for_me", { p_limit: limit });
  if (error) throw error;
  return data as Array<{
    id: string;
    user_id: string;
    user_name: string;
    type: "visit" | "medal_earned" | "collection_completed";
    monument_id: string | null;
    medal_id: string | null;
    created_at: string;
  }>;
}

export interface UserMedal {
  medal_id: string;
  earned_at: string;
  medal: { name: string; tier: string; points_reward: number; description: string | null };
}

export interface EarnedMedal {
  id: string;
  name: string;
  description: string | null;
  tier: string;
  points_reward: number;
}

export async function getNewlyEarnedMedals(monumentId: string): Promise<EarnedMedal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("user_medals")
    .select("medals(id, name, description, tier, points_reward), medal_requirements!inner(monument_id)")
    .eq("user_id", user.id)
    .eq("medal_requirements.monument_id", monumentId)
    .gte("earned_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  if (error || !data) return [];
  return data
    .map((r: Record<string, unknown>) => r.medals as EarnedMedal)
    .filter(Boolean);
}

export async function getUserMedals(): Promise<UserMedal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("user_medals")
    .select("medal_id, earned_at, medals(name, tier, points_reward, description)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    medal_id: r.medal_id as string,
    earned_at: r.earned_at as string,
    medal: r.medals as UserMedal["medal"],
  }));
}

export async function getUserVisitCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}

export interface FeedEvent {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  type: "visit" | "medal_earned" | "collection_completed";
  monument_id: string | null;
  monument_name: string | null;
  medal_id: string | null;
  medal_name: string | null;
  created_at: string;
}

export interface ProfileResult {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  is_following: boolean;
}

export async function feedForMeRich(limit = 50): Promise<FeedEvent[]> {
  const { data, error } = await supabase.rpc("feed_for_me_rich", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as FeedEvent[];
}

export async function searchProfiles(query: string): Promise<ProfileResult[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc("search_profiles", { p_query: query.trim() });
  if (error) throw error;
  return (data ?? []) as ProfileResult[];
}

export async function syncProfile(username: string, avatarId: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({
    display_name: username,
    avatar_url: avatarId ?? undefined,
  }).eq("id", user.id);
}

export interface FollowUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function getFollowers(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!follower_id(id, display_name, avatar_url)")
    .eq("followed_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => (r as unknown as { profiles: FollowUser }).profiles);
}

export async function getFollowing(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!followed_id(id, display_name, avatar_url)")
    .eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => (r as unknown as { profiles: FollowUser }).profiles);
}

export async function getPublicProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, total_points, is_public")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as { id: string; display_name: string | null; avatar_url: string | null; bio: string | null; total_points: number; is_public: boolean };
}

export async function getPublicUserMedals(userId: string): Promise<UserMedal[]> {
  const { data, error } = await supabase
    .from("user_medals")
    .select("medal_id, earned_at, medal:medals(name, description, tier, points_reward)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as unknown as UserMedal[];
}

export async function getPublicUserVisitCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function isFollowing(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id)
    .eq("followed_id", userId);
  return (count ?? 0) > 0;
}

export async function followUser(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("follows").insert({ follower_id: user.id, followed_id: userId });
  if (error) throw error;
}

export async function unfollowUser(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("follows").delete().match({ follower_id: user.id, followed_id: userId });
  if (error) throw error;
}

export interface CollectionProgress {
  collection_id: string;
  collection_name: string;
  collection_description: string | null;
  medal_id: string;
  medal_name: string;
  medal_tier: string;
  points_reward: number;
  total_monuments: number;
  visited_monuments: number;
  earned_at: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  visit_count: number;
  medal_count: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function getMyRank(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  const myPoints = (data as { total_points: number }).total_points;
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_public", true)
    .gt("total_points", myPoints);
  return (count ?? 0) + 1;
}

export async function getAllMonuments(): Promise<Monument[]> {
  const { data, error } = await supabase.rpc("monuments_all");
  if (error) throw error;
  return (data ?? []) as Monument[];
}

export async function getCollectionsProgress(): Promise<CollectionProgress[]> {
  const { data, error } = await supabase.rpc("get_collections_progress");
  if (error) throw error;
  return (data ?? []) as CollectionProgress[];
}

export async function checkMonumentWithin(monumentId: string, lat: number, lng: number, radiusM = 500): Promise<boolean> {
  const { data, error } = await supabase.rpc("monument_within", {
    p_monument_id: monumentId,
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });
  if (error) throw error;
  return data as boolean;
}

export async function validateVisit(monumentId: string, lat: number, lng: number, imageTracked: boolean) {
  // En modo invitado (sin sesión) no tiene sentido llamar a la edge function:
  // la función exige Authorization y la visita no se va a guardar de todas formas.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { verified_geo: false, verified_image: false, skipped: true };

  const { data, error } = await supabase.functions.invoke("validate-visit", {
    body: { monument_id: monumentId, lat, lng, image_tracked: imageTracked },
  });
  if (error) throw error;
  return data as { verified_geo: boolean; verified_image: boolean };
}
