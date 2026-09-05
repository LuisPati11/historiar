const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ATTEMPT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VisitVerificationAttempt {
  attempt_id: string;
  expires_at: string;
}

export interface SuccessfulVisitVerification {
  verified_geo: true;
  verified_image: true;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isVisitVerificationAttempt(value: unknown): value is VisitVerificationAttempt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return typeof result.attempt_id === "string" && ATTEMPT_UUID_PATTERN.test(result.attempt_id)
    && typeof result.expires_at === "string"
    && Number.isFinite(Date.parse(result.expires_at));
}

export function isSuccessfulVisitVerification(value: unknown): value is SuccessfulVisitVerification {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return result.verified_geo === true && result.verified_image === true;
}
