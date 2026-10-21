// The landing story's globe: the app's own earth (earthScene: the Map's pastel land and sea, real clouds, haze, the
// glow at its edge), in place of the black dotted one. It takes the same `control` as DottedGlobe — cobe's turn
// (phi / theta, read every frame), the markers, and a `view` (a centre and radius in its box, for the horizon at
// the end) — and it's drawn with an orthographic camera set to match cobe's projection exactly, so the page's
// labels, pulses, friends, trail and the bird sit on it as before. The markers are drawn over it on a 2D canvas,
// with the same projection. Without WebGL the story keeps the dotted globe (see story.tsx).
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { cobeProjectXYZ, toXYZ } from '@/components/ui/globe';
import { loadWorld } from '../community/CatMap';
import { aim, buildEarth } from '../community/earthScene';
import type { DottedControl } from './DottedGlobe';

type Vec = [number, number, number];
type Marker = NonNullable<DottedControl['markers']>[number];
/** the sphere's radius in its box (cobe's), as in DottedGlobe */
const R = 0.8;
const PEACH = '#F2906C';
const markerXYZ = new WeakMap<Marker, Vec>();
const rgb = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;

export default function PastelGlobe({ control, onFrame }: { control: MutableRefObject<DottedControl>; onFrame?: (size: number) => void }) {
  const gl = useRef<HTMLCanvasElement>(null), marks = useRef<HTMLCanvasElement>(null), frame = useRef(onFrame); frame.current = onFrame;
  useEffect(() => {
    const canvas = gl.current!, over = marks.current!, box = canvas.parentElement!, ctx = over.getContext('2d')!;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.04;
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
    camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => { trash.push(x); return x; };
    let earth: THREE.Group | null = null, veils: { m: THREE.Object3D; speed: number }[] = [], dead = false;
    loadWorld().then((world: any) => { if (dead || !world) return; ({ earth, veils } = buildEarth(renderer, scene, world.land, keep)); });

    let bw = 0, bh = 0, dpr = 1, raf = 0, last = performance.now();
    const resize = () => {
      // at the screen's own resolution (the box is scaled on screen with the stage), kept to a sane size
      bw = box.offsetWidth; bh = box.offsetHeight;
      const onScreen = bw ? box.getBoundingClientRect().width / bw : 1;
      dpr = Math.min(Math.max(1, (window.devicePixelRatio || 1) * onScreen), Math.sqrt(6e6 / Math.max(1, bw * bh)));
      renderer.setPixelRatio(dpr); renderer.setSize(bw, bh, false);
      over.width = Math.round(bw * dpr); over.height = Math.round(bh * dpr);
    };
    const draw = (now: number) => {
      if (box.offsetWidth !== bw || box.offsetHeight !== bh) resize();
      const dt = Math.min(64, now - last); last = now;
      const { phi, theta, markers, view } = control.current;
      const cx = view?.x ?? bw / 2, cy = view?.y ?? bh / 2, r = view?.r ?? (R * bw) / 2;
      if (earth && bw && bh) {
        // the sphere (radius 1) drawn r px wide about (cx, cy) in the box; the view's centre at lon 270° − phi, lat theta (cobe's turn, as d3's)
        camera.left = -cx / r; camera.right = (bw - cx) / r; camera.top = cy / r; camera.bottom = -(bh - cy) / r; camera.updateProjectionMatrix();
        aim(earth, [-((1.5 * Math.PI - phi) * 180) / Math.PI, -(theta * 180) / Math.PI]);
        if (!still) for (const v of veils) v.m.rotation.y += dt * v.speed;
        renderer.render(scene, camera);
      }
      // the markers (the route's ends, the trail, friends' places), by cobe's projection, as DottedGlobe draws them
      const S = r / (R / 2), ox = cx - S / 2, oy = cy - S / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, bw, bh);
      for (const m of markers ?? []) {
        let v = markerXYZ.get(m);
        if (!v) { v = toXYZ(m.location[0], m.location[1]).map((x) => x * (R + 0.01)) as Vec; markerXYZ.set(m, v); }
        const p = cobeProjectXYZ(v, phi, theta); if (p.depth <= 0.02) continue;
        const mr = Math.max(1.6, m.size * Math.min(r, 240) * 0.5);
        ctx.beginPath(); ctx.arc(ox + p.x * S, oy + p.y * S, mr, 0, Math.PI * 2);
        ctx.fillStyle = m.color ? rgb(m.color) : PEACH; ctx.fill();
        if (mr > 4) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
      }
      frame.current?.(bw);
      raf = requestAnimationFrame(draw);
    };
    resize(); addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => { dead = true; cancelAnimationFrame(raf); removeEventListener('resize', resize); for (const x of trash) x.dispose(); renderer.dispose(); };
  }, [control]);
  return (
    <>
      <canvas ref={gl} style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }} />
      <canvas ref={marks} style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }} />
    </>
  );
}
