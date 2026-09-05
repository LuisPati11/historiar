import type { Locale } from "../i18n";
import { supabase } from "../supabaseClient";

export interface ProfileSettings {
  locale: Locale;
  is_public: boolean;
}

export interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
}

export async function syncProfile(username: string, avatarId: string | null, locale?: Locale) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const updates: { display_name: string; avatar_url?: string; locale?: Locale } = {
    display_name: username,
    avatar_url: avatarId ?? undefined,
  };
  if (locale) updates.locale = locale;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) throw error;
}

export async function getMyProfileSettings(): Promise<ProfileSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("locale, is_public")
    .eq("id", user.id)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  if (!data) return null;
  return data as ProfileSettings;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, is_public")
    .eq("id", userId)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  if (!data) return null;
  return data;
}

export async function updatePreferredLocale(locale: Locale) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) throw error;
}

export async function updateProfileVisibility(isPublic: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("profiles").update({ is_public: isPublic }).eq("id", user.id);
  if (error) throw error;
}

export async function getUserVisitCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (error) throw error;
  return count ?? 0;
}

export async function getPublicUserVisitCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("verified_visit_count")
    .eq("id", userId)
    .single();
  if (error?.code === "PGRST116") return 0;
  if (error) throw error;
  if (!data) return 0;
  return Number(data.verified_visit_count ?? 0);
}
