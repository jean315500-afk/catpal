// The letter's flight, after "Send my letter", like a flight on an airline map: the landing page's dotted globe
// (DottedGlobe), big in the middle, turns once so both countries are in view and holds still; your letter (the red
// envelope) pops up over your country and flies over in a high arc above the globe to your new cat pal's country,
// a white dotted trail drawing out behind it; it lands there with a little bounce and a pulse.
// Countries too far apart to show at once: the world turns under the letter instead (the trail on the surface).
// Same country (no one abroad to match yet): it hops up and lands where it is.
// One run of ~7 s (DeliveryMapScreen then moves on to "arrived"; its card has the running cat). Reduced motion:
// the letter landed, still.
// Before there's anywhere to go (no `to` yet: a cat pal is still being found) it waits: your letter hovers over your
// country, bobbing, the globe swaying gently under it; when `to` comes, it flies from there.
import { useEffect, useMemo, useRef, useState } from 'react';
import { geoDistance, geoInterpolate } from 'd3-geo';
import DottedGlobe, { type DottedControl } from '../onboarding/DottedGlobe';
import { cobeProject } from '@/components/ui/globe';

type LonLat = [number, number];
type Pt = { x: number; y: number };
/** the letter: the red envelope (its width as a fraction of the globe) */
const LETTER = { src: "./assets/onboarding-preview/envelope-closed.png", w: 0.09 };
/** seconds: the globe turns to show both countries; the letter pops up at `pick` and flies; it lands */
const T = { turn: 1.3, pop: 1.1, pick: 1.5, fly: 4.0 };
const ARRIVE = T.pick + T.fly, END = ARRIVE + 1.2;
/** the view: `TILT`° south of what it looks at; the arc's height over the globe (globe-radius units, more for
 *  longer ways); the widest way shown at once (radians) */
const TILT = 10, ARC = { base: 0.07, perRad: 0.16 }, MAX_STILL = 2.4, LIFT = 0.015;
const TRAIL = 60, SURFACE_TRAIL = 48;
/** the globe's room: under the title, above the card at the bottom; as big as fits there */
const ROOM = { top: 96, bottom: 176, max: 540 };
const rad = Math.PI / 180;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sineInOut = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(u));
const PEACH: [number, number, number] = [0.95, 0.56, 0.42], WHITE: [number, number, number] = [1, 1, 1];

