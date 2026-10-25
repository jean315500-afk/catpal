// Countries: ISO 3166-1 alpha-2 code -> approximate capital [lon, lat] (for the
// globe and distances), localized names, flags and postmarks.

export const COUNTRY_COORDS: Record<string, [number, number]> = {
  AD: [1.52, 42.51], AE: [54.37, 24.45], AF: [69.18, 34.53], AG: [-61.85, 17.12], AL: [19.82, 41.33], AM: [44.51, 40.18],
  AO: [13.23, -8.84], AR: [-58.38, -34.6], AT: [16.37, 48.21], AU: [149.13, -35.28], AZ: [49.87, 40.41], BA: [18.41, 43.86],
  BB: [-59.6, 13.1], BD: [90.41, 23.81], BE: [4.35, 50.85], BF: [-1.52, 12.37], BG: [23.32, 42.7], BH: [50.59, 26.23],
  BI: [29.36, -3.38], BJ: [2.63, 6.5], BN: [114.94, 4.94], BO: [-68.15, -16.5], BR: [-47.88, -15.79], BS: [-77.35, 25.05],
  BT: [89.64, 27.47], BW: [25.91, -24.65], BY: [27.56, 53.9], BZ: [-88.76, 17.25], CA: [-75.7, 45.42], CD: [15.27, -4.44],
  CF: [18.56, 4.39], CG: [15.24, -4.27], CH: [7.45, 46.95], CI: [-4.03, 5.35], CL: [-70.67, -33.45], CM: [11.5, 3.87],
  CN: [116.4, 39.9], CO: [-74.07, 4.71], CR: [-84.09, 9.93], CU: [-82.37, 23.11], CV: [-23.51, 14.93], CY: [33.38, 35.19],
  CZ: [14.42, 50.08], DE: [13.4, 52.52], DJ: [43.15, 11.59], DK: [12.57, 55.68], DM: [-61.39, 15.3], DO: [-69.93, 18.49],
  DZ: [3.06, 36.75], EC: [-78.47, -0.18], EE: [24.75, 59.44], EG: [31.24, 30.04], ER: [38.93, 15.32], ES: [-3.7, 40.42],
  ET: [38.75, 9.03], FI: [24.94, 60.17], FJ: [178.44, -18.14], FM: [158.16, 6.92], FR: [2.35, 48.86], GA: [9.45, 0.39],
  GB: [-0.13, 51.5], GD: [-61.75, 12.05], GE: [44.79, 41.72], GH: [-0.19, 5.6], GM: [-16.58, 13.45], GN: [-13.68, 9.64],
  GQ: [8.78, 3.75], GR: [23.73, 37.98], GT: [-90.51, 14.63], GW: [-15.6, 11.86], GY: [-58.16, 6.8], HK: [114.17, 22.32],
  HN: [-87.21, 14.07], HR: [15.98, 45.81], HT: [-72.34, 18.54], HU: [19.04, 47.5], ID: [106.85, -6.21], IE: [-6.26, 53.35],
  IL: [35.22, 31.77], IN: [77.21, 28.61], IQ: [44.37, 33.31], IR: [51.39, 35.69], IS: [-21.9, 64.15], IT: [12.5, 41.9],
  JM: [-76.79, 18.02], JO: [35.93, 31.95], JP: [139.69, 35.68], KE: [36.82, -1.29], KG: [74.59, 42.87], KH: [104.92, 11.56],
  KI: [173.02, 1.45], KM: [43.26, -11.7], KN: [-62.72, 17.3], KP: [125.75, 39.03], KR: [126.98, 37.57], KW: [47.98, 29.38],
  KZ: [71.45, 51.17], LA: [102.63, 17.98], LB: [35.5, 33.89], LC: [-60.98, 14.01], LI: [9.52, 47.14], LK: [79.86, 6.93],
  LR: [-10.8, 6.3], LS: [27.48, -29.31], LT: [25.28, 54.69], LU: [6.13, 49.61], LV: [24.11, 56.95], LY: [13.19, 32.89],
  MA: [-6.84, 34.02], MC: [7.42, 43.74], MD: [28.86, 47.01], ME: [19.26, 42.44], MG: [47.52, -18.88], MH: [171.38, 7.09],
  MK: [21.43, 42.0], ML: [-8.0, 12.64], MM: [96.13, 19.76], MN: [106.91, 47.89], MO: [113.54, 22.2], MR: [-15.98, 18.08],
  MT: [14.51, 35.9], MU: [57.5, -20.16], MV: [73.51, 4.18], MW: [33.79, -13.96], MX: [-99.13, 19.43], MY: [101.69, 3.14],
  MZ: [32.59, -25.97], NA: [17.08, -22.56], NE: [2.11, 13.51], NG: [7.49, 9.06], NI: [-86.25, 12.13], NL: [4.9, 52.37],
  NO: [10.75, 59.91], NP: [85.32, 27.72], NR: [166.92, -0.55], NZ: [174.78, -41.29], OM: [58.41, 23.59], PA: [-79.52, 8.98],
  PE: [-77.04, -12.05], PG: [147.18, -9.44], PH: [120.98, 14.6], PK: [73.05, 33.68], PL: [21.01, 52.23], PR: [-66.11, 18.47],
  PS: [35.2, 31.9], PT: [-9.14, 38.72], PW: [134.48, 7.5], PY: [-57.58, -25.26], QA: [51.53, 25.29], RO: [26.1, 44.43],
  RS: [20.46, 44.79], RU: [37.62, 55.76], RW: [30.06, -1.94], SA: [46.68, 24.71], SB: [159.95, -9.43], SC: [55.45, -4.62],
  SD: [32.53, 15.5], SE: [18.07, 59.33], SG: [103.82, 1.35], SI: [14.51, 46.06], SK: [17.11, 48.15], SL: [-13.23, 8.47],
  SM: [12.45, 43.94], SN: [-17.47, 14.72], SO: [45.32, 2.05], SR: [-55.2, 5.85], SS: [31.58, 4.86], ST: [6.73, 0.34],
  SV: [-89.22, 13.69], SY: [36.29, 33.51], SZ: [31.13, -26.31], TD: [15.04, 12.13], TG: [1.23, 6.13], TH: [100.5, 13.75],
  TJ: [68.79, 38.56], TL: [125.57, -8.56], TM: [58.38, 37.95], TN: [10.18, 36.81], TO: [-175.2, -21.14], TR: [32.86, 39.93],
  TT: [-61.52, 10.65], TV: [179.2, -8.52], TW: [121.56, 25.03], TZ: [35.74, -6.16], UA: [30.52, 50.45], UG: [32.58, 0.35],
  US: [-77.04, 38.91], UY: [-56.16, -34.9], UZ: [69.24, 41.3], VA: [12.45, 41.9], VC: [-61.23, 13.16], VE: [-66.9, 10.48],
  VN: [105.83, 21.03], VU: [168.32, -17.73], WS: [-171.75, -13.83], YE: [44.21, 15.37], ZA: [28.19, -25.75], ZM: [28.32, -15.39],
  ZW: [31.05, -17.83],
};

