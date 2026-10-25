// The language, the same on the landing page and in the app: the one picked (kept on this device) comes first; before
// anything is picked, the browser's own — Korean for a Korean browser, English otherwise (the two the landing speaks).

export const LANG_KEY = 'cp-lang';

/** the language picked here before, if any */
export function savedLang(): string | null {
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
}

/** the browser's first language: "ko" or "en" */
export function browserLang(): 'ko' | 'en' {
  try {
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^ko\b/i.test(first) ? 'ko' : 'en';
  } catch { return 'en'; }
}

/** what to show: the one picked (when it's one of `supported`), else the browser's */
export function initialLang(supported: readonly string[] = ['en', 'ko']): string {
  const s = savedLang();
  return s && supported.includes(s) ? s : browserLang();
}

/** a language picked: kept for next time (both pages), and set on the page */
export function saveLang(id: string) {
  try { localStorage.setItem(LANG_KEY, id); } catch { /* private mode: for this visit only */ }
  try { document.documentElement.lang = id; } catch { /* no document */ }
}