export default function LetterFlight({ from, to: dest, fromLabel, toLabel }: { from: LonLat; to: LonLat | null; fromLabel: string; toLabel: string }) {
  const waiting = !dest, to: LonLat = dest || from;
  const wrap = useRef<HTMLDivElement>(null), letter = useRef<HTMLImageElement>(null), pulse = useRef<HTMLSpanElement>(null), trailEl = useRef<SVGPolylineElement>(null);
  const labA = useRef<HTMLSpanElement>(null), labB = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, size: 0, top: 0 });
  const route = useMemo(() => geoInterpolate(from, to), [from[0], from[1], to[0], to[1]]);
  const d = geoDistance(from, to);
  const same = d < 0.03 && !waiting;                          // ~200 km: no way to draw, it hops where it is
  const still = !same && d <= MAX_STILL;          // both countries fit on the globe's near side: the world holds still
  const surface = useMemo(() => Array.from({ length: SURFACE_TRAIL }, (_, i) => { const p = route((i + 0.5) / SURFACE_TRAIL); return { location: [p[1], p[0]] as [number, number], size: 0.016, color: WHITE }; }), [route]);
  const ends = useMemo(() => [{ location: [from[1], from[0]] as [number, number], size: 0.06, color: PEACH }, ...(same || waiting ? [] : [{ location: [to[1], to[0]] as [number, number], size: 0.06, color: PEACH }])], [route, same, waiting]);
  const control = useRef<DottedControl>({ phi: 0, theta: 0, markers: ends });

  // the globe: as big as the room between the title and the card allows, in the middle of it
  useEffect(() => {
    const el = wrap.current!;
    const on = () => {
      const w = el.offsetWidth, h = el.offsetHeight, room = h - ROOM.top - ROOM.bottom;
      const size = Math.max(200, Math.min(w - 8, room, ROOM.max));
      setBox({ w, h, size, top: ROOM.top + Math.max(0, (room - size) / 2) });
    };
    on(); addEventListener('resize', on); return () => removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    if (!box.size) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const S = box.size, ox = (box.w - S) / 2, oy = box.top;
    const H = (ARC.base + ARC.perRad * d) * 0.8;                       // the arc's top, in cobe's units (radius 0.8)
    let lastLon = from[0], raf = 0, ang = 0;
    const unwrap = (lon: number) => { while (lon - lastLon > 180) lon -= 360; while (lon - lastLon < -180) lon += 360; return (lastLon = lon); };
    const face = (p: LonLat) => { control.current.phi = 1.5 * Math.PI - unwrap(p[0]) * rad; control.current.theta = (p[1] - TILT) * rad; };
    const scr = (p: LonLat, lift = LIFT) => { const q = cobeProject(p[1], p[0], control.current.phi, control.current.theta, lift); return { x: ox + q.x * S, y: oy + q.y * S, depth: q.depth }; };
    /** where the letter is at u along the way (the globe as it is now): up in the arc, down onto their place */
    const along = (u: number): Pt => {
      if (same) { const q = scr(from); return { x: q.x, y: q.y - Math.sin(Math.PI * u) * S * 0.12 }; }
      const q = scr(route(u), LIFT + (still ? H : 0.05) * Math.sin(Math.PI * u)); return { x: q.x, y: q.y };
    };
    /** the view: from facing you, turning to the middle of the way (both ends in view); or, when they don't fit, following the letter */
    const view = (t: number, u: number) => {
      if (same) return from;
      if (still) return route(0.5 * sineInOut(t / T.turn));
      return route(t < T.pick ? 0.18 * sineInOut(t / T.pick) : 0.18 + 0.64 * u);
    };
    const t0 = performance.now();
    const frame = (now: number) => {
      if (waiting) {
        // waiting: the globe sways a little under the letter, which hovers over your country, bobbing
        const w = (now - t0) / 1000;
        face([from[0] + (reduce ? 0 : Math.sin(w * 0.5) * 8), from[1]]);
        const A = scr(from, 0.01), pop = reduce ? 1 : clamp01((w - 0.2) / 0.4), grow = pop < 1 ? 1.25 * pop - 0.25 * pop * pop * pop : 1;
        if (letter.current) {
          letter.current.style.opacity = String(pop > 0 ? 1 : 0);
          letter.current.style.transform = `translate(${A.x}px, ${A.y - S * (0.1 + (reduce ? 0 : Math.sin(w * 2.4) * 0.012))}px) translate(-50%, -80%) rotate(${reduce ? 0 : Math.sin(w * 1.2) * 4}deg) scale(${grow})`;
        }
        if (labA.current) { labA.current.style.transform = `translate(${A.x}px, ${A.y}px)`; labA.current.style.opacity = String(clamp01((A.depth - 0.08) / 0.2)); }
        if (trailEl.current) trailEl.current.setAttribute('points', '');
        control.current.markers = ends;
        if (!reduce) raf = requestAnimationFrame(frame);
        return;
      }
      const t = reduce ? END : (now - t0) / 1000;
      const u = sineInOut((t - T.pick) / T.fly);
      face(view(t, u));
      const B = scr(to, 0.01), A0 = scr(from, 0.01);

      // the letter: pops up over you, flies the arc nose along the way, lands with a little bounce
      const L = letter.current;
      if (L) {
        const p = t < T.pick ? along(0) : along(u);
        const a = along(Math.max(0, u - 0.01)), b = along(Math.min(1, u + 0.01));
        const target = t > T.pick && t < ARRIVE && Math.hypot(b.x - a.x, b.y - a.y) > 0.3 ? Math.max(-30, Math.min(30, (Math.atan2(b.y - a.y, Math.abs(b.x - a.x)) / rad) * Math.sign(b.x - a.x || 1))) : 0;
        ang += (target - ang) * 0.15;
        const pop = clamp01((t - T.pop) / 0.4), grow = pop < 1 ? 1.25 * pop - 0.25 * pop * pop * pop : 1;   // a little overshoot
        const tl = t - ARRIVE, sq = tl > 0 ? Math.exp(-tl * 8) * Math.abs(Math.sin(tl * 16)) * 0.18 : 0;
        L.style.opacity = String(pop > 0 ? 1 : 0);
        L.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -80%) rotate(${ang}deg) scale(${grow * (1 + sq)}, ${grow * (1 - sq)})`;
      }

      // the trail: on the arc behind the letter (the world holding still), or on the surface (the world turning)
      if (trailEl.current) {
        const n = still && t >= T.pick ? Math.round(u * TRAIL) : 0;
        trailEl.current.setAttribute('points', n > 1 ? Array.from({ length: n + 1 }, (_, i) => { const q = along((i / n) * u); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ') : '');
      }
      const shown = !still && !same && t >= T.pick ? Math.round(u * SURFACE_TRAIL) : 0;
      control.current.markers = shown ? [...ends, ...surface.slice(0, shown)] : ends;

      // the two ends: labels (faded at the globe's rim) and, as the letter lands, a pulse
      const seen = (dp: number) => String(clamp01((dp - 0.08) / 0.2));
      for (const [el, q] of [[labA.current, A0], [labB.current, B]] as const) if (el) { el.style.transform = `translate(${q.x}px, ${q.y}px)`; el.style.opacity = seen(q.depth); }
      if (pulse.current) { pulse.current.style.transform = `translate(${B.x}px, ${B.y}px)`; pulse.current.classList.toggle('on', t >= ARRIVE); }
      if (!reduce && t < END + 0.3) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [box, route, same, still, surface, ends, waiting]);

  const pin = { position: "absolute", left: 0, top: 0, zIndex: 3, pointerEvents: "none", willChange: "transform" } as const;
  const tag = { position: "absolute", whiteSpace: "nowrap", padding: "5px 10px", borderRadius: "999px", background: "rgba(255,255,255,.92)", boxShadow: "0 4px 12px rgba(34,48,74,.18)", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "12px", color: "#22304A" } as const;
  return (
    <div ref={wrap} aria-hidden="true" style={{ position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" }}>
      {box.size ? (
        <>
          <div style={{ position: "absolute", left: (box.w - box.size) / 2 + "px", top: box.top + "px", width: box.size + "px", height: box.size + "px", animation: "cp-rise2 .6s cubic-bezier(.2,.8,.2,1) both" }}>
            <DottedGlobe control={control} />
          </div>
          {/* the way flown, along the arc */}
          <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, zIndex: 2, overflow: "visible" }}>
            <polyline ref={trailEl} points="" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0 8" style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,.5))" }} />
          </svg>
          <span ref={labA} style={pin}><span style={{ ...tag, transform: "translate(-50%, calc(-100% - 12px))" }}>{fromLabel}</span></span>
          {!same && !waiting ? <span ref={labB} style={pin}><span style={{ ...tag, transform: "translate(-50%, calc(-100% - 34px))", boxShadow: "0 0 0 1.5px #F29C7A, 0 4px 14px rgba(242,156,122,.3)", fontWeight: 700 }}>{toLabel}</span></span> : null}
          <span ref={pulse} className="cp-flight-pulse" style={pin}><i /></span>
          <img ref={letter} src={LETTER.src} alt="" draggable={false} style={{ ...pin, zIndex: 4, width: Math.round(box.size * LETTER.w) + "px", opacity: 0, transformOrigin: "50% 80%", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.4))" }} />
        </>
      ) : null}
    </div>
  );
}
