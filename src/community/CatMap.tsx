// Cat Map: cat photos shared from each country, as photo bubbles on a flat world map
// (country level only — a moment only knows the country it was shared from).
// Nearby countries merge into one bubble with a count; tapping it zooms in.
// Optional dotted letter routes with an envelope gliding along them (SVG animateMotion).
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import { geoCentroid, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';

export type MapGroup = { cc: string; lon: number; lat: number; count: number; photo: string; id?: string; kind?: 'pal' | 'active' };
export type MapRoute = { lon: number; lat: number; dir: string };
/** how long the letter takes on the Map's globe, from your place to theirs (s) */
export const FLIGHT_S = 6;
type Props = {
  groups: MapGroup[];
  home?: { lon: number; lat: number } | null;
  routes?: MapRoute[];
  interactive?: boolean;
  height: number | string;
  bubble?: number;
  onSelect?: (cc: string) => void;
  selected?: string | null;
  /** round avatar pins (home) instead of photo bubbles */
  pin?: 'bubble' | 'avatar';
  /** country being picked right now (random cat pal): red ring + lift */
  highlight?: string | null;
  /** distance of the zoom buttons from the bottom (to clear a floating nav) */
  controlsBottom?: number;
};

let world: { land: any; borders: any; countries: any[] } | null = null;
let worldPromise: Promise<typeof world> | null = null;
export function loadWorld() {
  if (!worldPromise) worldPromise = import('world-atlas/countries-110m.json').then((m: any) => {
    const topo = m.default || m;
    world = { land: feature(topo, topo.objects.land), borders: mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b), countries: (feature(topo, topo.objects.countries) as any).features };
    return world;
  });
  return worldPromise;
}

