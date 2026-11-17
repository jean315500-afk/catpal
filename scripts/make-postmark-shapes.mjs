// Makes src/community/pmShapes.ts: each country's outline (from world-atlas), as one SVG path drawn about 60 across,
// centred on (0, 0) — the symbol in the middle of its postmark (src/community/postmarks.ts). Run: node scripts/make-postmark-shapes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoAzimuthalEqualArea, geoCentroid, geoPath, geoArea } from 'd3-geo';

const src = readFileSync(new URL('../src/community/countries.ts', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('COUNTRY_COORDS'), src.indexOf('};', src.indexOf('COUNTRY_COORDS')));
const coords = Object.fromEntries([...block.matchAll(/\b([A-Z]{2}): \[(-?[\d.]+), (-?[\d.]+)\]/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
const codes = Object.keys(coords);
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z]/g, '');
// world-atlas's names that aren't the usual English one
const ALIAS = {
  BA: 'Bosnia and Herz.', CD: 'Dem. Rep. Congo', CF: 'Central African Rep.', CG: 'Congo', CI: "Côte d'Ivoire", CZ: 'Czechia',
  DO: 'Dominican Rep.', GQ: 'Eq. Guinea', KP: 'North Korea', KR: 'South Korea', LA: 'Laos', MK: 'Macedonia', SS: 'S. Sudan',
  SZ: 'eSwatini', TL: 'Timor-Leste', SB: 'Solomon Is.', MH: 'Marshall Is.', VC: 'St. Vin. and Gren.', KN: 'St. Kitts and Nevis',
  AG: 'Antigua and Barb.', ST: 'São Tomé and Principe', PS: 'Palestine', MM: 'Myanmar', FM: 'Micronesia', VA: 'Vatican',
  TW: 'Taiwan', HK: 'Hong Kong', MO: 'Macao', CV: 'Cabo Verde', VN: 'Vietnam', RU: 'Russia', SY: 'Syria', IR: 'Iran',
  BO: 'Bolivia', VE: 'Venezuela', TZ: 'Tanzania', MD: 'Moldova', BN: 'Brunei', LC: 'Saint Lucia', US: 'United States of America',
  GB: 'United Kingdom', TR: 'Turkey', FK: 'Falkland Is.', EH: 'W. Sahara', XK: 'Kosovo',
};
const load = (f) => { const t = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/' + f, import.meta.url), 'utf8')); return feature(t, t.objects.countries).features; };
const coarse = load('countries-110m.json'), fifty = load('countries-50m.json'), ten = load('countries-10m.json');
const find = (fs, cc) => {
  const want = [ALIAS[cc], names.of(cc)].filter(Boolean).map(norm);
  return fs.find((f) => want.includes(norm(f.properties.name)));
};
const out = {}, missing = [];
for (const cc of codes) {
  // (the coarse map first — plenty at this size; small countries it hasn't, from the finer ones)
  const pts = (g) => JSON.stringify(g?.geometry?.coordinates || []).split('],[').length;
  let f = [find(coarse, cc), find(fifty, cc), find(ten, cc)].filter(Boolean).find((g) => pts(g) >= 40) || find(ten, cc) || find(fifty, cc) || find(coarse, cc);
  if (!f) { missing.push(cc); continue; }
  // islands too small to see at this size dropped (but never all of it)
  if (f.geometry.type === 'MultiPolygon') {
    const polys = f.geometry.coordinates.map((c) => ({ c, a: geoArea({ type: 'Polygon', coordinates: c }) })).sort((a, b) => b.a - a.a);
    const keep = polys.filter((p, i) => i === 0 || p.a > polys[0].a * 0.012).slice(0, 14);
    f = { ...f, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.c) } };
  }
  // spread-out islands: fitted to all of them the biggest would be a speck — the smaller far ones dropped until it isn't
  const BOX = [[-35, -31], [35, 31]];
  const fit = (g) => { const [lon, lat] = geoCentroid(g); return geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent(BOX, g); };
  // (archipelagos whose islands are the country, kept whole)
  for (const share of [0.2, 1]) {
    if (f.geometry.type !== 'MultiPolygon' || f.geometry.coordinates.length < 2 || ['ID', 'PH', 'JP', 'NZ', 'GR', 'MY', 'FJ', 'BS'].includes(cc)) break;
    const big = { type: 'Polygon', coordinates: f.geometry.coordinates[0] };
    const [[x0, y0], [x1, y1]] = geoPath(fit(f)).bounds(big);
    if (Math.max(x1 - x0, y1 - y0) >= 36) break;
    const a0 = geoArea(big);
    f = { ...f, geometry: { type: 'MultiPolygon', coordinates: f.geometry.coordinates.filter((c, i) => i === 0 || geoArea({ type: 'Polygon', coordinates: c }) >= a0 * share) } };
  }
  const proj = fit(f);
  let d = geoPath(proj).digits(1)(f) || '';
  // (a little simpler: points closer than about a unit to the last one kept are dropped)
  d = d.replace(/M[^MZ]*Z?/g, (ring) => {
    const pts = [...ring.matchAll(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g)].map((m) => m[0].split(',').map(Number));
    const kept = [];
    for (const p of pts) { const q = kept[kept.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 1.3) kept.push(p); }
    if (kept.length < 3) return '';
    return 'M' + kept.map((p) => p.join(',')).join('L') + 'Z';
  });
  // (and where its capital is on it: a little mark)
  const cap = proj(coords[cc]) || [0, 0];
  // (too small to show — a few atolls, a city: the shared globe instead)
  const [[bx0, by0], [bx1, by1]] = geoPath(proj).bounds(f);
  const biggest = Math.max(0, ...d.split('M').filter(Boolean).map((r) => { const v = [...r.matchAll(/-?[\d.]+/g)].map(Number), xs = v.filter((_, i) => i % 2 === 0), ys = v.filter((_, i) => i % 2); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); }));
  if (!d || Math.max(bx1 - bx0, by1 - by0) < 12 || biggest < 8) { missing.push(cc + '(tiny)'); continue; }
  out[cc] = [d, Math.round(cap[0] * 10) / 10, Math.round(cap[1] * 10) / 10];
}
const body = Object.entries(out).map(([k, [d, x, y]]) => `  ${k}: ['${d}', ${x}, ${y}],`).join('\n');
writeFileSync(new URL('../src/community/pmShapes.ts', import.meta.url),
  `// Made by scripts/make-postmark-shapes.mjs from world-atlas (Natural Earth): each country's outline, about 60 across,\n// centred on (0, 0) — the symbol on its postmark — and where its capital is on it. Don't edit by hand.\nexport const PM_SHAPE: Record<string, [string, number, number]> = {\n${body}\n};\n`);
console.log('shapes', Object.keys(out).length, 'of', codes.length, 'missing', missing.join(' '));
