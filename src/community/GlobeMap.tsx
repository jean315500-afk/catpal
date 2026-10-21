// Cat Map globe (orthographic, slowly spinning, drag to turn, pinch / wheel / buttons to zoom) with cat
// photo bubbles per country on top, drawn as a bright, toy-like earth: a blue sea with turquoise shallows, green
// land on sandy shores, little trees, soft clouds drifting over it, a round light and a glow at the rim.
// Canvas draws the globe each frame; the bubbles are DOM nodes moved by ref (no React re-render
// per frame). Bubbles on the far side are hidden. Countries with cats get a warm, sunny tint; letter
// routes from you are dotted red arcs. Country level only — never a real location.
import { useEffect, useMemo, useRef, useState } from 'react';
import { geoContains, geoDistance, geoEquirectangular, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import { loadWorld, type MapGroup, type MapRoute } from './CatMap';

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
  flight?: { a: { lon: number; lat: number }; b: { lon: number; lat: number }; play?: boolean } | null;
  /** the letter set off (here: as soon as it's shown) */
  onFlightStart?: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** clouds over the earth: fixed places (they drift east with time), sizes */
const CLOUDS = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { lon: r(1) * 360 - 180, lat: r(2) * 120 - 60, size: 0.7 + r(3) * 0.9 };
});
/** the land's halftone dots (as the landing globe: a 1.28° grid kept where there is land, read off a small map
 *  of it), each as [cos lon, sin lon, cos lat, sin lat] so a frame only rotates them; made once */
