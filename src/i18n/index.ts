import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "react-native-localize";

import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import sv from "./locales/sv.json";
import no from "./locales/no.json";
import da from "./locales/da.json";
import nl from "./locales/nl.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import pl from "./locales/pl.json";
import ro from "./locales/ro.json";
import ru from "./locales/ru.json";
import it from "./locales/it.json";

export const LANGUAGES = [
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "es", label: "ES", flag: "🇪🇸" },
] as const;

const supportedLngs = ["es", "en", "fr", "sv", "no", "da", "nl", "de", "ar", "pl", "ro", "ru", "it"];

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const lang = locales[0].languageCode;
      if (supportedLngs.includes(lang)) return lang;
    }
  } catch {}
  return "fr";
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
    sv: { translation: sv },
    no: { translation: no },
    da: { translation: da },
    nl: { translation: nl },
    de: { translation: de },
    ar: { translation: ar },
    pl: { translation: pl },
    ro: { translation: ro },
    ru: { translation: ru },
    it: { translation: it },
  },
  lng: getDeviceLanguage(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
