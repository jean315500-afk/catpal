// The onboarding's globe, in the look of @/components/ui/wireframe-dotted-globe: a black ocean with a white
// rim, a faint graticule, white land outlines and grey halftone dots on the land. Unlike that component it
// doesn't spin or drag on its own — `control` holds the turn (cobe's phi / theta, read every frame) and the
// markers — and its land comes from world-atlas in the bundle (no fetch). The d3 orthographic projection is
// set to match cobe's (cobeProjectXYZ) exactly, so the page's labels, pulses, friends and trail sit on it.
import { useEffect, useRef, type MutableRefObject } from 'react';
import { geoEquirectangular, geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import { cobeProjectXYZ, toXYZ } from '@/components/ui/globe';

type Vec = [number, number, number];
type Marker = { location: [number, number]; size: number; color?: [number, number, number] };
/** `view` draws the sphere at a given centre and radius in the canvas box (CSS px) instead of filling it as cobe
 *  would — so it can grow far past its box (a horizon) and stay crisp, its lines staying hairlines */
export type GlobeView = { x: number; y: number; r: number };
export type DottedControl = { phi: number; theta: number; markers?: Marker[]; view?: GlobeView };

/** the sphere's radius in the canvas box (cobe's), and the look (wireframe-dotted-globe's colours) */
const R = 0.8;
const OCEAN = '#000000', LINE = '#ffffff', DOT = '#999999', PEACH = '#F2906C';
/** the halftone grid on the land: the same spacing as the component (16 × 0.08°) */
const STEP = 16 * 0.08;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = landTopo as any, LAND = feature(topo, topo.objects.land) as never;
const GRATICULE = geoGraticule()();
let dots: Vec[] | null = null;
/** the land's halftone dots, made once: a lat / lon grid, kept where there is land (read off a small map of it) */
function makeDots(): Vec[] {
  const MW = 720, MH = 360, map = document.createElement('canvas'); map.width = MW; map.height = MH;
  const mc = map.getContext('2d')!;
  mc.beginPath(); geoPath(geoEquirectangular().scale(MW / (2 * Math.PI)).translate([MW / 2, MH / 2]), mc)(LAND); mc.fill();
  const px = mc.getImageData(0, 0, MW, MH).data, out: Vec[] = [];
  for (let lat = -89; lat <= 89; lat += STEP) {
    for (let lon = -180; lon < 180; lon += STEP) {
      const i = (Math.min(MH - 1, Math.floor(((90 - lat) / 180) * MH)) * MW + Math.min(MW - 1, Math.floor(((lon + 180) / 360) * MW))) * 4 + 3;
      if (px[i] > 127) out.push(toXYZ(lat, lon).map((v) => v * R) as Vec);
    }
  }
  return out;
}
const markerXYZ = new WeakMap<Marker, Vec>();
const rgb = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;

export default function DottedGlobe({ control, onFrame }: { control: MutableRefObject<DottedControl>; onFrame?: (size: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), frame = useRef(onFrame); frame.current = onFrame;
  useEffect(() => {
    const el = canvas.current!, ctx = el.getContext('2d')!;
    dots ??= makeDots();
    const box = el.parentElement!;
    let bw = 0, bh = 0, dpr = 1, raf = 0, last = '';
    const resize = () => {
      // at the screen's own resolution (the box is scaled on screen with the stage), a little finer
      bw = box.offsetWidth; bh = box.offsetHeight;
      const onScreen = bw ? box.getBoundingClientRect().width / bw : 1;
      dpr = Math.max(1, (window.devicePixelRatio || 1) * onScreen * 1.25);
      dpr = Math.min(dpr, Math.sqrt(9e6 / Math.max(1, bw * bh)));   // keep the canvas a sane size
      el.width = Math.round(bw * dpr); el.height = Math.round(bh * dpr); last = '';
    };
    const draw = () => {
      if (box.offsetWidth !== bw || box.offsetHeight !== bh) resize();
      const { phi, theta, markers, view } = control.current;
      const cx = view?.x ?? bw / 2, cy = view?.y ?? bh / 2, r = view?.r ?? (R * bw) / 2;
      const key = `${phi.toFixed(5)}|${theta.toFixed(5)}|${markers?.length ?? 0}|${bw}x${bh}|${cx.toFixed(2)},${cy.toFixed(2)},${r.toFixed(2)}`;
      if (key !== last) {
        last = key;
        // cobe's unit box for this sphere (its radius is R of the half-box), and the line weight: the component's sizes are
        // for a 240 px radius; a bigger sphere keeps them (hairlines on a huge horizon)
        const S = r / (R / 2), ox = cx - S / 2, oy = cy - S / 2, k = Math.min(r, 240) / 240;
        // cobe's turn as d3's: the view's centre is at lon 270° − phi, lat theta
        const proj = geoOrthographic().scale(r).translate([cx, cy]).clipAngle(90).rotate([-((1.5 * Math.PI - phi) * 180) / Math.PI, -(theta * 180) / Math.PI]);
        const path = geoPath(proj, ctx), P = (v: Vec) => cobeProjectXYZ(v, phi, theta);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, bw, bh);
        // the ocean
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = OCEAN; ctx.fill();
        // the graticule, faint
        ctx.beginPath(); path(GRATICULE); ctx.strokeStyle = LINE; ctx.lineWidth = 1 * k; ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;
        // the land's outline
        ctx.beginPath(); path(LAND); ctx.strokeStyle = LINE; ctx.lineWidth = 1 * k; ctx.stroke();
        // halftone dots on the land (near side only)
        ctx.beginPath();
        const dr = 1.2 * k;
        for (const v of dots!) {
          const p = P(v); if (p.depth <= 0) continue;
          const x = ox + p.x * S, y = oy + p.y * S;
          if (x < -dr || y < -dr || x > bw + dr || y > bh + dr) continue;   // off the canvas (a big horizon)
          ctx.moveTo(x + dr, y); ctx.arc(x, y, dr, 0, Math.PI * 2);
        }
        ctx.fillStyle = DOT; ctx.fill();
        // markers: the route's ends in peach, the trail's dots, friends' places
        for (const m of markers ?? []) {
          let v = markerXYZ.get(m);
          if (!v) { v = toXYZ(m.location[0], m.location[1]).map((x) => x * (R + 0.01)) as Vec; markerXYZ.set(m, v); }
          const p = P(v); if (p.depth <= 0.02) continue;
          const mr = Math.max(1.6, m.size * Math.min(r, 240) * 0.5);
          ctx.beginPath(); ctx.arc(ox + p.x * S, oy + p.y * S, mr, 0, Math.PI * 2);
          ctx.fillStyle = m.color ? rgb(m.color) : PEACH; ctx.fill();
          if (mr > 6) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
        }
        // the rim
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = LINE; ctx.lineWidth = 2 * k; ctx.stroke();
      }
      frame.current?.(bw);
      raf = requestAnimationFrame(draw);
    };
    resize(); addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, [control]);
  return <canvas ref={canvas} style={{ display: 'block', width: '100%', height: '100%' }} />;
}
