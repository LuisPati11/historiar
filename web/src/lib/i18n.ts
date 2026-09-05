import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import es from "./locales/es.json";
import en from "./locales/en.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng.split("-")[0] || "es";
});

i18n.on("initialized", () => {
  document.documentElement.lang = i18n.resolvedLanguage?.split("-")[0] || "es";
});
document.documentElement.lang = i18n.resolvedLanguage?.split("-")[0] || "es";

export default i18n;

export type Locale = "es" | "en";

export function normalizeLocale(locale: unknown): Locale {
  return typeof locale === "string" && locale.toLowerCase().split(/[-_]/)[0] === "en" ? "en" : "es";
}

export function currentLocale(): Locale {
  return normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
}
