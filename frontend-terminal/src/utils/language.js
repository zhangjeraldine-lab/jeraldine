export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export const LANGUAGE_NAMES = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(({ code, name }) => [code, name]),
);

export const SPEECH_LANG = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
};

export const RTL_LANGS = new Set(['ar']);

export const normalizeLang = (lang, fallback = 'en') =>
  (lang || fallback).split('-')[0].toLowerCase();

export const getLanguageName = (lang, fallback = 'en') =>
  LANGUAGE_NAMES[normalizeLang(lang, fallback)] || LANGUAGE_NAMES[normalizeLang(fallback)] || LANGUAGE_NAMES.en;

export const getSpeechLang = (lang, fallback = 'en') =>
  SPEECH_LANG[normalizeLang(lang, fallback)] || SPEECH_LANG[normalizeLang(fallback)] || SPEECH_LANG.en;

export const isRTL = (lang) => RTL_LANGS.has(normalizeLang(lang));

export const isChinese = (lang) => normalizeLang(lang) === 'zh';

export const displayPair = (zh, en, lang) => {
  if (isChinese(lang)) return zh || en || '';
  return en || zh || '';
};
