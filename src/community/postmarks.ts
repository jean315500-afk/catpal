// CatPal's country postmarks: one SVG template, after the New York postmark — a round ink stamp with wavy cancel
// lines on its left, the country's name curved along the top, one small national symbol in the middle, two little
// stars, and "CATPAL" along the bottom. The cat is the stamp itself: two ears on its ring. Only the name and the
// symbol change from country to country; the ring, line weight, ink texture, type and proportions never do. Each
// country is stamped in its own symbolic colour (PM_INK).
//
// Countries with a symbol of their own: PM_DESIGNED. Every other country gets the shared version (a globe), with its
// own name — so any country has a postmark. Names are kept short (USA, UK…) so they can be read small.

/** each country's ink: its own symbolic colour — dark enough to read its name small. Everyone else: postmark ink. */
export const PM_INK: Record<string, string> = {
  KR: '#0047A0',   // 태극 파랑 (the Taegeuk's blue)
  JP: '#BC002D',   // 히노마루 빨강 (the Hinomaru's red)
  TH: '#A87A06',   // 왕실 노랑 (the royal yellow), deepened to read
  US: '#2E7F6F',   // 자유의 여신상 청록 (Liberty's verdigris)
  FR: '#2F7FD0',   // 블뢰 드 프랑스 (bleu de France), deepened to read
};
const INK_OTHER = '#4A4440';

const W = 240, H = 160, CX = 150, CY = 84, R = 62, RING = 4.6;

/** short names, for the ones whose full English name is long (read at a glance, small) */
const SHORT: Record<string, string> = {
  US: 'USA', GB: 'UK', KR: 'KOREA', AE: 'UAE', CZ: 'CZECHIA', NZ: 'NEW ZEALAND', ZA: 'S. AFRICA', SA: 'SAUDI ARABIA',
  DO: 'DOMINICAN REP.', CD: 'DR CONGO', CF: 'C. AFRICA', BA: 'BOSNIA', TT: 'TRINIDAD', KP: 'N. KOREA', TW: 'TAIWAN',
  RU: 'RUSSIA', VN: 'VIETNAM', LA: 'LAOS', IR: 'IRAN', SY: 'SYRIA', BO: 'BOLIVIA', VE: 'VENEZUELA', TZ: 'TANZANIA',
};

