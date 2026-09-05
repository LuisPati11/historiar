import { supabase } from "../supabaseClient";
import { currentLocale, type Locale } from "../i18n";
import { getContentTranslations } from "./translations";

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
  is_following: boolean;
}

export interface FollowUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function feedForMeRich(limit = 50, locale: Locale = currentLocale()): Promise<FeedEvent[]> {
  const { data, error } = await supabase.rpc("feed_for_me_rich", { p_limit: limit });
  if (error) throw error;
  const events = (data ?? []) as FeedEvent[];
  const [monuments, medals] = await Promise.all([
    getContentTranslations("monument", events.flatMap((event) => event.monument_id ? [event.monument_id] : []), locale),
    getContentTranslations("medal", events.flatMap((event) => event.medal_id ? [event.medal_id] : []), locale),
  ]);
  return events.map((event) => ({
    ...event,
    monument_name: (event.monument_id && monuments.get(event.monument_id)?.name) || event.monument_name,
    medal_name: (event.medal_id && medals.get(event.medal_id)?.name) || event.medal_name,
  }));
}

export async function searchProfiles(query: string): Promise<ProfileResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const { data, error } = await supabase.rpc("search_profiles", { p_query: normalized });
  if (error) throw error;
  return (data ?? []) as ProfileResult[];
}

export async function getFollowers(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!follower_id(id, display_name, avatar_url)")
    .eq("followed_id", userId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => row.profiles ? [row.profiles] : []);
}

export async function getFollowing(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!followed_id(id, display_name, avatar_url)")
    .eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => row.profiles ? [row.profiles] : []);
}

export async function isFollowing(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id)
    .eq("followed_id", userId);
  if (error) throw error;
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