let DOTS: Float32Array | null = null;
function landDots(land: any): Float32Array {
  if (DOTS) return DOTS;
  const MW = 720, MH = 360, map = document.createElement('canvas'); map.width = MW; map.height = MH;
  const mc = map.getContext('2d')!;
  mc.beginPath(); geoPath(geoEquirectangular().scale(MW / (2 * Math.PI)).translate([MW / 2, MH / 2]), mc)(land); mc.fill();
  const px = mc.getImageData(0, 0, MW, MH).data, out: number[] = [], STEP = 16 * 0.08, rad = Math.PI / 180;
  for (let lat = -89; lat <= 89; lat += STEP) for (let lon = -180; lon < 180; lon += STEP) {
    const i = (Math.min(MH - 1, Math.floor(((90 - lat) / 180) * MH)) * MW + Math.min(MW - 1, Math.floor(((lon + 180) / 360) * MW))) * 4 + 3;
    if (px[i] > 127) out.push(Math.cos(lon * rad), Math.sin(lon * rad), Math.cos(lat * rad), Math.sin(lat * rad));
  }
  return (DOTS = new Float32Array(out));
}
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function GlobeMap({ groups, home, routes = [], height, bubble = 50, onSelect, selected, controlsBottom = 12, zoomButtons = true, flight = null, onFlightStart }: Props) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const bubbleEls = useRef<(HTMLDivElement | null)[]>([]);
  const homeEl = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<any>(null);
  const [k, setK] = useState(1);                       // zoom (React state: drives clustering)
  useEffect(() => { if (flight) onFlightStart?.(); }, [!!flight]);
  const st = useRef({ rot: [-(home ? home.lon : 127), -20] as [number, number], k: 1, w: 0, h: 0, drag: false, idleAt: 0, tween: null as any });

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
  const tinted = useMemo(() => {
    if (!world) return [];
    const ccs = groups.map((g) => [g.lon, g.lat] as [number, number]);
    return world.countries.filter((f: any) => ccs.some((p) => geoContains(f, p)));
  }, [world, groups]);

  // the draw loop
  useEffect(() => {
    const canvas = cv.current, el = box.current; if (!canvas || !el) return;
    const ctx = canvas.getContext('2d')!;
    const proj = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(proj, ctx), grat = geoGraticule10();
    let raf = 0, last = performance.now();
    const still = reduceMotion();
    const resize = () => {
      const dpr = window.devicePixelRatio || 1, w = el.offsetWidth, h = el.offsetHeight;
      st.current.w = w; st.current.h = h;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro && ro.observe(el);
    const frame = (now: number) => {
      const s = st.current, dt = Math.min(64, now - last); last = now;
      if (s.tween) {
        const u = Math.min(1, (now - s.tween.t0) / 520), e = 1 - Math.pow(1 - u, 3);
        s.rot = [s.tween.r0[0] + (s.tween.r1[0] - s.tween.r0[0]) * e, s.tween.r0[1] + (s.tween.r1[1] - s.tween.r0[1]) * e];
        s.k = s.tween.k0 + (s.tween.k1 - s.tween.k0) * e;
        if (u >= 1) { s.tween = null; setK(s.k); }
      } else if (!still && !s.drag && now - s.idleAt > 2500) s.rot = [s.rot[0] + dt * 0.004, s.rot[1]];
      const { w, h } = s, R = Math.min(w, h) * 0.44 * s.k;
      proj.rotate(s.rot).scale(R).translate([w / 2, h / 2]);
      ctx.clearRect(0, 0, w, h);
      // a bright, toy-like earth: a blue sea with turquoise shallows, green land on a sandy shore over an earthy
      // edge (the land's thickness), little trees, soft clouds drifting over it, a round light and a glow at the rim
      const lw = clamp(R / 240, 0.6, 1.6), cx = w / 2, cy = h / 2, sphere = { type: 'Sphere' } as any;
      const sea = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.08, cx, cy, R);
      sea.addColorStop(0, '#74D3FF'); sea.addColorStop(0.55, '#2F9DEB'); sea.addColorStop(1, '#1C6ED0');
      ctx.beginPath(); path(sphere); ctx.fillStyle = sea; ctx.fill();
      ctx.save(); ctx.beginPath(); path(sphere); ctx.clip(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (world) {
        ctx.beginPath(); path(world.land);
        ctx.strokeStyle = 'rgba(130,228,255,.42)'; ctx.lineWidth = 15 * lw; ctx.stroke();       // the shallows
        ctx.strokeStyle = 'rgba(190,247,255,.55)'; ctx.lineWidth = 6.5 * lw; ctx.stroke();
        ctx.save(); ctx.translate(0, 2.6 * lw); ctx.beginPath(); path(world.land); ctx.fillStyle = '#C3925A'; ctx.fill(); ctx.restore();   // the edge
        ctx.beginPath(); path(world.land); ctx.strokeStyle = '#F3E3B5'; ctx.lineWidth = 3.2 * lw; ctx.stroke();                          // sand
        const grass = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.6, cy + R);
        grass.addColorStop(0, '#A6E35E'); grass.addColorStop(1, '#5CB833'); ctx.fillStyle = grass; ctx.fill();
        for (const f of tinted) { ctx.beginPath(); path(f); ctx.fillStyle = 'rgba(255,221,110,.38)'; ctx.fill(); }   // countries with cats
        // little trees: some of the land's grid points (rotated as d3's orthographic does), dark with a lit top
        const dots = landDots(world.land), rad = Math.PI / 180, cl = Math.cos(s.rot[0] * rad), sl = Math.sin(s.rot[0] * rad);
        const cp = Math.cos(s.rot[1] * rad), sp = Math.sin(s.rot[1] * rad), tr = clamp(2.1 * R / 240, 1, 3.6);
        const dark = new Path2D(), lit = new Path2D();
        for (let i = 0, j = 0; i < dots.length; i += 4, j++) {
          const hsh = Math.sin(j * 12.9898) * 43758.5453, f = hsh - Math.floor(hsh);
          if (f > 0.055) continue;                                                               // scattered, not a grid
          const co = dots[i] * cl - dots[i + 1] * sl, so = dots[i + 1] * cl + dots[i] * sl;   // lon + λ
          const x = dots[i + 2] * co, y = dots[i + 2] * so, z = dots[i + 3], depth = x * cp - z * sp;
          if (depth <= 0.08) continue;                                                           // far side / the rim
          const jx = (f * 18.2 % 1 - 0.5) * tr * 3, jy = (f * 37.7 % 1 - 0.5) * tr * 3;            // a little off the grid
          const X = cx + R * y + jx, Y = cy - R * (z * cp + x * sp) + jy;
          if (X < -tr || Y < -tr || X > w + tr || Y > h + tr) continue;
          dark.moveTo(X + tr, Y); dark.arc(X, Y, tr, 0, Math.PI * 2);
          lit.moveTo(X - tr * 0.25 + tr * 0.5, Y - tr * 0.35); lit.arc(X - tr * 0.25, Y - tr * 0.35, tr * 0.5, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#2E8C3C'; ctx.fill(dark); ctx.fillStyle = 'rgba(140,214,96,.9)'; ctx.fill(lit);
      }
      // clouds drifting slowly east over the earth, fainter towards the rim
      const ctr: [number, number] = [-s.rot[0], -s.rot[1]];
      for (const c of CLOUDS) {
        const lon = c.lon + (still ? 0 : now * 0.0007), at: [number, number] = [((lon + 540) % 360) - 180, c.lat];
        const ang = geoDistance(at, ctr); if (ang > Math.PI / 2 - 0.05) continue;
        const pp = proj(at); if (!pp) continue;
        const k = Math.cos(ang), rr = R * 0.055 * c.size, a = 0.85 * Math.min(1, k * 1.6);
        for (const [dx, dy, f] of [[-0.9, 0.15, 0.75], [0, 0, 1], [0.95, 0.2, 0.7], [0.35, -0.45, 0.65]] as const) {
          const x = pp[0] + dx * rr, y = pp[1] + dy * rr * k, r = rr * f;
          const g = ctx.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
          g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.7, `rgba(255,255,255,${a * 0.75})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.55 + 0.45 * k), 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      // the round light: a highlight up and to the left, a little shade on the far side
      const hl = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.48, 0, cx - R * 0.42, cy - R * 0.48, R * 0.9);
      hl.addColorStop(0, 'rgba(255,255,255,.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      const sh = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.55, cx, cy, R * 1.05);
      sh.addColorStop(0, 'rgba(10,40,110,0)'); sh.addColorStop(1, 'rgba(10,40,110,.28)');
      ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      ctx.restore();
      // a soft glow at the rim
      ctx.save(); ctx.beginPath(); path(sphere); ctx.shadowColor = 'rgba(255,255,255,.85)'; ctx.shadowBlur = 18 * lw; ctx.lineWidth = 2.5 * lw; ctx.strokeStyle = 'rgba(235,248,255,.9)'; ctx.stroke(); ctx.restore();
      if (home) for (const r of routes) {
        const ip = geoInterpolate([home.lon, home.lat], [r.lon, r.lat]);
        ctx.beginPath(); path({ type: 'LineString', coordinates: Array.from({ length: 49 }, (_, i) => ip(i / 48)) } as any);
        ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.strokeStyle = '#FF4B3E'; ctx.stroke(); ctx.setLineDash([]);
      }
      if (flight) {
        // the journey arc + a postcard flying along it (the original delivery look)
        const ip = geoInterpolate([flight.a.lon, flight.a.lat], [flight.b.lon, flight.b.lat]);
        ctx.beginPath(); path({ type: 'LineString', coordinates: Array.from({ length: 65 }, (_, i) => ip(i / 64)) } as any);
        ctx.setLineDash([5, 6]); ctx.lineWidth = 2.4; ctx.strokeStyle = '#FF4B3E'; ctx.stroke(); ctx.setLineDash([]);
        const t = still ? 0.55 : ((now / 1000) % 4.2) / 4.2, e2 = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const ctr: [number, number] = [-s.rot[0], -s.rot[1]], at = ip(e2);
        const pp = geoDistance(at, ctr) < Math.PI / 2 - 0.02 ? proj(at) : null;
        if (pp) {
          ctx.save(); ctx.translate(pp[0], pp[1]); ctx.rotate(-0.15);
          ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8; ctx.fillStyle = '#F9F4EB'; ctx.fillRect(-15, -10, 30, 20);
          ctx.shadowBlur = 0; ctx.fillStyle = '#FF4B3E'; ctx.fillRect(5, -7, 7, 8);
          ctx.fillStyle = '#D9D9D9'; ctx.fillRect(-11, 1, 12, 1.5); ctx.fillRect(-11, 5, 16, 1.5); ctx.restore();
        }
      }
      const center: [number, number] = [-s.rot[0], -s.rot[1]];
      // bubbles + home dot follow the globe
      clustersRef.current.forEach((c, i) => {
        const node = bubbleEls.current[i]; if (!node) return;
        const front = geoDistance([c.lon, c.lat], center) < Math.PI / 2 - 0.08;
        const p = proj([c.lon, c.lat]);
        if (!front || !p) { node.style.opacity = '0'; node.style.pointerEvents = 'none'; return; }
        node.style.opacity = '1'; node.style.pointerEvents = 'auto';
        node.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
      });
      if (homeEl.current && home) {
        const p = proj([home.lon, home.lat]), front = geoDistance([home.lon, home.lat], center) < Math.PI / 2 - 0.05;
        homeEl.current.style.opacity = front && p ? '1' : '0';
        if (p) homeEl.current.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro && ro.disconnect(); };
  }, [world, tinted, routes, home && home.lon, flight && flight.a.lon, flight && flight.b.lon]);

  // gestures: drag turns the globe, pinch / wheel zooms
  const pts = useRef(new Map<number, { x: number; y: number }>()), moved = useRef(0);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(), f = box.current!.offsetWidth / r.width || 1; return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f }; };
  const zoomBy = (f: number) => { const s = st.current; s.k = clamp(s.k * f, 1, 5); setK(s.k); s.idleAt = performance.now(); };
  const onDown = (e: any) => { pts.current.set(e.pointerId, local(e)); moved.current = 0; st.current.drag = true; st.current.tween = null; };
  const onMove = (e: any) => {
    if (!pts.current.has(e.pointerId)) return;
    const prev = pts.current.get(e.pointerId)!, cur = local(e), s = st.current;
    if (pts.current.size === 1) {
      const dx = cur.x - prev.x, dy = cur.y - prev.y; moved.current += Math.abs(dx) + Math.abs(dy);
      if (moved.current > 4) { e.currentTarget.setPointerCapture?.(e.pointerId); const f = 75 / (Math.min(s.w, s.h) * 0.44 * s.k); s.rot = [s.rot[0] + dx * f, clamp(s.rot[1] - dy * f, -70, 70)]; }
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
      k1 = clamp(Math.max(s.k * 1.8, (bubble * 1.2) / (Math.max(dmin, 0.005) * Math.min(s.w, s.h) * 0.44)), 1, 5);
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
