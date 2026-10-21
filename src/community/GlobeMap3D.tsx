// Cat Map globe in 3D (Three.js): a soft, matte, pastel earth in Home's look that turns (slowly by itself, by
// dragging), zooms (pinch / wheel / buttons) and carries the cat photo bubbles per country. The earth is a softly
// lit sphere wearing textures made from the real land (globeTextures: a powder-blue sea, paler shallows, creamy
// shores, sage-green land, a pencil grain, a little relief), real clouds and a faint haze drifting over it, and an airy glow at its
// rim — no outlines, no graticule, nothing standing up from the land. The bubbles, your dot and a flying letter are
// DOM nodes placed each frame by projecting their places (no React re-render per frame); on the far side they're
// hidden. The latest letter's way is a red dotted arc, drawn out behind it as it flies. Country
// level only — never a real location. Same props and gestures as the 2D GlobeMap (its fallback without WebGL).
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { geoDistance, geoInterpolate } from 'd3-geo';
import { FLIGHT_S, loadWorld, type MapGroup, type MapRoute } from './CatMap';
import { aim, buildEarth, rad, vec } from './earthScene';

type Props = {
  groups: MapGroup[];
  home?: { lon: number; lat: number } | null;
  routes?: MapRoute[];
  height: number | string;
  bubble?: number;
  onSelect?: (cc: string) => void;
  selected?: string | null;
  controlsBottom?: number;
  /** the + / − buttons (pinch and wheel zoom either way) */
  zoomButtons?: boolean;
  /** a letter's journey: an envelope keeps flying from a to b along the arc */
  /** the latest letter's way: with `play`, it flies there once (the globe holding still, facing the way, until it
   *  lands), the dotted line drawing out behind it; without, it rests where it landed */
  flight?: { a: { lon: number; lat: number }; b: { lon: number; lat: number }; play?: boolean } | null;
  /** the letter, waiting to go (no `flight` yet): it hovers over here, bobbing, the globe holding still under it */
  hover?: { lon: number; lat: number } | null;
  /** the letter set off (when the globe is ready) */
  onFlightStart?: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const FOV = 30;
/** closer than this the camera is almost on the ground (perspective takes over): the 3D globe zooms to 3× */
const MAX_ZOOM = 3;
/** the letter's arc: how high it rises over the globe (radius units), more for a longer way */
const arcH = (d: number) => Math.min(0.26, 0.06 + 0.1 * d);
/** the letter's way as a curve, as on an airline map: along the great circle, bowed to the north and lifted into
 *  the air, both most in the middle */
const curve = (a: [number, number], b: [number, number]) => {
  const ip = geoInterpolate(a, b), d = geoDistance(a, b), H = arcH(d), bend = Math.min(0.3, 0.16 * d);
  const pole = d > 0.02 ? vec(a[0], a[1]).cross(vec(b[0], b[1])).normalize() : new THREE.Vector3();
  if (pole.y < 0) pole.negate();
  return (t: number) => { const [lo, la] = ip(t), u = Math.sin(Math.PI * t); return vec(lo, la).addScaledVector(pole, bend * u).normalize().multiplyScalar(1.012 + H * u); };
};
/** while the letter flies, the globe turns slowly with it: from facing this far along its way to this far; looking
 *  from a little south (°), so the arc's top stays in view */
const VIEW = [0.3, 0.7], VIEW_TILT = 8;
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;


export default function GlobeMap3D({ groups, home, routes = [], height, bubble = 50, onSelect, selected, controlsBottom = 12, zoomButtons = true, flight = null, onFlightStart, hover = null }: Props) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const bubbleEls = useRef<(HTMLDivElement | null)[]>([]);
  const homeEl = useRef<HTMLDivElement>(null), flightEl = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<any>(null);
  const [k, setK] = useState(1);                       // zoom (React state: drives clustering)
  // facing the letter's way when there is one (where the turn starts if it's about to fly, else its middle), else your place
  const mid = flight ? geoInterpolate([flight.a.lon, flight.a.lat], [flight.b.lon, flight.b.lat])(flight.play && !reduceMotion() ? VIEW[0] : 0.5) : null;
  const st = useRef({ rot: (mid ? [-mid[0], clamp(-(mid[1] - VIEW_TILT), -70, 70)] : hover ? [-hover.lon, clamp(-(hover.lat - VIEW_TILT), -70, 70)] : [-(home ? home.lon : 127), -20]) as [number, number], k: 1, w: 0, h: 0, drag: false, idleAt: 0, tween: null as any });

  useEffect(() => { loadWorld().then(setWorld); }, []);

  // Cluster bubbles that would overlap at this zoom — by angular distance, so it doesn't depend on rotation.
  const clusters = useMemo(() => {
    const r = Math.min(st.current.w || 360, st.current.h || 600) * 0.44 * k;
    const out: { lon: number; lat: number; count: number; photo: string; members: MapGroup[] }[] = [];
    for (const g of [...groups].sort((a, b) => b.count - a.count)) {
      const near = out.find((c) => geoDistance([c.lon, c.lat], [g.lon, g.lat]) * r < bubble * 0.9);
      if (near) { near.members.push(g); near.count += g.count; if (!near.photo && g.photo) near.photo = g.photo; }
      else out.push({ lon: g.lon, lat: g.lat, count: g.count, photo: g.photo, members: [g] });
    }
    return out;
  }, [groups, k, bubble]);
  const clustersRef = useRef(clusters); clustersRef.current = clusters;
  const live = useRef({ routes, home, flight, onFlightStart, hover }); live.current = { routes, home, flight, onFlightStart, hover };

  // the scene
  useEffect(() => {
    const canvas = cv.current, el = box.current; if (!canvas || !el || !world) return;
    const still = reduceMotion();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.04;   // keeps the soft pastel colours
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    const trash: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => { trash.push(x); return x; };

    // the earth itself, as on every globe of the app (earthScene): its lights, land and sea, clouds, haze and glow
    const { earth, veils } = buildEarth(renderer, scene, world.land, keep);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();

    // letter routes: small dots along the way, red for letters you sent, blue for ones you got, both in turn for a
    // pal you write back and forth with (rebuilt when they change)
    const dotGeo = keep(new THREE.SphereGeometry(0.0062, 10, 8)), dotMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const RED = new THREE.Color(0xff4b3e), BLUE = new THREE.Color(0x4c8fe0);
    let routeDots: THREE.InstancedMesh | null = null, routeKey = '', flightDots = 0;
    const buildRoutes = () => {
      const { routes: rs, home: hm, flight: fl } = live.current;
      const ways = [...(hm ? rs.map((r) => [[hm.lon, hm.lat], [r.lon, r.lat], r.dir]) : []), ...(fl ? [[[fl.a.lon, fl.a.lat], [fl.b.lon, fl.b.lat], 's']] : [])] as [[number, number], [number, number], string][];
      const key = JSON.stringify(ways); if (key === routeKey) return; routeKey = key;
      if (routeDots) { earth.remove(routeDots); routeDots.dispose(); routeDots = null; }
      const pts: [THREE.Vector3, THREE.Color][] = [];
      flightDots = 0;
      for (const [w, [a, b, dir]] of ways.entries()) {
        const ip = geoInterpolate(a, b), n = Math.max(8, Math.round(geoDistance(a, b) / 0.03));
        const last = !!fl && w === ways.length - 1, cv = last ? curve(a, b) : null;   // the letter's way: a curve
        if (last) flightDots = n + 1;
        for (let i = 0; i <= n; i++) { const [lo, la] = ip(i / n); pts.push([cv ? cv(i / n) : vec(lo, la, 1.012 + 0.03 * Math.sin((Math.PI * i) / n)), dir === 'r' ? BLUE : dir === 'b' && i % 2 ? BLUE : RED]); }
      }
      if (!pts.length) return;
      routeDots = new THREE.InstancedMesh(dotGeo, dotMat, pts.length);
      pts.forEach(([p, c], i) => { m4.compose(p, q.identity(), sc.set(1, 1, 1)); routeDots!.setMatrixAt(i, m4); routeDots!.setColorAt(i, c); });
      earth.add(routeDots);
    };

    // size: the globe as big on screen as the 2D one (radius min(w, h) × 0.44 × zoom)
    const resize = () => {
      const w = el.offsetWidth, h = el.offsetHeight; st.current.w = w; st.current.h = h;
      renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro && ro.observe(el);

    const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
    /** a place on screen, and whether it's on the near side */
    const screenOf = (lon: number, lat: number, r = 1.01, margin = 0.05) => screenAt(vec(lon, lat, r), margin);
    const screenAt = (v: THREE.Vector3, margin: number) => {
      const r = v.length(); tmp.copy(v).applyMatrix4(earth.matrixWorld);
      const front = tmp.dot(camDir) > (r * r) / camera.position.length() + margin;
      tmp.project(camera);
      return { x: ((tmp.x + 1) / 2) * st.current.w, y: ((1 - tmp.y) / 2) * st.current.h, front };
    };
    let raf = 0, last = performance.now(), flyAt = 0, flyR0: [number, number] = [0, 0];      // when the letter set off (0: not yet), and where the globe faced then
    const frame = (now: number) => {
      const s = st.current, dt = Math.min(64, now - last); last = now;
      // the letter's flight: once, from the first frame; the globe holds still (no turning by itself) until it lands
      const fl = live.current.flight, play = !!fl && !!fl.play && !still;
      if (fl && !flyAt) { flyAt = now + 350; flyR0 = [...st.current.rot]; live.current.onFlightStart?.(); }
      const hv = live.current.hover, holding = !fl && !!hv;   // waiting to go: the globe holds still
      const ft = !fl ? 1 : play ? clamp((now - flyAt) / (FLIGHT_S * 1000), 0, 1) : 1, flying = play && ft < 1;
      if (flying) s.idleAt = now;
      // …turning slowly with the letter (from where its way starts towards where it ends), unless you're holding it
      if (play && fl && !s.drag && !s.tween) {
        const u = VIEW[0] + (VIEW[1] - VIEW[0]) * (ft * ft * (3 - 2 * ft)), [vl, va] = geoInterpolate([fl.a.lon, fl.a.lat], [fl.b.lon, fl.b.lat])(u);
        if (ft < 1) {
          // easing over from wherever the globe faced as it set off (e.g. the letter waiting over your country)
          const b = clamp((now - flyAt + 350) / 900, 0, 1), eb = b * b * (3 - 2 * b), dl = ((-vl - flyR0[0] + 540) % 360) - 180;
          s.rot = [flyR0[0] + dl * eb, flyR0[1] + (clamp(-(va - VIEW_TILT), -70, 70) - flyR0[1]) * eb];
        }
      }
      if (s.tween) {
        const u = Math.min(1, (now - s.tween.t0) / 520), e = 1 - Math.pow(1 - u, 3);
        s.rot = [s.tween.r0[0] + (s.tween.r1[0] - s.tween.r0[0]) * e, s.tween.r0[1] + (s.tween.r1[1] - s.tween.r0[1]) * e];
        s.k = s.tween.k0 + (s.tween.k1 - s.tween.k0) * e;
        if (u >= 1) { s.tween = null; setK(s.k); }
      } else if (!still && !s.drag && now - s.idleAt > 2500 && !flying && !holding) s.rot = [s.rot[0] + dt * 0.004, s.rot[1]];
      const { w, h } = s, R = Math.min(w, h) * 0.44 * s.k;
      const d = Math.sqrt(1 + Math.pow(h / 2 / (Math.tan((FOV / 2) * rad) * R), 2));
      camera.position.set(0, 0, d); camera.lookAt(0, 0, 0); camDir.set(0, 0, 1);
      aim(earth, s.rot);
      if (!still) for (const vl of veils) vl.m.rotation.y += dt * vl.speed;
      earth.updateMatrixWorld(true);
      buildRoutes();
      const e2 = ft < 0.5 ? 2 * ft * ft : 1 - Math.pow(-2 * ft + 2, 2) / 2;      // ease in-out
      if (routeDots && flightDots) routeDots.count = routeDots.instanceMatrix.count - flightDots + Math.round(e2 * flightDots);   // the way drawing out behind it
      renderer.render(scene, camera);

      // the bubbles, your dot and the flying letter follow the globe
      clustersRef.current.forEach((c, i) => {
        const node = bubbleEls.current[i]; if (!node) return;
        const p = screenOf(c.lon, c.lat, 1.01, 0.06);
        if (!p.front) { node.style.opacity = '0'; node.style.pointerEvents = 'none'; return; }
        node.style.opacity = '1'; node.style.pointerEvents = 'auto'; node.style.transform = `translate(${p.x}px, ${p.y}px)`;
      });
      const hm = live.current.home;
      if (homeEl.current && hm) { const p = screenOf(hm.lon, hm.lat, 1.012, 0.03); homeEl.current.style.opacity = p.front ? '1' : '0'; homeEl.current.style.transform = `translate(${p.x}px, ${p.y}px)`; }
      if (flightEl.current && holding && hv) {
        // waiting: over your country, a little up in the air, bobbing
        const w = vec(hv.lon, hv.lat, 1.08 + (still ? 0 : Math.sin(now / 1000 * 2.4) * 0.012)), r = w.length();
        const p = screenAt(w, (1 - r * r) / camera.position.length());
        flightEl.current.style.opacity = p.front ? '1' : '0'; flightEl.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
      if (flightEl.current && fl) {
        const w = curve([fl.a.lon, fl.a.lat], [fl.b.lon, fl.b.lat])(e2), r = w.length();
        const p = screenAt(w, (1 - r * r) / camera.position.length());   // riding its dotted curve (up in the air: hidden only behind the earth's own horizon)
        flightEl.current.style.opacity = p.front ? '1' : '0'; flightEl.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro && ro.disconnect();
      if (routeDots) routeDots.dispose();
      for (const x of trash) x.dispose();
      renderer.dispose();
    };
  }, [world]);

  // gestures: drag turns the globe, pinch / wheel zooms
  const pts = useRef(new Map<number, { x: number; y: number }>()), moved = useRef(0);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(), f = box.current!.offsetWidth / r.width || 1; return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f }; };
  const zoomBy = (f: number) => { const s = st.current; s.k = clamp(s.k * f, 1, MAX_ZOOM); setK(s.k); s.idleAt = performance.now(); };
  const onDown = (e: any) => { pts.current.set(e.pointerId, local(e)); moved.current = 0; st.current.drag = true; st.current.tween = null; };
  const onMove = (e: any) => {
    if (!pts.current.has(e.pointerId)) return;
    const prev = pts.current.get(e.pointerId)!, cur = local(e), s = st.current;
    if (pts.current.size === 1) {
      const dx = cur.x - prev.x, dy = cur.y - prev.y; moved.current += Math.abs(dx) + Math.abs(dy);
      if (moved.current > 4) { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* the pointer already went */ } const f = 75 / (Math.min(s.w, s.h) * 0.44 * s.k); s.rot = [s.rot[0] + dx * f, clamp(s.rot[1] - dy * f, -70, 70)]; }
    } else if (pts.current.size === 2) {
      const [a, b] = [...pts.current.entries()].map(([id, p]) => (id === e.pointerId ? cur : p)), [pa, pb] = [...pts.current.values()];
      const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y), d1 = Math.hypot(a.x - b.x, a.y - b.y); moved.current += 10;
      if (d0 > 0) zoomBy(d1 / d0);
    }
    pts.current.set(e.pointerId, cur);
  };
  const onUp = (e: any) => { pts.current.delete(e.pointerId); if (!pts.current.size) { st.current.drag = false; st.current.idleAt = performance.now(); } };
  const onWheel = (e: any) => zoomBy(Math.exp(-e.deltaY * 0.002));

  // tap: bring the country to the front; clusters also zoom in until they split
  const focus = (c: (typeof clusters)[number]) => (e: any) => {
    e.stopPropagation(); if (moved.current > 6) return;
    const s = st.current, many = c.members.length > 1;
    let k1 = s.k;
    if (many) {
      let dmin = Infinity;
      for (let i = 0; i < c.members.length; i++) for (let j = i + 1; j < c.members.length; j++) dmin = Math.min(dmin, geoDistance([c.members[i].lon, c.members[i].lat], [c.members[j].lon, c.members[j].lat]));
      k1 = clamp(Math.max(s.k * 1.8, (bubble * 1.2) / (Math.max(dmin, 0.005) * Math.min(s.w, s.h) * 0.44)), 1, MAX_ZOOM);
    }
    s.tween = { t0: performance.now(), r0: [...s.rot], r1: [-c.lon, clamp(-c.lat, -70, 70)], k0: s.k, k1 };
    s.idleAt = performance.now() + 4000;
    if (!many && onSelect) onSelect(c.members[0].cc);
  };

  return (
    <div ref={box} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
      style={{ position: 'relative', width: '100%', height: typeof height === 'number' ? height + 'px' : height, overflow: 'hidden', background: 'transparent', touchAction: 'none', cursor: 'grab', userSelect: 'none' }}>
      <canvas ref={cv} style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden="true" />
      {home ? (
        <div ref={homeEl} style={{ position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: 7, background: 'rgba(255,75,62,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', willChange: 'transform' }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FF4B3E', boxShadow: '0 0 0 2px #fff' }} />
        </div>
      ) : null}
      {clusters.map((c, i) => {
        const on = !!selected && c.members.some((m) => m.cc === selected), s = on ? bubble + 8 : bubble;
        return (
          <div key={c.members.map((m) => m.id || m.cc).join('-')} ref={(n) => { bubbleEls.current[i] = n; }} onClick={focus(c)} role="button" aria-label={c.members.map((m) => m.cc).join(', ')}
            style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, willChange: 'transform', zIndex: on ? 3 : 2, transition: 'opacity .2s ease' }}>
            <div style={{ position: 'absolute', left: -s / 2, top: -s - 9, width: s, height: s, cursor: 'pointer' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: s * 0.3, overflow: 'hidden', border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 6px 14px rgba(40,30,20,.25)', background: '#EFE7DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.photo ? <img src={c.photo} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <span style={{ fontSize: s * 0.45 }}>🐱</span>}
              </div>
              <div style={{ position: 'absolute', left: '50%', bottom: -7, marginLeft: -6, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #fff' }} />
              {c.count > 1 ? <span style={{ position: 'absolute', right: -7, top: -7, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#1F1E22', color: '#fff', border: '2px solid #fff', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.count > 99 ? '99+' : c.count}</span> : null}
            </div>
          </div>
        );
      })}
      {flight || hover ? (
        /* the letter: the landing story's red envelope (the one the bird carries) */
        <div ref={flightEl} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 40, height: 25, marginLeft: -20, marginTop: -12, opacity: 0, pointerEvents: 'none', willChange: 'transform', zIndex: 4 }}>
          <img src="./assets/onboarding-preview/envelope-closed.png" alt="" draggable={false} style={{ display: 'block', width: '100%', height: '100%', transform: 'rotate(-8deg)', filter: 'drop-shadow(0 3px 4px rgba(40,20,20,.35))' }} />
        </div>
      ) : null}
      {zoomButtons ? (
        <div style={{ position: 'absolute', right: 12, bottom: controlsBottom, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 4 }}>
          {([['+', 1.5], ['−', 1 / 1.5]] as [string, number][]).map(([l, f]) => (
            <div key={l} onClick={(e) => { e.stopPropagation(); zoomBy(f); }} role="button" aria-label={l === '+' ? 'zoom in' : 'zoom out'}
              style={{ width: 40, height: 40, borderRadius: 20, background: '#fff', boxShadow: '0 4px 12px rgba(40,30,20,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 20, color: '#1F1E22', cursor: 'pointer' }}>{l}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
