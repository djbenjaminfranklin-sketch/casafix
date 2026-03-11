import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import sv from "./locales/sv.json";
import no from "./locales/no.json";
import da from "./locales/da.json";
import nl from "./locales/nl.json";
import de from "./locales/de.json";

export const LANGUAGES = [
  { code: "es", label: "ES", flag: "🇪🇸" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "sv", label: "SV", flag: "🇸🇪" },
  { code: "no", label: "NO", flag: "🇳🇴" },
  { code: "da", label: "DA", flag: "🇩🇰" },
  { code: "nl", label: "NL", flag: "🇳🇱" },
  { code: "de", label: "DE", flag: "🇩🇪" },
] as const;

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
  },
  lng: "es",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
