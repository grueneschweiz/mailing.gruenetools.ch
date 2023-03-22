import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";

export const defaultNS = "all";
export const resources = {
  en: {
    [defaultNS]: en,
  },
  de: {
    [defaultNS]: de,
  },
  fr: {
    [defaultNS]: fr,
  },
} as const;

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    ns: [defaultNS],
    defaultNS,
    detection: {
      lookupQuerystring: "lang"
    }
  });

export default i18n;
