import { describe, expect, it } from "vitest";
import { centuryLabel, formatDistance } from "./format";

describe("formatDistance", () => {
  it("rounds distances below one kilometre", () => {
    expect(formatDistance(74.6)).toBe("75 m");
  });

  it("formats kilometres with one decimal", () => {
    expect(formatDistance(1549)).toBe("1.5 km");
  });
});

describe("centuryLabel", () => {
  it("uses Roman numerals in Spanish", () => {
    expect(centuryLabel(1328, "es")).toBe("s. XIV");
  });

  it("uses ordinal centuries in English", () => {
    expect(centuryLabel(2001, "en-GB")).toBe("21st c.");
  });
});
