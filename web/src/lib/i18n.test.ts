// @vitest-environment jsdom
import { createInstance } from "i18next";
import { expect, it } from "vitest";
import es from "./locales/es.json";
import en from "./locales/en.json";
import { normalizeLocale } from "./i18n";

function strings(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof item === "string" ? [[path, item]] : Object.entries(strings(item, path));
  }));
}

it("provides matching UI keys and interpolation parameters in both languages", () => {
  const spanish = strings(es);
  const english = strings(en);
  expect(Object.keys(english).sort()).toEqual(Object.keys(spanish).sort());
  for (const key of Object.keys(spanish)) {
    const parameters = (text: string) => [...text.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort();
    expect(parameters(english[key]), key).toEqual(parameters(spanish[key]));
  }
});

it("uses singular and plural monument counts", async () => {
  const instance = createInstance();
  await instance.init({ resources: { es: { translation: es }, en: { translation: en } }, lng: "es" });
  expect(instance.t("home.nearby_count", { count: 1 })).toBe("1 monumento cerca");
  expect(instance.t("home.nearby_count", { count: 2 })).toBe("2 monumentos cerca");
  await instance.changeLanguage("en");
  expect(instance.t("home.nearby_count", { count: 1 })).toBe("1 monument nearby");
});

it("normalizes supported regional locales and safely handles untrusted metadata", () => {
  for (const locale of ["en", "en-GB", "EN_us"]) expect(normalizeLocale(locale)).toBe("en");
  for (const locale of [undefined, null, 42, {}, "english", "es-ES"]) expect(normalizeLocale(locale)).toBe("es");
});
