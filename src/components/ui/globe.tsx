// Globe — the Magic UI-style dotted globe (cobe), without Tailwind.
//   import { Globe } from "@/components/ui/globe"
// On its own it turns slowly and can be dragged. Pass `control` to drive phi / theta (and any other
// cobe option, e.g. arcs) from outside — every frame reads it — and `onFrame` to pin DOM things to
// places with `cobeProject`, the same projection cobe uses internally (cobe v2).
import { useEffect, useRef, type CSSProperties } from 'react';
import createGlobe, { type COBEOptions } from 'cobe';

export const GLOBE_CONFIG: COBEOptions = {
  width: 800, height: 800, devicePixelRatio: 2,
  phi: 0, theta: 0.3, dark: 0, diffuse: 0.4, mapSamples: 16000, mapBrightness: 1.2,
  baseColor: [1, 1, 1], markerColor: [251 / 255, 100 / 255, 21 / 255], glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 }, { location: [19.076, 72.8777], size: 0.1 }, { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 }, { location: [39.9042, 116.4074], size: 0.08 }, { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 }, { location: [40.7128, -74.006], size: 0.1 }, { location: [34.6937, 135.5022], size: 0.05 }, { location: [41.0082, 28.9784], size: 0.06 },
  ],
};

export type GlobeControl = { phi: number; theta: number } & Partial<COBEOptions>;

/** cobe's own geometry: the globe's radius in clip space and the default marker lift */
const R = 0.8, LIFT = 0.05;
/** a place as a unit vector, in cobe's axes */
export const toXYZ = (lat: number, lon: number): [number, number, number] => {
  const r = (lat * Math.PI) / 180, a = (lon * Math.PI) / 180 - Math.PI, o = Math.cos(r);
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)];
};
/** Screen position (0–1 of the canvas box) of a 3D point for a rotation; depth > 0 = facing us. */
export function cobeProjectXYZ(t: [number, number, number], phi: number, theta: number) {
  const ct = Math.cos(theta), cp = Math.cos(phi), st = Math.sin(theta), sp = Math.sin(phi);
  const c = cp * t[0] + sp * t[2], s = sp * st * t[0] + ct * t[1] - cp * st * t[2];
  const depth = -sp * ct * t[0] + st * t[1] + cp * ct * t[2];
  return { x: (c + 1) / 2, y: (-s + 1) / 2, depth };
}
/** A place on the globe (lifted like cobe's markers), projected for phi / theta. */
export const cobeProject = (lat: number, lon: number, phi: number, theta: number, lift = LIFT) => {
  const v = toXYZ(lat, lon), k = R + lift;
  const p = cobeProjectXYZ([v[0] * k, v[1] * k, v[2] * k], phi, theta);
  return { ...p, depth: p.depth / k };
};
/** A point on cobe's arc between two places (quadratic Bézier lifted by `height`), t in 0–1. */
export const cobeArcPoint = (from: [number, number], to: [number, number], t: number, phi: number, theta: number, height = 0.2, lift = LIFT) => {
  const a = toXYZ(from[0], from[1]), b = toXYZ(to[0], to[1]), m = [a[0] + b[0], a[1] + b[1], a[2] + b[2]], ml = Math.hypot(m[0], m[1], m[2]) || 1;
  const r0 = R + lift, rc = R + height + lift, u = 1 - t;
  const P = [0, 1, 2].map((i) => u * u * a[i] * r0 + 2 * u * t * (m[i] / ml) * rc + t * t * b[i] * r0) as [number, number, number];
  return cobeProjectXYZ(P, phi, theta);
};
/** phi / theta that bring a place to the middle of the globe. */
export const cobeFocus = (lat: number, lon: number) => ({ phi: (((1.5 * Math.PI - (lon * Math.PI) / 180) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), theta: (lat * Math.PI) / 180 });

export function Globe({ className, style, config = GLOBE_CONFIG, control, onFrame }: {
  className?: string; style?: CSSProperties; config?: COBEOptions;
  control?: React.MutableRefObject<GlobeControl>; onFrame?: (size: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), frame = useRef(onFrame); frame.current = onFrame;
  useEffect(() => {
    const el = canvas.current!;
    let width = el.offsetWidth, phi = config.phi, raf = 0;
    let drag: { x: number; phi: number } | null = null, spin = 0;
    // cobe sizes the canvas as width × devicePixelRatio, so width is in CSS px
    const dpr = config.devicePixelRatio || Math.min(2, window.devicePixelRatio || 1);
    const globe = createGlobe(el, { ...config, devicePixelRatio: dpr, width, height: width, onRender: undefined } as COBEOptions);
    // markers / arcs are uploaded to the GPU, so they are only passed on when the array changes
    let markers = config.markers, arcs = config.arcs;
    const down = (e: PointerEvent) => { if (!control) { drag = { x: e.clientX, phi }; el.style.cursor = 'grabbing'; } };
    const up = () => { drag = null; el.style.cursor = control ? 'default' : 'grab'; };
    const move = (e: PointerEvent) => { if (drag) spin = (e.clientX - drag.x) / 200; };
    const resize = () => { width = el.offsetWidth; };
    el.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointermove', move); addEventListener('resize', resize);
    const tick = () => {
      if (control) {
        const { markers: m, arcs: a, ...c } = control.current;
        globe.update({ ...c, width, height: width, ...(m && m !== markers ? { markers: (markers = m) } : {}), ...(a && a !== arcs ? { arcs: (arcs = a) } : {}) });
      } else {
        if (!drag) phi += 0.005;
        globe.update({ phi: phi + (drag ? spin : 0), width, height: width });
        if (!drag && spin) { phi += spin; spin = 0; }
      }
      frame.current?.(width);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    return () => { cancelAnimationFrame(raf); globe.destroy(); el.removeEventListener('pointerdown', down); removeEventListener('pointerup', up); removeEventListener('pointermove', move); removeEventListener('resize', resize); };
  }, [config, control]);
  return (
    <div className={className} style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', ...style }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%', opacity: 0, transition: 'opacity .5s ease', contain: 'layout paint size', cursor: control ? 'default' : 'grab' }} />
    </div>
  );
}
