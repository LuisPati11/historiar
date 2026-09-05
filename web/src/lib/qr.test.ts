import { describe, expect, it } from "vitest";
import { extractArMonumentId } from "./qr";

describe("extractArMonumentId", () => {
  it("extracts a valid monument UUID from an AR URL", () => {
    expect(extractArMonumentId("https://historiar.app/ar/550e8400-e29b-41d4-a716-446655440000"))
      .toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("accepts query parameters after the UUID", () => {
    expect(extractArMonumentId("/ar/550E8400-E29B-41D4-A716-446655440000?source=sign"))
      .toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("accepts the RFC-compliant monument ID used by the seed", () => {
    expect(extractArMonumentId("/ar/11111111-1111-1111-8111-111111111111"))
      .toBe("11111111-1111-1111-8111-111111111111");
  });

  it("rejects malformed UUIDs and unsupported versions", () => {
    expect(extractArMonumentId("/ar/not-a-uuid")).toBeNull();
    expect(extractArMonumentId("/ar/550e8400-e29b-01d4-a716-446655440000")).toBeNull();
  });
});
