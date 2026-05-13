export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const INDIAN_LANGUAGES: Language[] = [
  { code: "en", name: "English",   nativeName: "English",   flag: "🇬🇧" },
  { code: "hi", name: "Hindi",     nativeName: "हिंदी",      flag: "🇮🇳" },
  { code: "te", name: "Telugu",    nativeName: "తెలుగు",     flag: "🇮🇳" },
  { code: "ta", name: "Tamil",     nativeName: "தமிழ்",      flag: "🇮🇳" },
  { code: "kn", name: "Kannada",   nativeName: "ಕನ್ನಡ",      flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം",     flag: "🇮🇳" },
  { code: "mr", name: "Marathi",   nativeName: "मराठी",      flag: "🇮🇳" },
  { code: "gu", name: "Gujarati",  nativeName: "ગુજરાતી",    flag: "🇮🇳" },
  { code: "pa", name: "Punjabi",   nativeName: "ਪੰਜਾਬੀ",     flag: "🇮🇳" },
  { code: "bn", name: "Bengali",   nativeName: "বাংলা",      flag: "🇮🇳" },
  { code: "or", name: "Odia",      nativeName: "ଓଡ଼ିଆ",      flag: "🇮🇳" },
  { code: "ur", name: "Urdu",      nativeName: "اردو",       flag: "🇮🇳" },
];
