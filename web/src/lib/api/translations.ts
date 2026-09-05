import { currentLocale, type Locale } from "../i18n";
import { supabase } from "../supabaseClient";

type ContentType = "monument" | "medal" | "collection";
export interface ContentTranslation {
  id: string;
  name: string;
  description: string | null;
}

export async function getContentTranslations(
  type: ContentType,
  ids: string[],
  locale: Locale = currentLocale(),
): Promise<Map<string, ContentTranslation>> {
  const uniqueIds = [...new Set(ids)];
  const batches = [];
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100);
    const query = type === "monument"
      ? supabase.from("monument_translations").select("id:monument_id, name, description").in("monument_id", batch)
      : type === "medal"
        ? supabase.from("medal_translations").select("id:medal_id, name, description").in("medal_id", batch)
        : supabase.from("collection_translations").select("id:collection_id, name, description").in("collection_id", batch);
    batches.push(Promise.resolve(query.eq("locale", locale)));
  }
  const results = await Promise.all(batches);
  const translations = new Map<string, ContentTranslation>();
  for (const { data, error } of results) {
    if (error) throw error;
    for (const row of data ?? []) translations.set(row.id, row);
  }
  return translations;
}

export async function translateContent<T extends { id: string; name: string; description?: string | null }>(
  type: ContentType,
  items: T[],
  locale: Locale = currentLocale(),
): Promise<T[]> {
  const translations = await getContentTranslations(type, items.map((item) => item.id), locale);
  return items.map((item) => {
    const translation = translations.get(item.id);
    if (!translation) return item;
    return {
      ...item,
      name: translation.name,
      ...("description" in item ? { description: translation.description ?? item.description } : {}),
    };
  });
}
