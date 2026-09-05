export const RADIUS_METERS = 75;
export const MAX_BODY_BYTES = 2_048;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VerificationAttempt = {
  attempt_id: string;
  attempt_expires_at: string;
};

export type StartPayload = {
  action: "start";
  monument_id: string;
  lat: number;
  lng: number;
};

export type CompletePayload = {
  action: "complete";
  attempt_id: string;
  monument_id: string;
  lat: number;
  lng: number;
  image_tracked: true;
};

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: string[]) {
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length &&
    expectedKeys.every((key) => key in value);
}

function hasValidCoordinates(
  value: unknown,
): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return typeof lat === "number" && Number.isFinite(lat) && lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && lng >= -180 &&
    lng <= 180;
}

export function isVerificationAttempt(
  value: unknown,
): value is VerificationAttempt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const attempt = value as Record<string, unknown>;
  return typeof attempt.attempt_id === "string" &&
    UUID_PATTERN.test(attempt.attempt_id) &&
    typeof attempt.attempt_expires_at === "string" &&
    Number.isFinite(Date.parse(attempt.attempt_expires_at));
}

export function isStartPayload(value: unknown): value is StartPayload {
  if (!hasValidCoordinates(value)) return false;
  const payload = value as Record<string, unknown>;
  return hasOnlyKeys(payload, ["action", "monument_id", "lat", "lng"]) &&
    payload.action === "start" &&
    typeof payload.monument_id === "string" &&
    UUID_PATTERN.test(payload.monument_id);
}

export function isCompletePayload(value: unknown): value is CompletePayload {
  if (!hasValidCoordinates(value)) return false;
  const payload = value as Record<string, unknown>;
  return hasOnlyKeys(payload, [
    "action",
    "attempt_id",
    "monument_id",
    "lat",
    "lng",
    "image_tracked",
  ]) &&
    payload.action === "complete" &&
    payload.image_tracked === true &&
    typeof payload.attempt_id === "string" &&
    UUID_PATTERN.test(payload.attempt_id) &&
    typeof payload.monument_id === "string" &&
    UUID_PATTERN.test(payload.monument_id);
}
