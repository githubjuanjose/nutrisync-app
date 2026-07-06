import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import nl from './nl.json';
import el from './el.json';
import ca from './ca.json';
import eu from './eu.json';
import gl from './gl.json';

/**
 * Lightweight i18n for the app. Strings come from the shared catalogs (the `app`
 * section of the web i18n pack), so wording stays 1:1 with the web.
 *
 * 12 languages are supported. Only the catalogs that are actually bundled below
 * carry translations; every other language falls back to English until its
 * catalog lands (Design is producing the MT-first-pass files). Adding a language
 * later = drop its `xx.json` into this folder, import it, and add it to BUNDLES.
 *
 * Canonical values written to Supabase stay English — display-only, so CAS /
 * analytics parity with the backend is untouched.
 */
export type Lang =
  | 'en' | 'es' | 'fr' | 'it' | 'de' | 'nl' | 'el'
  | 'ca' | 'eu' | 'gl' | 'va' | 'oc-aran'
  | 'zh' | 'ja';

/** Registry: code → endonym (own-language name). Order here is the canonical list. */
export const LANGS: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'ca', name: 'Català' },
  { code: 'eu', name: 'Euskara' },
  { code: 'gl', name: 'Galego' },
  { code: 'va', name: 'Valencià' },
  { code: 'oc-aran', name: 'Aranés' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
];
export const LANG_NAME = (c: Lang) => LANGS.find((l) => l.code === c)?.name ?? c;
const SUPPORTED = LANGS.map((l) => l.code);

// Only these have real catalogs today; the rest resolve to English via fallback.
// (mob.* mobile-only keys fall back to English until translated per language.)
const BUNDLES: Partial<Record<Lang, any>> = { en, es, fr, de, it, nl, el, ca, eu, gl };
// The selector only offers languages that actually have a bundle — grows as packs land.
const AVAILABLE = LANGS.filter((l) => BUNDLES[l.code]);
const KEY = 'ns_locale'; // same key name/shape the web uses ({ lang })

function lookup(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  return path.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), obj);
}

/** Detect the device language, mapped to our supported set (defensive — never throws). */
function detectOSLang(): Lang {
  try {
    // expo-localization is bundled in Expo Go; require defensively for OTA safety.
    const Loc = require('expo-localization');
    const list = typeof Loc.getLocales === 'function' ? Loc.getLocales() : [];
    const code = String(list?.[0]?.languageCode || '').toLowerCase();
    // only auto-select a language we can actually render (has a bundle)
    if (BUNDLES[code as Lang]) return code as Lang;
  } catch {}
  return 'en';
}

type Ctx = {
  lang: Lang;
  osLang: Lang;
  setLang: (l: Lang) => void;
  langs: { code: Lang; name: string }[];
  t: (path: string, fallback?: string) => string;
};
const I18nContext = createContext<Ctx>({
  lang: 'en', osLang: 'en', setLang: () => {}, langs: LANGS, t: (p, f) => f ?? p,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [osLang] = useState<Lang>(detectOSLang);
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v) {
        try {
          const p = JSON.parse(v);
          if (p?.lang && (SUPPORTED as string[]).includes(p.lang)) { setLangState(p.lang); return; }
        } catch {
          if ((SUPPORTED as string[]).includes(v)) { setLangState(v as Lang); return; }
        }
      }
      // No stored choice → default to the OS language (falls back to English).
      setLangState(detectOSLang());
    }).catch(() => setLangState(detectOSLang()));
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, JSON.stringify({ lang: l })).catch(() => {});
  };

  const t = (path: string, fallback?: string) =>
    lookup(BUNDLES[lang], path) ?? lookup(BUNDLES.en, path) ?? fallback ?? path;

  return (
    <I18nContext.Provider value={{ lang, osLang, setLang, langs: AVAILABLE, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
