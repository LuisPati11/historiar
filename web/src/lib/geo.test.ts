import { describe, expect, it } from "vitest";
import { haversineMeters, walkingMinutes } from "./geo";

describe("haversineMeters", () => {
  it("returns zero for the same coordinate", () => {
    expect(haversineMeters(38.9863, -3.9286, 38.9863, -3.9286)).toBe(0);
  });

  it("is symmetric", () => {
    const outbound = haversineMeters(38.9863, -3.9286, 40.4168, -3.7038);
    const inbound = haversineMeters(40.4168, -3.7038, 38.9863, -3.9286);
    expect(outbound).toBeCloseTo(inbound, 6);
  });
});

describe("walkingMinutes", () => {
  it("never returns less than one minute", () => {
    expect(walkingMinutes(0)).toBe(1);
  });
});
