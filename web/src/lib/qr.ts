const AR_PATH_PATTERN = /\/ar\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i;

export function extractArMonumentId(value: string): string | null {
  return value.match(AR_PATH_PATTERN)?.[1].toLowerCase() ?? null;
}
