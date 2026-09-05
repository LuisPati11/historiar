import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./navigation";

describe("safeInternalPath", () => {
  it("keeps internal paths", () => {
    expect(safeInternalPath("/profile?tab=medals#top")).toBe("/profile?tab=medals#top");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/");
    expect(safeInternalPath("//evil.example/path")).toBe("/");
  });

  it("uses the requested fallback for invalid values", () => {
    expect(safeInternalPath(undefined, "/feed")).toBe("/feed");
  });
});
