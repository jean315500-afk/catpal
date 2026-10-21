// The 3D Cat Map globe's textures, made once from the land in world-atlas (no image files): equirectangular maps
// for a soft, matte, pastel earth in Home's coloured-pencil look — a powder-blue sea, paler in the shallows by the
// coasts, creamy shores, soft sage-green land (deserts a little sandy, snow at the poles), all with a fine pencil
// grain — plus a height map (the land raised a little, bumpy), a roughness map (all matte) and where the land is.
import { geoEquirectangular, geoPath } from 'd3-geo';

export type GlobeMaps = { color: HTMLCanvasElement; height: HTMLCanvasElement; rough: HTMLCanvasElement; land: Uint8ClampedArray; W: number; H: number };

let cached: GlobeMaps | null = null;

/** a cheap smooth noise (value noise on a grid, bilinear, a few octaves) */
function makeNoise(seed: number) {
  const N = 256, g = new Float32Array(N * N);
  let s = seed;
  for (let i = 0; i < g.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; g[i] = s / 4294967296; }
  const at = (x: number, y: number) => g[((y & (N - 1)) * N) + (x & (N - 1))];
  const one = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  return (x: number, y: number) => one(x, y) * 0.55 + one(x * 2.1 + 17, y * 2.1 + 5) * 0.3 + one(x * 4.3 + 3, y * 4.3 + 29) * 0.15;
}

/** the land as a mask at w × h, blurred by drawing it small and scaling it up (works everywhere, unlike ctx.filter) */
function landMask(land: any, w: number, h: number, small?: number) {
  const draw = (cw: number, ch: number) => {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, cw, ch); x.fillStyle = '#fff';
    x.beginPath(); geoPath(geoEquirectangular().scale(cw / (2 * Math.PI)).translate([cw / 2, ch / 2]), x)(land); x.fill();
    return c;
  };
  const src = draw(small || w, small ? Math.round(small / 2) : h);
  if (!small) return src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const big = document.createElement('canvas'); big.width = w; big.height = h;
  const b = big.getContext('2d')!; b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high'; b.drawImage(src, 0, 0, w, h);
  return b.getImageData(0, 0, w, h).data;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** a per-pixel random in 0..1 (for the pencil grain) */
const hash = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/** rough desert areas (lon/lat boxes), for an ochre tint */
const DESERTS: [number, number, number, number][] = [[-15, 14, 35, 32], [35, 15, 60, 32], [118, -32, 140, -18], [90, 38, 112, 46], [52, 25, 70, 38], [-118, 28, -105, 36], [-72, -28, -66, -18], [12, -28, 22, -18]];

export function globeMaps(land: any): GlobeMaps {
  if (cached) return cached;
  const W = 2048, H = 1024;
  const sharp = landMask(land, W, H);                  // where the land is
  const near = landMask(land, W, H, 256);              // blurred wide: the shallows around the coasts
  const shore = landMask(land, W, H, 640);             // blurred a little: the sandy rim
  const nGrass = makeNoise(7), nSea = makeNoise(31), nBump = makeNoise(97);
  const color = document.createElement('canvas'), height = document.createElement('canvas'), rough = document.createElement('canvas');
  for (const c of [color, height, rough]) { c.width = W; c.height = H; }
  const ci = color.getContext('2d')!.createImageData(W, H), hi = height.getContext('2d')!.createImageData(W, H), ri = rough.getContext('2d')!.createImageData(W, H);
  const landBits = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y + 0.5) * (180 / H), alat = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x + 0.5) * (360 / W) - 180, p = (y * W + x) * 4;
      const isLand = sharp[p] > 127, sh = shore[p] / 255, nr = near[p] / 255;
      let r: number, g: number, b: number, hgt: number, rgh: number;
      if (!isLand) {
        // the sea: deep blue, lighter and greener near the land, with a soft ripple
        const t = sstep(0.01, 0.42, nr), rip = (nSea(x / 22, y / 22) - 0.5) * 0.12;
        r = mix(118, 182, t) + rip * 24; g = mix(176, 224, t) + rip * 26; b = mix(228, 238, t) + rip * 18;
        const foam = sstep(0.35, 0.55, sh) * 0.85;                                            // the sand reaching into the water
        r = mix(r, 246, foam); g = mix(g, 234, foam); b = mix(b, 200, foam);
        hgt = 0; rgh = 0.86;
      } else {
        landBits[y * W + x] = 1;
        // grass: brighter in the middle latitudes, lusher in the tropics, a little variation; snow near the poles
        const n = nGrass(x / 26, y / 26), lush = sstep(30, 0, alat);
        r = mix(178, 150, lush) + (n - 0.5) * 22; g = mix(220, 206, lush) + (n - 0.5) * 20; b = mix(136, 118, lush) + (n - 0.5) * 14;
        let desert = 0;
        for (const [a0, b0, a1, b1] of DESERTS) if (lon > a0 - 6 && lon < a1 + 6 && lat > b0 - 5 && lat < b1 + 5) {
          desert = Math.max(desert, Math.min(sstep(a0 - 6, a0, lon), sstep(a1 + 6, a1, lon), sstep(b0 - 5, b0, lat), sstep(b1 + 5, b1, lat)));
        }
        desert *= 0.75 + n * 0.25;
        r = mix(r, 230, desert * 0.7); g = mix(g, 208, desert * 0.7); b = mix(b, 160, desert * 0.7);
        const snow = sstep(64, 74, alat) + (lat < -58 ? 1 : 0);
        r = mix(r, 240, clamp01(snow)); g = mix(g, 246, clamp01(snow)); b = mix(b, 250, clamp01(snow));
        // the sandy rim, just inside the coast
        const sand = sstep(0.96, 0.62, sh) * (1 - clamp01(snow));
        r = mix(r, 246, sand); g = mix(g, 234, sand); b = mix(b, 200, sand);
        hgt = 0.55 + nBump(x / 14, y / 14) * 0.35 - sand * 0.25; rgh = 0.96;
      }
      // a coloured-pencil grain: fine speckle and a faint diagonal stroke, as on Home's sky
      const grain = (hash(x, y) - 0.5) * 16 + Math.sin((x + y * 1.3) * 0.9) * 3 * (0.6 + nGrass(x / 9, y / 9) * 0.8);
      ci.data[p] = r + grain; ci.data[p + 1] = g + grain; ci.data[p + 2] = b + grain * 0.8; ci.data[p + 3] = 255;
      const hv = hgt * 255; hi.data[p] = hv; hi.data[p + 1] = hv; hi.data[p + 2] = hv; hi.data[p + 3] = 255;
      const rv = rgh * 255; ri.data[p] = rv; ri.data[p + 1] = rv; ri.data[p + 2] = rv; ri.data[p + 3] = 255;
    }
  }
  color.getContext('2d')!.putImageData(ci, 0, 0); height.getContext('2d')!.putImageData(hi, 0, 0); rough.getContext('2d')!.putImageData(ri, 0, 0);
  return (cached = { color, height, rough, land: landBits, W, H });
}