export const COUNTRY_CODES = Object.keys(COUNTRY_COORDS);

/** 🇰🇷 from "KR". */
export const flagOf = (cc: string) =>
  /^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌏';

const nameCache: Record<string, Intl.DisplayNames | null> = {};
/** Localized country name ("KR" -> "South Korea" / "대한민국"). */
export function countryName(cc: string, locale = 'en-US') {
  if (!(locale in nameCache)) {
    try { nameCache[locale] = new Intl.DisplayNames([locale], { type: 'region' }); } catch { nameCache[locale] = null; }
  }
  try { return nameCache[locale]?.of(cc) || cc; } catch { return cc; }
}

/** Country options sorted by localized name. */
export const countryOptions = (locale: string) =>
  COUNTRY_CODES.map((cc) => ({ cc, name: countryName(cc, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
    .map(({ cc, name }) => ({ cc, label: flagOf(cc) + ' ' + name }));

/** Best guess from the browser locale ("ko-KR" -> "KR"), else "". */
/** time zones that name one country: a better guess than the language (a phone in Seoul set to English is still in Korea) */
const TZ_COUNTRY: Record<string, string> = {
  'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Taipei': 'TW', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE', 'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL', 'Europe/Stockholm': 'SE', 'Europe/Istanbul': 'TR',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'Pacific/Honolulu': 'US',
};

export function guessCountry() {
  try { const tz = TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone]; if (tz && COUNTRY_COORDS[tz]) return tz; } catch { /* no Intl: the language below */ }
  for (const l of navigator.languages || [navigator.language]) {
    const m = /-([A-Z]{2})\b/i.exec(l || '');
    if (m && COUNTRY_COORDS[m[1].toUpperCase()]) return m[1].toUpperCase();
  }
  return '';
}

/** Great-circle distance between two countries' capitals, km (null if unknown). */
export function distanceKm(a: string, b: string): number | null {
  const p = COUNTRY_COORDS[a], q = COUNTRY_COORDS[b];
  // the same country: no distance to show (both are placed at its capital — "0 km" would say nothing)
  if (!p || !q || a === b) return null;
  const r = Math.PI / 180, dLat = (q[1] - p[1]) * r, dLon = (q[0] - p[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[1] * r) * Math.cos(q[1] * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}

/** "lon:lat" token understood by public/globe.html. */
export const globePoint = (cc: string) => (COUNTRY_COORDS[cc] ? COUNTRY_COORDS[cc].join(':') : '');

// The design's city postmarks, by country. Other countries get a drawn postmark.
const PM: Record<string, string> = {
  KR: 'seoul', JP: 'tokyo', IT: 'roma', TW: 'taipei', GB: 'london', ID: 'bali', FR: 'paris',
  TH: 'bangkok', AU: 'sydney', US: 'newyork', CA: 'vancouver', SG: 'singapore',
};
export const POSTMARK_FILES = Object.values(PM).map((p) => './assets/pm/' + p + '.png');
/** the countries with a postmark of their own (the stamp book's pages) */
export const POSTMARK_COUNTRIES = Object.keys(PM);
/** each country's own stamp (one of the app's stamp designs): the same country, the same stamp, every time */
const STAMP_OF: Record<string, number> = { KR: 1, JP: 2, FR: 3, US: 4, GB: 5, IT: 6, TW: 7, TH: 8, ID: 2, AU: 5, CA: 6, SG: 3 };
export const stampOf = (cc: string) => './assets/stamp-' + (STAMP_OF[cc] ?? ((((cc || 'XX').charCodeAt(0) * 31 + (cc || 'XX').charCodeAt(1)) % 8) + 1)) + '.png';

const pmCache: Record<string, string> = {};
/** Postmark image URL for a country (blob: URL for generated ones; data: URLs break inline styles). */
export function postmarkOf(cc: string) {
  if (PM[cc]) return './assets/pm/' + PM[cc] + '.png';
  if (pmCache[cc]) return pmCache[cc];
  const code = /^[A-Z]{2}$/.test(cc || '') ? cc : '··';
  const waves = [0, 1, 2, 3].map((i) => `<path d="M132 ${44 + i * 11} q10 -6 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#2b2b2b" stroke-width="2.2"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140" viewBox="0 0 220 140"><g opacity=".85"><circle cx="70" cy="70" r="52" fill="none" stroke="#2b2b2b" stroke-width="3"/><circle cx="70" cy="70" r="40" fill="none" stroke="#2b2b2b" stroke-width="1.6"/><text x="70" y="82" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="34" fill="#2b2b2b">${code}</text><text x="70" y="38" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="10" letter-spacing="2" fill="#2b2b2b">CATPAL</text>${waves}</g></svg>`;
  return (pmCache[cc] = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
}
