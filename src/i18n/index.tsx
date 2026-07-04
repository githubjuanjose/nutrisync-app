import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import es from './es.json';

/**
 * Lightweight i18n for the app. Strings come from the shared EN/ES catalogs
 * (the `app` section of the web i18n pack), so wording stays 1:1 with the web.
 *
 * Usage:
 *   const t = useT();
 *   <Text>{t('navLabels.home', 'Today')}</Text>   // path lookup, EN fallback
 *
 * Canonical values written to Supabase stay English — this is display-only,
 * so CAS/analytics parity with the backend is untouched.
 */
export type Lang = 'en' | 'es';
const BUNDLES: Record<Lang, any> = { en, es };
const KEY = 'ns_locale'; // same key name/shape the web uses ({ lang })

function lookup(obj: any, path: string): string | undefined {
  return path.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), obj);
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (path: string, fallback?: string) => string };
const I18nContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (p, f) => f ?? p });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (!v) return;
      try { const p = JSON.parse(v); if (p?.lang === 'es' || p?.lang === 'en') setLangState(p.lang); }
      catch { if (v === 'es' || v === 'en') setLangState(v as Lang); }
    }).catch(() => {});
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, JSON.stringify({ lang: l })).catch(() => {});
  };

  const t = (path: string, fallback?: string) =>
    lookup(BUNDLES[lang], path) ?? lookup(BUNDLES.en, path) ?? fallback ?? path;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
