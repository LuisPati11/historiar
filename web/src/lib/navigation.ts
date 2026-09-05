export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "https://historiar.invalid");
    if (parsed.origin !== "https://historiar.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
