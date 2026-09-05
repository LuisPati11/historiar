import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContentTranslations, translateContent } from "./translations";

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), in: vi.fn(), eq: vi.fn() }));
vi.mock("../supabaseClient", () => ({ supabase: mocks }));
vi.mock("../i18n", () => ({ currentLocale: () => "en" }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.select.mockReturnValue(mocks);
  mocks.in.mockReturnValue(mocks);
  mocks.eq.mockResolvedValue({ data: [], error: null });
});

describe("content translations", () => {
  it("does not query for an empty list", async () => {
    expect(await translateContent("monument", [])).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([
    ["monument", "monument_translations", "monument_id"],
    ["medal", "medal_translations", "medal_id"],
    ["collection", "collection_translations", "collection_id"],
  ] as const)("queries %s translations only for the requested IDs and language", async (type, table, column) => {
    await getContentTranslations(type, ["one", "one", "two"], "es");
    expect(mocks.from).toHaveBeenCalledWith(table);
    expect(mocks.in).toHaveBeenCalledWith(column, ["one", "two"]);
    expect(mocks.eq).toHaveBeenCalledWith("locale", "es");
  });

  it("keeps progress and original descriptions when translations are missing", async () => {
    mocks.eq.mockResolvedValue({ data: [{ id: "one", name: "Toledo Gate", description: null }], error: null });
    const items = [
      { id: "one", name: "Puerta de Toledo", description: "Original", distance_m: 42 },
      { id: "two", name: "Sin traducción", description: null, distance_m: 80 },
    ];
    const result = await translateContent("monument", items);
    expect(result[0]).toEqual({ ...items[0], name: "Toledo Gate" });
    expect(result[1]).toEqual(items[1]);
    expect(items[0].name).toBe("Puerta de Toledo");
  });

  it("batches large ID sets to avoid oversized request URLs", async () => {
    await getContentTranslations("medal", Array.from({ length: 205 }, (_, index) => String(index)));
    expect(mocks.in.mock.calls.map((call) => call[1].length)).toEqual([100, 100, 5]);
  });

  it("surfaces failed translation requests instead of showing empty content", async () => {
    const error = new Error("Offline");
    mocks.eq.mockResolvedValue({ data: null, error });
    await expect(translateContent("collection", [{ id: "one", name: "Original" }])).rejects.toBe(error);
  });
});
