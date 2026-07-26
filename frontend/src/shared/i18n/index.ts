import i18next, { createInstance, type i18n, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGE_STORAGE_KEY = 'flae_language';
const supportedLanguages = new Set(['en', 'vi']);

function persistedLanguage() {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value && supportedLanguages.has(value) ? value : null;
  } catch {
    return null;
  }
}

function persistLanguage(language: string) {
  if (!supportedLanguages.has(language)) return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language switching remains available when persistence is unavailable.
  }
}

export async function createI18n(resources: Resource, selectedLanguage = persistedLanguage()) {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    lng: selectedLanguage ?? 'vi',
    missingKeyHandler: (_languages, _namespace, key) => key,
    resources,
    returnEmptyString: false,
  });
  instance.on('languageChanged', persistLanguage);
  return instance;
}

async function loadLanguage(language: 'en' | 'vi') {
  const response = await fetch(`/assets/i18n/${language}.json`);
  if (!response.ok) throw new Error(`Unable to load ${language} translations.`);
  return response.json() as Promise<Record<string, unknown>>;
}

let initialization: Promise<i18n> | null = null;

export function initializeI18n() {
  initialization ??= Promise.all([loadLanguage('en'), loadLanguage('vi')]).then(async ([en, vi]) => {
    await i18next.use(initReactI18next).init({
      fallbackLng: 'vi',
      interpolation: { escapeValue: false },
      lng: persistedLanguage() ?? 'vi',
      resources: { en: { translation: en }, vi: { translation: vi } },
      returnEmptyString: false,
    });
    i18next.on('languageChanged', persistLanguage);
    return i18next;
  });
  return initialization;
}

export { i18next };