const cloudCache: Record<number, HTMLCanvasElement> = {};
/** a veil of soft clouds to wrap around the globe (equirectangular, seamless east–west): white clouds, each a clump
 *  of fuzzy round puffs (bigger in the middle, smaller round the edge), their edges melting into mist, a little
 *  broken up by noise so they stay soft; clear sky between them, fewer towards the poles. `count` clouds of about
 *  `size`° across; `seed` makes each veil different */
export function cloudVeil(seed: number, count: number, size: number): HTMLCanvasElement {
  if (cloudCache[seed]) return cloudCache[seed];
  const W = 1024, H = 512, px = W / 360;
  let r = seed >>> 0;
  const R = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  /** a fuzzy puff at lon/lat, `rad`° across, round on the globe (wider on the map nearer the poles), drawn wrapped */
  const puff = (lon: number, lat: number, rad: number, a: number) => {
    const cx = ((lon + 180) / 360) * W, cy = ((90 - lat) / 180) * H, ry = rad * px, rx = ry / Math.max(0.35, Math.cos((lat * Math.PI) / 180));
    for (const dx of [-W, 0, W]) {
      if (cx + dx + rx < 0 || cx + dx - rx > W) continue;
      x.save(); x.translate(cx + dx, cy); x.scale(rx / ry, 1);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, ry);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.45, `rgba(255,255,255,${a * 0.75})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, ry, 0, Math.PI * 2); x.fill(); x.restore();
    }
  };
  for (let i = 0; i < count; i++) {
    const lon = R() * 360 - 180, lat = (R() * 2 - 1) * 58, S = size * (0.7 + R() * 0.6), n = 5 + Math.floor(R() * 5), stretch = 1.3 + R() * 0.6;
    puff(lon, lat, S * 0.55, 0.75);                                                   // the heart of the cloud
    for (let j = 0; j < n; j++) {                                                     // its puffs, round it, along it a little more
      const a = R() * Math.PI * 2, d = S * (0.25 + R() * 0.45);
      puff(lon + (Math.cos(a) * d * stretch) / Math.max(0.35, Math.cos((lat * Math.PI) / 180)), lat + Math.sin(a) * d * 0.7, S * (0.28 + R() * 0.3), 0.6 + R() * 0.3);
    }
  }
  // a little broken up by noise (thinner here and there), so it stays soft and misty rather than solid
  const n = makeNoise(seed + 5), img = x.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const t = xx / W, v = n(xx / 22, y / 22) * (1 - t) + n((xx - W) / 22, y / 22) * t, p = (y * W + xx) * 4;
    d[p + 3] = Math.min(255, d[p + 3] * (0.7 + v * 0.6));
  }
  x.putImageData(img, 0, 0);
  return (cloudCache[seed] = c);
}