const SEA = '#E8EFF3', LAND = '#DCE6D4', COAST = 'rgba(140,165,130,.75)', TERRA = '#C9785D';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function CatMap({ groups, home, routes = [], interactive = false, height, bubble: bubbleProp, onSelect, selected, pin = 'bubble', highlight = null, controlsBottom = 12 }: Props) {
  const bubble = bubbleProp ?? (pin === 'avatar' ? 34 : interactive ? 52 : 38);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setReady] = useState(!!world);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const tRef = useRef(t); tRef.current = t;

  useEffect(() => { if (!world) loadWorld().then(() => setReady(true)); }, []);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro && ro.observe(el);
    return () => ro && ro.disconnect();
  }, []);

  // Base projection: the whole world centred on you (interactive), or fitted to the cats + routes (preview).
  const geo = useMemo(() => {
    const { w, h } = size; if (!w || !h) return null;
    const proj = geoNaturalEarth1().precision(0.3);
    const pts: [number, number][] = [...groups.map((g) => [g.lon, g.lat] as [number, number]), ...routes.map((r) => [r.lon, r.lat] as [number, number])];
    if (home) pts.push([home.lon, home.lat]);
    const lon0 = home ? home.lon : pts.length ? geoCentroid({ type: 'MultiPoint', coordinates: pts } as any)[0] : 20;
    proj.rotate([-lon0, 0]);
    proj.fitSize([w, h], { type: 'Sphere' } as any);
    if (!interactive && pts.length > 1) {
      // Fit the points' lon/lat span (not the spherical centroid, which drifts north for Europe + Asia).
      const sWorld = proj.scale();
      const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
      const span = Math.max(...lons) - Math.min(...lons);
      const lonMid = span <= 180 ? (Math.max(...lons) + Math.min(...lons)) / 2 : geoCentroid({ type: 'MultiPoint', coordinates: pts } as any)[0];
      const latMid = (Math.max(...lats) + Math.min(...lats)) / 2;
      proj.rotate([-lonMid, 0]).center([0, 0]).fitExtent([[bubble * 0.8, bubble + 16], [w - bubble * 0.8, h - 16]], { type: 'MultiPoint', coordinates: pts } as any);
      proj.scale(clamp(proj.scale(), sWorld, sWorld * 3.2)).translate([w / 2, h / 2]);
      const m = proj([lonMid, latMid]) || [w / 2, h / 2];
      proj.translate([w - m[0], h - m[1] + bubble / 3]);
    }
    const path = geoPath(proj);
    const [[bx0, by0], [bx1, by1]] = path.bounds({ type: 'Sphere' } as any);
    return {
      proj, bounds: { bx0, by0, bx1, by1 },
      land: world ? path(world.land) || '' : '', borders: world ? path(world.borders) || '' : '', grat: path(geoGraticule10()) || '',
      routes: home ? routes.map((r) => {
        const ip = geoInterpolate([home.lon, home.lat], [r.lon, r.lat]);
        return { ...r, d: path({ type: 'LineString', coordinates: Array.from({ length: 41 }, (_, i) => ip(i / 40)) } as any) || '' };
      }) : [],
    };
  }, [size.w, size.h, world, groups.length, routes.length, home && home.lon, interactive]);

  // Interactive: start zoomed to where the cats (and you) are, like a photo map.
  const fitted = useRef(false);
  useEffect(() => {
    if (!interactive || !geo || fitted.current) return;
    const ps = [...groups.map((g) => [g.lon, g.lat]), ...(home ? [[home.lon, home.lat]] : [])].map((p) => geo.proj(p as [number, number])).filter(Boolean) as [number, number][];
    if (!ps.length) return;
    fitted.current = true;
    const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const { w, h } = size, padX = bubble * 1.6, padTop = 150, padBottom = 120;
    const k = clamp(Math.min((w - padX * 2) / Math.max(x1 - x0, 1), (h - padTop - padBottom) / Math.max(y1 - y0, 1)), 1, 6);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    setT(fix({ k, x: w / 2 - cx * k, y: padTop + (h - padTop - padBottom) / 2 - cy * k }));
  }, [geo, groups.length]);

  useEffect(() => { if (!interactive && !selected && tRef.current.k !== 1) tween({ k: 1, x: 0, y: 0 }); }, [selected]);

  // Clamp panning so the map can't be dragged away.
  // allow zooming far enough to separate close countries (e.g. in Europe)
  const fix = (n: { k: number; x: number; y: number }) => {
    if (!geo) return n;
    const { bx0, by0, bx1, by1 } = geo.bounds, { w, h } = size;
    const k = clamp(n.k, 1, 14);
    return { k, x: clamp(n.x, w / 2 - bx1 * k, w / 2 - bx0 * k), y: clamp(n.y, h / 2 - by1 * k, h / 2 - by0 * k) };
  };
  const zoomAt = (f: number, cx: number, cy: number) => setT((o) => { const k = clamp(o.k * f, 1, 14), r = k / o.k; return fix({ k, x: cx - (cx - o.x) * r, y: cy - (cy - o.y) * r }); });
  const tween = (to: { k: number; x: number; y: number }) => {
    const from = tRef.current, t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / 320), e = 1 - Math.pow(1 - u, 3);
      setT(fix({ k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }));
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Screen positions + clustering of bubbles that would overlap at the current zoom.
  const bubbles = useMemo(() => {
    if (!geo) return [];
    const pos = groups.map((g) => { const p = geo.proj([g.lon, g.lat]) || [0, 0]; return { g, bx: p[0], by: p[1], x: p[0] * t.k + t.x, y: p[1] * t.k + t.y }; });
    const out: { x: number; y: number; bx: number; by: number; count: number; photo: string; members: MapGroup[] }[] = [];
    for (const p of pos.sort((a, b) => b.g.count - a.g.count)) {
      const near = out.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < bubble * 0.95);
      if (near) { near.members.push(p.g); near.count += p.g.count; if (!near.photo && p.g.photo) near.photo = p.g.photo; }
      else out.push({ x: p.x, y: p.y, bx: p.bx, by: p.by, count: p.g.count, photo: p.g.photo, members: [p.g] });
    }
    return out;
  }, [geo, groups, t.k, t.x, t.y, bubble]);

  // Gestures: drag to pan, pinch / wheel / buttons to zoom.
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(), s = box.current!.offsetWidth / r.width || 1; return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s }; };
  const onDown = (e: RPointerEvent) => { if (!interactive) return; pts.current.set(e.pointerId, local(e)); moved.current = 0; };
  const onMove = (e: RPointerEvent) => {
    if (!interactive || !pts.current.has(e.pointerId)) return;
    const prev = pts.current.get(e.pointerId)!, cur = local(e);
    if (pts.current.size === 1) {
      moved.current += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      if (moved.current > 6) { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); setT((o) => fix({ ...o, x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y })); }
    } else if (pts.current.size === 2) {
      const [a, b] = [...pts.current.entries()].map(([id, p]) => (id === e.pointerId ? cur : p));
      const [pa, pb] = [...pts.current.values()];
      const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y), d1 = Math.hypot(a.x - b.x, a.y - b.y);
      moved.current += 10;
      if (d0 > 0) zoomAt(d1 / d0, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    pts.current.set(e.pointerId, cur);
  };
  const onUp = (e: RPointerEvent) => { pts.current.delete(e.pointerId); };
  const onWheel = (e: RWheelEvent) => { if (!interactive) return; const p = local(e); zoomAt(Math.exp(-e.deltaY * 0.0022), p.x, p.y); };

  const tapBubble = (c: (typeof bubbles)[number]) => (e: any) => {
    if (!interactive && !onSelect) return;
    e.stopPropagation();
    if (interactive && moved.current > 6) return;
    if (c.members.length > 1 && geo) {
      // zoom until the closest two countries in this cluster stop overlapping
      const ps = c.members.map((m) => geo.proj([m.lon, m.lat]) || [0, 0]);
      let dmin = Infinity;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) dmin = Math.min(dmin, Math.hypot(ps[i][0] - ps[j][0], ps[i][1] - ps[j][1]));
      const k = clamp(Math.max(tRef.current.k * 2, (bubble * 1.15) / Math.max(dmin, 1)), 1, 14), { w, h } = size;
      tween(fix({ k, x: w / 2 - c.bx * k, y: h / 2 + bubble / 2 - c.by * k }));
    } else onSelect && onSelect(c.members[0].cc);
  };

  const homeXY = geo && home ? (() => { const p = geo.proj([home.lon, home.lat]); return p ? { x: p[0] * t.k + t.x, y: p[1] * t.k + t.y } : null; })() : null;
  const inv = 1 / t.k;
  return (
    <div ref={box} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
      style={{ position: 'relative', width: '100%', height: typeof height === 'number' ? height + 'px' : height, overflow: 'hidden', background: SEA, touchAction: interactive ? 'none' : 'auto', cursor: interactive ? 'grab' : 'inherit', userSelect: 'none' }}>
      {geo ? (
        <svg width={size.w} height={size.h} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
            <path d={geo.grat} fill="none" stroke="rgba(125,155,181,.18)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
            <path d={geo.land} fill={LAND} stroke={COAST} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
            <path d={geo.borders} fill="none" stroke="rgba(140,165,130,.45)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
            {geo.routes.map((r, i) => (
              <g key={i}>
                <path id={`cm-r-${i}`} d={r.d} fill="none" stroke={TERRA} strokeOpacity={0.85} strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <g>
                  <animateMotion dur={r.dir === 'b' ? '8.4s' : '4.2s'} begin={`${i * 1.3}s`} repeatCount="indefinite" calcMode="linear"
                    keyPoints={r.dir === 'r' ? '1;0' : r.dir === 'b' ? '0;1;0' : '0;1'} keyTimes={r.dir === 'b' ? '0;0.5;1' : '0;1'}>
                    <mpath href={`#cm-r-${i}`} />
                  </animateMotion>
                  <g transform={`scale(${inv})`}>
                    <rect x={-9} y={-6} width={18} height={12} rx={1.2} fill="#FFFDF9" stroke={TERRA} strokeWidth={1} />
                    <path d="M-9 -6 L0 1.2 L9 -6" fill="none" stroke={TERRA} strokeWidth={1} />
                  </g>
                </g>
              </g>
            ))}
          </g>
        </svg>
      ) : null}
      {homeXY ? (
        <div style={{ position: 'absolute', left: homeXY.x - 7, top: homeXY.y - 7, width: 14, height: 14, borderRadius: 7, background: 'rgba(93,134,181,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 7, height: 7, borderRadius: 4, background: '#5D86B5', boxShadow: '0 0 0 2px #fff' }} />
        </div>
      ) : null}
      {bubbles.map((c) => {
        const on = !!selected && c.members.some((m) => m.cc === selected);
        const hi = !!highlight && c.members.some((m) => m.cc === highlight);
        if (pin === 'avatar') {
          const s2 = hi ? bubble + 10 : bubble;
          return (
            <div key={c.members.map((m) => m.id || m.cc).join('-')} onClick={tapBubble(c)} aria-label={c.members.map((m) => m.cc).join(', ')}
              style={{ position: 'absolute', overflow: 'visible', left: c.x - s2 / 2, top: c.y - s2 / 2, width: s2, height: s2, borderRadius: s2 / 2, border: `${hi ? 3 : 2.5}px solid ${hi ? '#E5483D' : c.members.some((m) => m.kind === 'pal') ? '#5FB39A' : '#fff'}`, boxSizing: 'border-box', background: c.members.some((m) => m.kind === 'pal') ? '#CFEBE1' : '#EFE7DB',
                boxShadow: hi ? '0 6px 16px rgba(229,72,61,.35)' : '0 3px 8px rgba(40,30,20,.22)', zIndex: hi ? 4 : 2, transition: 'all .12s ease', animation: hi ? 'cp-ring 1s ease-out infinite' : 'none' }}>
              {c.photo ? <img src={c.photo} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }} /> : <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(bubble * .45) }}>🐱</span>}
              {c.members.length > 1 ? <span style={{ position: 'absolute', right: -8, bottom: -6, minWidth: 18, height: 18, padding: '0 4px', boxSizing: 'border-box', borderRadius: 9, background: '#1F1E22', color: '#fff', border: '2px solid #fff', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 9.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'+' + (c.members.length - 1)}</span> : null}
            </div>
          );
        }
        const s = on ? bubble + 8 : bubble;
        return (
          <div key={c.members.map((m) => m.cc).join('-')} onClick={tapBubble(c)} role={interactive ? 'button' : undefined}
            aria-label={c.members.map((m) => m.cc).join(', ')}
            style={{ position: 'absolute', left: c.x - s / 2, top: c.y - s - 9, width: s, height: s, cursor: interactive || onSelect ? 'pointer' : 'inherit', transition: 'width .15s ease, height .15s ease', zIndex: on ? 3 : 2 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: s * 0.3, overflow: 'hidden', border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 6px 14px rgba(40,30,20,.25)', background: '#EFE7DB' }}>
              {c.photo ? <img src={c.photo} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
            </div>
            <div style={{ position: 'absolute', left: '50%', bottom: -7, marginLeft: -6, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #fff', filter: 'drop-shadow(0 2px 1px rgba(40,30,20,.12))' }} />
            {c.count > 1 ? (
              <span style={{ position: 'absolute', right: -7, top: -7, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#1F1E22', color: '#fff', border: '2px solid #fff', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.count > 99 ? '99+' : c.count}</span>
            ) : null}
          </div>
        );
      })}
      {interactive ? (
        <div style={{ position: 'absolute', right: 12, bottom: controlsBottom, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 4 }}>
          {[['+', 1.6], ['−', 1 / 1.6]].map(([l, f]) => (
            <div key={l as string} onClick={(e) => { e.stopPropagation(); const cur = tRef.current, k = clamp(cur.k * (f as number), 1, 14), r = k / cur.k, cx = size.w / 2, cy = size.h / 2; tween(fix({ k, x: cx - (cx - cur.x) * r, y: cy - (cy - cur.y) * r })); }}
              role="button" aria-label={l === '+' ? 'zoom in' : 'zoom out'}
              style={{ width: 40, height: 40, borderRadius: 20, background: '#fff', boxShadow: '0 4px 12px rgba(40,30,20,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 20, color: '#1F1E22', cursor: 'pointer' }}>{l}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
