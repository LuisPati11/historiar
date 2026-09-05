import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey || url.includes("YOUR-PROJECT") || anonKey === "eyJ...") {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env");
}

const parsedUrl = new URL(url);
const isLocalSupabase = parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";

if (parsedUrl.protocol !== "https:" && !(isLocalSupabase && parsedUrl.protocol === "http:")) {
  throw new Error("VITE_SUPABASE_URL debe usar HTTPS fuera del entorno local");
}

export const supabase = createClient<Database>(url, anonKey);

export function publicStorageUrl(bucket: string, objectPath: string): string {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${parsedUrl.origin}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