// The symbols: drawn in a box about 64 tall, centred on (0, 0) — filled ink, with "paper" (white) cut-outs.
const PAPER = '#FFFFFF';
// (drawn in currentColor: the country's ink, set on the postmark)
const SYMBOL: Record<string, string> = {
  // N Seoul Tower on Namsan
  KR: `<path d="M0 -40 V-27" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="-9" y="-27" width="18" height="10" rx="3"/>
    <rect x="-6.5" y="-16" width="13" height="3.2" rx="1.2"/>
    <path d="M-3.4 -12.5 L-5.2 20 H5.2 L3.4 -12.5 Z"/>
    <path d="M-1 -24 H1" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-31 30 Q-12 10 0 13 Q12 10 31 30 Z"/>`,
  // Mount Fuji and the rising sun
  JP: `<circle cx="17" cy="-22" r="9"/>
    <path d="M-32 28 L-9 -11 H9 L32 28 Z"/>
    <path d="M-9 -11 H9 L14 -2.5 L8.5 0.5 L4 -4.5 L-1 1 L-5.5 -4 L-10 -0.5 L-14 -2.5 Z" fill="${PAPER}"/>`,
  // a temple's chedi
  TH: `<path d="M-1.6 -26 L0 -42 L1.6 -26 Z"/>
    <rect x="-3.6" y="-27" width="7.2" height="4.5" rx="1"/>
    <rect x="-5.6" y="-22.8" width="11.2" height="4.5" rx="1"/>
    <rect x="-7.6" y="-18.6" width="15.2" height="4.5" rx="1"/>
    <path d="M-13 6 C-13 -8 -7 -14 0 -14 C7 -14 13 -8 13 6 Z"/>
    <rect x="-17" y="5" width="34" height="6" rx="1"/>
    <rect x="-22" y="11" width="44" height="6" rx="1"/>
    <rect x="-27" y="17" width="54" height="9" rx="1.2"/>
    <path d="M-4.2 26 V20.5 Q0 16.5 4.2 20.5 V26 Z" fill="${PAPER}"/>`,
  // the Statue of Liberty
  US: `<path d="M11.4 -41.5 Q15.2 -36.4 11.4 -33.2 Q7.6 -36.4 11.4 -41.5 Z"/>
    <rect x="9.4" y="-33" width="4" height="4.4" rx="1"/>
    <path d="M6.2 -6 L11.4 -28.6" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>
    <circle cx="0" cy="-12.5" r="4.4"/>
    <path d="M0 -19.5 V-24 M-4.2 -18.2 L-7.2 -21.6 M4.2 -18.2 L7.2 -21.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M-8 -5 Q0 -8.5 8 -5 L10.5 19 H-10.5 Z"/>
    <rect x="-14.6" y="-3" width="6.4" height="11" rx="1" transform="rotate(-10 -11.4 2.5)"/>
    <path d="M-3.5 0 L-2 16 M3.4 -1 L4.6 16" stroke="${PAPER}" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="-13" y="19" width="26" height="5.5" rx="1"/>
    <rect x="-17" y="24.5" width="34" height="6" rx="1"/>`,
  // the Eiffel Tower
  FR: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path d="M0 -42 V-34" stroke-width="2.2"/>
      <path d="M-1.6 -34 C-3 -14 -9 8 -20 30 M1.6 -34 C3 -14 9 8 20 30" stroke-width="3.4"/>
      <path d="M-11 30 Q0 13 11 30" stroke-width="3"/>
      <path d="M-6.6 -6 H6.6" stroke-width="3.4"/>
      <path d="M-10.6 11 H10.6" stroke-width="3.8"/>
      <path d="M-3.2 -22 L3.6 -6 M3.2 -22 L-3.6 -6 M-6 -6 L6.2 11 M6 -6 L-6.2 11" stroke-width="1.5"/>
    </g>`,
};
/** the shared version: a globe */
const GLOBE = `<g fill="none" stroke="currentColor" stroke-width="3.2">
    <circle cx="0" cy="-4" r="24"/>
    <ellipse cx="0" cy="-4" rx="10" ry="24"/>
    <path d="M-24 -4 H24 M-20.5 -16.5 Q0 -12.5 20.5 -16.5 M-20.5 8.5 Q0 4.5 20.5 8.5" stroke-width="2.4"/>
  </g>
  <path d="M-16 28 H16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`;

/** the countries with a symbol of their own */
export const PM_DESIGNED = Object.keys(SYMBOL);

const star = (x: number, y: number, r: number) => {
  const p = [...Array(10)].map((_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r * 0.45 : r; return (x + k * Math.cos(a)).toFixed(2) + ' ' + (y + k * Math.sin(a)).toFixed(2); });
  return `<path d="M${p.join(' L')} Z"/>`;
};
const pt = (deg: number, r: number) => { const a = (deg * Math.PI) / 180; return (CX + r * Math.cos(a)).toFixed(2) + ' ' + (CY + r * Math.sin(a)).toFixed(2); };
/** an ear on the ring: its base on the ring from a-w to a+w degrees, its tip out at R + h */
const ear = (a: number, w: number, h: number, lean: number) => `<path d="M${pt(a - w, R)} L${pt(a + lean, R + h)} L${pt(a + w, R)}"/>`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** what's written on a country's postmark */
export const postmarkName = (cc: string, englishName: string) => (SHORT[cc] || englishName || cc || '').toUpperCase();

/** A country's postmark, as SVG text (240 × 160). `name`: what's written on it (postmarkName). */
export function postmarkSvg(cc: string, name: string): string {
  const label = esc(name.trim() || '· · ·');
  // the name, as big as it can be along the top (big enough to read small; long names a bit smaller)
  const fs = Math.max(11, Math.min(20, 100 / (label.length * 0.78)));
  const rt = R - RING / 2 - 4.5 - fs * 0.72;          // its baseline: its capitals just under the ring
  const rb = R - RING / 2 - 4;                          // "CATPAL": its baseline just inside the ring at the bottom (its letters rise inward)
  // the cancel lines: four waves, from the left edge into the ring
  const waves = [-21, -7, 7, 21].map((dy) => {
    const end = CX - Math.sqrt(R * R - dy * dy) + 1.5, y = CY + dy;
    let d = `M6 ${y}`, x = 6, up = true;
    while (x + 14 <= end) { d += ` q7 ${up ? -8 : 8} 14 0`; x += 14; up = !up; }
    return `<path d="${d} L${end.toFixed(1)} ${y}"/>`;
  }).join('');
  const font = `font-family="'Arial Rounded MT Bold','Avenir Next','Helvetica Neue',Arial,sans-serif" font-weight="800"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" color="${PM_INK[cc] || INK_OTHER}">
<defs>
  <filter id="ink" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -6 4.6" result="holes"/>
    <feComposite in="SourceGraphic" in2="holes" operator="in" result="speckled"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="wobble"/>
    <feDisplacementMap in="speckled" in2="wobble" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <path id="top" d="M${CX - rt} ${CY} A${rt} ${rt} 0 0 1 ${CX + rt} ${CY}"/>
  <path id="bottom" d="M${CX - rb} ${CY} A${rb} ${rb} 0 0 0 ${CX + rb} ${CY}"/>
</defs>
<g filter="url(#ink)" opacity="0.92">
  <g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round">${waves}</g>
  <g fill="none" stroke="currentColor" stroke-width="${RING}" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="${PAPER}" fill-opacity="0"/>
    ${ear(-127, 10, 19, -5)}${ear(-53, 10, 19, 5)}
  </g>
  <text ${font} font-size="${fs.toFixed(1)}" letter-spacing="${(fs * 0.06).toFixed(2)}" fill="currentColor" text-anchor="middle"><textPath href="#top" startOffset="50%">${label}</textPath></text>
  <text ${font} font-size="8.6" letter-spacing="2.4" fill="currentColor" text-anchor="middle"><textPath href="#bottom" startOffset="50%">CATPAL</textPath></text>
  <g fill="currentColor">${star(CX - 43, CY + 12, 5.2)}${star(CX + 42, CY - 2, 5.2)}${star(CX + 44, CY + 18, 4.2)}</g>
  <g transform="translate(${CX} ${CY + 5}) scale(0.94)" fill="currentColor">${SYMBOL[cc] || GLOBE}</g>
</g>
</svg>`;
}
