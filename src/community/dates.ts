// Dates, one way everywhere: a day is "2026. 10. 25." (Korean) / "Oct 25, 2026" (English), the year always in full;
// in lists, the last 24 hours read as "방금 / 5분 전 / 2시간 전" ("just now / 5 min. ago / 2 hours ago"), then the day.
// Stored times stay as they are (UTC ISO strings); they're shown in the viewer's own time zone. `lang` is the app's
// language id ("ko", "en", …) and `loc` its locale ("ko-KR", "en-US", …), so a language change changes them too.

const DAY = 86400e3;

/** a day: "2026. 10. 25." / "Oct 25, 2026" (other languages: their own medium form, with the full year) */
export function fmtDate(iso: string | number | Date | null | undefined, lang: string, loc = lang): string {
  if (iso == null || iso === '') return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  if (lang === 'ko') return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  if (lang === 'en') return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

/** in a list: how long ago, within the last 24 hours; before that, the day */
export function fmtListTime(iso: string | number | Date | null | undefined, lang: string, loc = lang): string {
  if (iso == null || iso === '') return '';
  const t = new Date(iso).getTime(); if (isNaN(t)) return '';
  const ago = Date.now() - t;
  if (ago >= DAY || ago < -60e3) return fmtDate(t, lang, loc);
  const s = Math.max(0, ago) / 1000;
  if (s < 60) return lang === 'ko' ? '방금' : lang === 'en' ? 'just now' : new Intl.RelativeTimeFormat(loc, { numeric: 'auto' }).format(0, 'second');
  const f = new Intl.RelativeTimeFormat(lang === 'ko' ? 'ko-KR' : lang === 'en' ? 'en-US' : loc, { numeric: 'always' });
  return s < 3600 ? f.format(-Math.max(1, Math.round(s / 60)), 'minute') : f.format(-Math.round(s / 3600), 'hour');
}
