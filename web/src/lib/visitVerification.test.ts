import { describe, expect, it } from "vitest";
import {
  isSuccessfulVisitVerification,
  isUuid,
  isVisitVerificationAttempt,
} from "./visitVerification";

const ID = "550e8400-e29b-41d4-a716-446655440000";

describe("visit verification responses", () => {
  it("accepts PostgreSQL UUIDs including existing monument identifiers", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid(`${ID}<script>`)).toBe(false);
    expect(isUuid("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUuid("550e8400-e29b-01d4-a716-446655440000")).toBe(true);
    expect(isUuid("11111111-1111-1111-1111-11111111111Z")).toBe(false);
  });

  it("accepts a well-formed attempt", () => {
    expect(isVisitVerificationAttempt({
      attempt_id: ID,
      expires_at: "2026-09-04T10:00:00Z",
      verified_geo: true,
    })).toBe(true);
  });

  it("rejects malformed attempts", () => {
    expect(isVisitVerificationAttempt({ attempt_id: "11111111-1111-1111-1111-111111111111", expires_at: "2026-09-04T10:00:00Z" })).toBe(false);
    expect(isVisitVerificationAttempt({ attempt_id: "bad", expires_at: "2026-09-04T10:00:00Z" })).toBe(false);
    expect(isVisitVerificationAttempt({ attempt_id: ID, expires_at: "later" })).toBe(false);
    expect(isVisitVerificationAttempt(null)).toBe(false);
  });

  it("requires both successful verification flags", () => {
    expect(isSuccessfulVisitVerification({ verified_geo: true, verified_image: true })).toBe(true);
    expect(isSuccessfulVisitVerification({ verified_geo: true, verified_image: false })).toBe(false);
    expect(isSuccessfulVisitVerification({ verified_geo: "true", verified_image: true })).toBe(false);
  });
});
