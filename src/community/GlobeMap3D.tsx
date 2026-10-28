// Cat Map globe in 3D (Three.js): a soft, matte, pastel earth in Home's look that turns (slowly by itself, by
// dragging), zooms (pinch / wheel / buttons) and carries the cat photo bubbles per country. The earth is a softly
// lit sphere wearing textures made from the real land (globeTextures: a powder-blue sea, paler shallows, creamy
// shores, sage-green land, a pencil grain, a little relief), real clouds and a faint haze drifting over it, and an airy glow at its
// rim — no outlines, no graticule, nothing standing up from the land. The bubbles, your dot and a flying letter are
// DOM nodes placed each frame by projecting their places (no React re-render per frame); on the far side they're
// hidden. The latest letter's way is a red dotted arc, drawn out behind it as it flies. Letters on their way
// (`journeys`) are a few small birds, each carrying the red envelope slowly from one country to the other, only its
// own way showing (faint and dotted, gone behind it as it passes), a ripple once on the profile where it lands — a
// picture of the journey, not where a letter is (nothing about a letter changes when its bird lands). A place in
// `focus` (a profile picked): only the ways to and from it, clearly; everything else holds still. Country level only — never a real location. Same props and
// gestures as the 2D GlobeMap (its fallback without WebGL).
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { geoDistance, geoInterpolate } from 'd3-geo';
import { FLIGHT_S, loadWorld, type MapGroup, type MapRoute } from './CatMap';
import { aim, buildEarth, rad, vec } from './earthScene';

/** a letter's journey to show: country to country (its places stand for the countries), yours a little brighter */
export type Journey = { key: string; a: { lon: number; lat: number }; b: { lon: number; lat: number }; mine?: boolean; onTap?: () => void };

type Props = {
  groups: MapGroup[];
  home?: { lon: number; lat: number } | null;
  routes?: MapRoute[];
  height: number | string;
  bubble?: number;
  onSelect?: (cc: string) => void;
  /** a bubble tapped — one place, or several close together at this zoom: which ones (the globe turns to it, no
   *  zooming; whoever's there is listed by the caller). Without it, a tap zooms in until they split, as before. */
  onCluster?: (ccs: string[]) => void;
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
  /** a way to look at (a cat pal picked): the globe turns and zooms so both ends are in view — or, the same country
   *  at both ends, close in on it. While it's set the globe doesn't turn by itself; dragging is yours. */
  aimAt?: { a: { lon: number; lat: number }; b: { lon: number; lat: number } } | null;
  /** cat profiles on the globe (the two ends of the way picked): their photo in a round frame, their name under it */
  /** zooming in past the globe's closest: hand on to the close-up map (where the globe's middle is) */
  onZoomPast?: (at: { lon: number; lat: number }) => void;
  pins?: { key: string; lon: number; lat: number; photo: string; name: string; mine?: boolean; ring?: string; active?: boolean; dx?: number; onTap?: () => void }[];
  /** letters on their way: a few at a time (at most `maxBirds`, setting off at different times), each a bird taking about
   *  `journeyS` s (20–40 s, by how far) along its curve; tap one for what it is (`onTap`) */
  journeys?: Journey[];
  journeyS?: number;
  maxBirds?: number;
  /** the word under an example profile's marker (one that's only examples) */
  exampleTag?: string;
  /** a profile picked: only the ways to and from here show (clearly), the birds hold still, the other ways fade */
  focus?: { lon: number; lat: number } | null;
  /** the latest letter's flight is a bird carrying it (not the envelope alone) */
  flightBird?: boolean;
  /** a tap on the globe itself (not on a profile or a bird) */
  onBlankTap?: () => void;
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
/** the bird with the envelope in its beak (six wing poses, looping slowly), and where in the picture the envelope is
 *  (what rides the curve); yours a little bigger */
const BIRD = { src: './assets/map/bird-letter-slow.webp', still: './assets/map/bird-letter-still.webp', ratio: 127 / 160, at: [0.8074, 0.5393] as const, w: 30, wMine: 38 };
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;


export default function GlobeMap3D({ groups, home, routes = [], height, bubble = 50, onSelect, selected, controlsBottom = 12, zoomButtons = true, flight = null, onFlightStart, hover = null, aimAt = null, pins = [], onZoomPast, onCluster, journeys = [], journeyS = 30, maxBirds = 4, exampleTag = 'Example', focus: focusAt = null, flightBird = false, onBlankTap }: Props) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const bubbleEls = useRef<(HTMLDivElement | null)[]>([]), pinEls = useRef<(HTMLDivElement | null)[]>([]);
  const homeEl = useRef<HTMLDivElement>(null), flightEl = useRef<HTMLDivElement>(null);
  const birdEls = useRef<(HTMLDivElement | null)[]>([]), rippleEls = useRef<(HTMLDivElement | null)[]>([]);
  /** what each bird is carrying now (index into journeys, -1: none): for a tap on it */
  const birdOf = useRef<number[]>([]);
  const [world, setWorld] = useState<any>(null);
  const [k, setK] = useState(1);                       // zoom (React state: drives clustering)
  // facing the letter's way when there is one (where the turn starts if it's about to fly, else its middle), else your place
  const mid = flight ? geoInterpolate([flight.a.lon, flight.a.lat], [flight.b.lon, flight.b.lat])(flight.play && !reduceMotion() ? VIEW[0] : 0.5) : null;
  const st = useRef({ rot: (mid ? [-mid[0], clamp(-(mid[1] - VIEW_TILT), -70, 70)] : hover ? [-hover.lon, clamp(-(hover.lat - VIEW_TILT), -70, 70)] : [-(home ? home.lon : 127), -20]) as [number, number], k: 1, w: 0, h: 0, drag: false, idleAt: 0, tween: null as any });

  useEffect(() => { loadWorld().then(setWorld); }, []);

  // Cluster bubbles that would overlap at this zoom — by angular distance, so it doesn't depend on rotation.
  const clusters = useMemo(() => {
    const r = Math.min(st.current.w || 360, st.current.h || 600) * 0.44 * k;
    const out: { lon: number; lat: number; count: number; photo: string; active: boolean; members: MapGroup[]; example?: boolean; badge: number; mine: boolean }[] = [];
    for (const g of [...groups].sort((a, b) => b.count - a.count)) {
      const near = out.find((c) => geoDistance([c.lon, c.lat], [g.lon, g.lat]) * r < bubble * 0.9);
      if (near) { near.members.push(g); near.count += g.count; if (!near.photo && g.photo) near.photo = g.photo; near.active = near.active || !!g.active; near.example = near.example && !!g.example; near.badge += g.badge || 0; near.mine = near.mine || !!g.mine; }
      else out.push({ lon: g.lon, lat: g.lat, count: g.count, photo: g.photo, active: !!g.active, members: [g], example: !!g.example, badge: g.badge || 0, mine: !!g.mine });
    }
    return out;
  }, [groups, k, bubble]);
  const clustersRef = useRef(clusters); clustersRef.current = clusters;
  const live = useRef({ routes, home, flight, onFlightStart, hover, aimAt, pins, journeys, journeyS, maxBirds, focus: focusAt }); live.current = { routes, home, flight, onFlightStart, hover, aimAt, pins, journeys, journeyS, maxBirds, focus: focusAt };

  // a way picked: turn to its middle and zoom so both ends fit (a little south of it, as for the letter's flight);
  // one country at both ends: close in on it. Unpicked: back out to the whole globe. (A drag stops it there.)
  const fKey = aimAt ? [aimAt.a.lon, aimAt.a.lat, aimAt.b.lon, aimAt.b.lat].join(",") : "";
  useEffect(() => {
    const s = st.current, now = performance.now();
    if (!aimAt) { if (s.k > 1.01) s.tween = { t0: now, r0: [...s.rot], r1: [...s.rot], k0: s.k, k1: 1 }; s.idleAt = now; return; }
    const a: [number, number] = [aimAt.a.lon, aimAt.a.lat], b: [number, number] = [aimAt.b.lon, aimAt.b.lat], d = geoDistance(a, b);
    const [ml, mt] = d < 1e-4 ? a : geoInterpolate(a, b)(0.5);
    const k1 = d < 1e-4 ? MAX_ZOOM : clamp(0.78 / Math.max(0.05, Math.sin(d / 2)), 1, MAX_ZOOM);
    s.tween = { t0: now, r0: [...s.rot], r1: [((-ml - s.rot[0] + 540) % 360) - 180 + s.rot[0], clamp(-(mt - (d < 1e-4 ? 0 : VIEW_TILT)), -70, 70)], k0: s.k, k1 };
  }, [fKey]);

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
    const RED = new THREE.Color(0xff4b3e), BLUE = new THREE.Color(0x4c8fe0), PALE = new THREE.Color(0xf4efe6);
    let routeDots: THREE.InstancedMesh | null = null, routeKey = '', flightDots = 0;
    const buildRoutes = () => {
      const { routes: rs, home: hm, flight: fl } = live.current;
      const ways = [...(hm ? rs.map((r) => [[hm.lon, hm.lat], [r.lon, r.lat], r.dir]) : []), ...(fl ? [[[fl.a.lon, fl.a.lat], [fl.b.lon, fl.b.lat], 's']] : [])] as [[number, number], [number, number], string][];
      const fo = live.current.focus, near = (p: [number, number]) => !!fo && Math.abs(p[0] - fo.lon) < 0.01 && Math.abs(p[1] - fo.lat) < 0.01;
      const key = JSON.stringify([ways, fo]); if (key === routeKey) return; routeKey = key;
      if (routeDots) { earth.remove(routeDots); routeDots.dispose(); routeDots = null; }
      const pts: [THREE.Vector3, THREE.Color][] = [];
      flightDots = 0;
      for (const [w, [a, b, dir]] of ways.entries()) {
        const ip = geoInterpolate(a, b), n = Math.max(8, Math.round(geoDistance(a, b) / 0.03));
        const last = !!fl && w === ways.length - 1, cv = last ? curve(a, b) : null;   // the letter's way: a curve
        if (last) flightDots = n + 1;
        // (a profile picked: the ways not to or from it, pale)
        const pale = !!fo && !near(a) && !near(b);
        for (let i = 0; i <= n; i++) { const [lo, la] = ip(i / n), c = dir === 'r' ? BLUE : dir === 'b' && i % 2 ? BLUE : RED; pts.push([cv ? cv(i / n) : vec(lo, la, 1.012 + 0.03 * Math.sin((Math.PI * i) / n)), pale ? c.clone().lerp(PALE, 0.8) : c]); }
      }
      if (!pts.length) return;
      routeDots = new THREE.InstancedMesh(dotGeo, dotMat, pts.length);
      pts.forEach(([p, c], i) => { m4.compose(p, q.identity(), sc.set(1, 1, 1)); routeDots!.setMatrixAt(i, m4); routeDots!.setColorAt(i, c); });
      earth.add(routeDots);
    };

    // letters on their way: a few birds flying them — at different times, each over 20–40 s; landing, a ripple once on
    // the profile there and the bird fades. Each journey's way (faint, dotted: yours red, others a soft brown) shows only
    // while its bird is on it, the part behind the bird gone (its dots in order from the far end: drawing `count` of
    // them leaves out what's been flown) — or, a profile picked, all of each way to and from it
    const jDotGeo = keep(new THREE.SphereGeometry(0.0042, 8, 6));
    const MINE = new THREE.Color(0xff4b3e), THEIRS = new THREE.Color(0xb48a6c);
    let jWays: THREE.InstancedMesh[] = [], jKey = '', jCurves: ((t: number) => THREE.Vector3)[] = [], jDist: number[] = [], jMid: [number, number][] = [];
    const dropWays = () => { for (const w of jWays) { earth.remove(w); w.dispose(); (w.material as THREE.Material).dispose(); } jWays = []; };
    const atFocus = (p: { lon: number; lat: number }) => { const fo = live.current.focus; return !!fo && Math.abs(p.lon - fo.lon) < 0.01 && Math.abs(p.lat - fo.lat) < 0.01; };
    type Slot = { j: number; t0: number; dur: number; next: number; ang: number; flip: number; ripple: number; at: { lon: number; lat: number } | null };
    let slots: Slot[] = [], clock = 0, turn = 0;
    const buildJourneys = () => {
      const js = live.current.journeys || [], n = Math.max(1, Math.min(6, live.current.maxBirds || 4));
      const key = JSON.stringify([n, js.map((j) => [j.key, j.a.lon, j.a.lat, j.b.lon, j.b.lat, !!j.mine])]); if (key === jKey) return; jKey = key;
      dropWays();
      jCurves = js.map((j) => curve([j.a.lon, j.a.lat], [j.b.lon, j.b.lat])); jDist = js.map((j) => geoDistance([j.a.lon, j.a.lat], [j.b.lon, j.b.lat]));
      jMid = js.map((j) => geoInterpolate([j.a.lon, j.a.lat], [j.b.lon, j.b.lat])(0.5) as [number, number]);
      jWays = js.map((j, i) => {
        const m = Math.max(10, Math.round(jDist[i] / 0.035));
        const mesh = new THREE.InstancedMesh(jDotGeo, new THREE.MeshBasicMaterial({ color: j.mine ? MINE : THEIRS, transparent: true, opacity: 0, depthWrite: false }), m - 1);
        for (let k = 1; k < m; k++) { m4.compose(jCurves[i]((m - k) / m), q.identity(), sc.set(1, 1, 1)); mesh.setMatrixAt(k - 1, m4); }
        mesh.visible = false; earth.add(mesh); return mesh;
      });
      // the birds: set off one after another, a second or so apart, the first soon
      slots = Array.from({ length: n }, (_, i) => ({ j: -1, t0: 0, dur: 0, next: clock + 400 + i * 1300, ang: 0, flip: 1, ripple: -1e9, at: null }));
      birdOf.current = slots.map(() => -1); turn = 0;
      for (const el of birdEls.current) if (el) el.style.opacity = '0';
    };
    /** which journey a bird takes next: yours and others' in turn (yours first), never one another bird is on — one on
     *  the side of the globe you're looking at, if there is one (so the birds are seen) */
    const nextJourney = () => {
      const js = live.current.journeys || [], mine = js.map((j, i) => (j.mine ? i : -1)).filter((i) => i >= 0), theirs = js.map((j, i) => (j.mine ? -1 : i)).filter((i) => i >= 0);
      const order: number[] = []; for (let i = 0; i < Math.max(mine.length, theirs.length); i++) { if (i < mine.length) order.push(mine[i]); if (i < theirs.length) order.push(theirs[i]); }
      const free = (j: number) => jDist[j] > 0.02 && !slots.some((s) => s.j === j);
      for (const seen of [true, false]) for (let k = 0; k < order.length; k++) {
        const j = order[(turn + k) % order.length];
        if (free(j) && (!seen || screenOf(jMid[j][0], jMid[j][1], 1.01, -0.2).front)) { turn = (turn + k + 1) % order.length; return j; }
      }
      return -1;
    };
    const placeBird = (i: number) => {
      const node = birdEls.current[i], sl = slots[i], js = live.current.journeys || [];
      if (!node) return;
      if (sl.j < 0 || !js[sl.j]) { node.style.opacity = '0'; node.style.pointerEvents = 'none'; return; }
      const u = still ? 0.5 : clamp((clock - sl.t0) / sl.dur, 0, 1), e = 0.5 - 0.5 * Math.cos(Math.PI * u), cvj = jCurves[sl.j];
      const w = cvj(e), r = w.length(), p = screenAt(w, (1 - r * r) / camera.position.length());
      const p2 = screenAt(cvj(Math.min(1, e + 0.01)), 0), dx = p2.x - p.x, dy = p2.y - p.y;
      const seen = p.front && p.x > -80 && p.x < st.current.w + 80 && p.y > -80 && p.y < st.current.h + 80;
      if (!seen) { node.style.opacity = '0'; node.style.pointerEvents = 'none'; return; }   // behind the earth or off screen: not drawn
      if (Math.abs(dx) > 0.4) sl.flip = dx < 0 ? -1 : 1;                                    // facing the way it goes
      const ang = clamp((Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI, -16, 16) * sl.flip;
      sl.ang += (ang - sl.ang) * (still ? 1 : 0.06);                                        // turning smoothly
      const fade = still ? 1 : Math.min(1, u / 0.05, (1 - u) / 0.07), mine = !!js[sl.j].mine;
      node.style.opacity = String(fade * (mine ? 1 : 0.88)); node.style.pointerEvents = fade > 0.3 ? 'auto' : 'none';
      node.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${sl.ang}deg) scaleX(${sl.flip})`;
    };
    /** each journey's way: its bird's (what's still ahead of it), or — a profile picked — all of it if it's to or from there */
    const drawWays = (focused: boolean) => {
      const js = live.current.journeys || [];
      jWays.forEach((mesh, j) => {
        const mat = mesh.material as THREE.MeshBasicMaterial, n = mesh.instanceMatrix.count, sl = slots.find((x) => x.j === j);
        if (focused) { const on = !!js[j] && (atFocus(js[j].a) || atFocus(js[j].b)); mesh.visible = on; mesh.count = n; mat.opacity = 0.75; return; }
        if (!sl) { mesh.visible = false; return; }
        const u = still ? 0 : clamp((clock - sl.t0) / sl.dur, 0, 1), e = 0.5 - 0.5 * Math.cos(Math.PI * u);
        mesh.visible = true; mesh.count = still ? n : Math.round((1 - e) * n); mat.opacity = 0.5 * (still ? 1 : Math.min(1, u / 0.06));
      });
    };
    const flyJourneys = (dt: number) => {
      if (!slots.length) return;
      const js = live.current.journeys || [], focused = !!live.current.focus;
      drawWays(focused);
      if (!still && !focused) clock += dt;   // (a hidden tab draws no frames, a profile picked holds them: the birds wait)
      slots.forEach((sl, i) => {
        if (!still && sl.j >= 0 && clock - sl.t0 >= sl.dur) {
          // landed: a ripple on the profile there, the bird gone; another sets off a little later
          sl.at = js[sl.j] ? js[sl.j].b : null; sl.ripple = clock; sl.j = -1; birdOf.current[i] = -1;
          sl.next = clock + 1500 + Math.random() * 3500;
          const rp = rippleEls.current[i]; if (rp) { rp.classList.remove('is-on'); void rp.offsetWidth; rp.classList.add('is-on'); }
        }
        if (sl.j < 0 && !focused && (still ? true : clock >= sl.next)) {
          const j = still ? (i < js.length ? i : -1) : nextJourney();
          if (j >= 0) {
            const d = jDist[j], base = (live.current.journeyS || 30) * 1000;
            Object.assign(sl, { j, t0: clock, dur: base * clamp(0.75 + d / 4, 0.7, 1.3), ang: 0 });
            birdOf.current[i] = j;
            const node = birdEls.current[i], img = node?.firstElementChild as HTMLElement | null, bw = js[j].mine ? BIRD.wMine : BIRD.w, bh = bw * BIRD.ratio;
            if (node && img) { node.classList.toggle('is-mine', !!js[j].mine); Object.assign(img.style, { width: bw + 'px', height: bh + 'px', left: -BIRD.at[0] * bw + 'px', top: -BIRD.at[1] * bh + 'px' }); }
          } else if (!still) sl.next = clock + 2000;
        }
        placeBird(i);
        // (a profile picked: only the birds on its ways stay in view, holding still)
        if (focused && sl.j >= 0 && js[sl.j] && !atFocus(js[sl.j].a) && !atFocus(js[sl.j].b)) { const nd = birdEls.current[i]; if (nd) { nd.style.opacity = '0'; nd.style.pointerEvents = 'none'; } }
        // the ripple follows its profile as the globe turns, while it lasts
        const rp = rippleEls.current[i];
        if (rp && sl.at) {
          if (clock - sl.ripple > 1400) { rp.style.opacity = '0'; sl.at = null; }
          else { const q2 = screenOf(sl.at.lon, sl.at.lat, 1.01, 0.06); rp.style.opacity = q2.front ? '1' : '0'; rp.style.transform = `translate(${q2.x}px, ${q2.y - bubble / 2 - 9}px)`; }
        }
      });
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
        const u = Math.min(1, (now - s.tween.t0) / (live.current.aimAt ? 760 : 520)), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        s.rot = [s.tween.r0[0] + (s.tween.r1[0] - s.tween.r0[0]) * e, s.tween.r0[1] + (s.tween.r1[1] - s.tween.r0[1]) * e];
        s.k = s.tween.k0 + (s.tween.k1 - s.tween.k0) * e;
        if (u >= 1) { s.tween = null; setK(s.k); }
      } else if (!still && !s.drag && now - s.idleAt > 2500 && !flying && !holding && !live.current.aimAt) s.rot = [s.rot[0] + dt * 0.004, s.rot[1]];
      const { w, h } = s, R = Math.min(w, h) * 0.44 * s.k;
      const d = Math.sqrt(1 + Math.pow(h / 2 / (Math.tan((FOV / 2) * rad) * R), 2));
      camera.position.set(0, 0, d); camera.lookAt(0, 0, 0); camDir.set(0, 0, 1);
      aim(earth, s.rot);
      if (!still) for (const vl of veils) vl.m.rotation.y += dt * vl.speed;
      earth.updateMatrixWorld(true);
      buildRoutes(); buildJourneys();
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
      (live.current.pins || []).forEach((pn, i) => {
        const node = pinEls.current[i]; if (!node) return;
        const p = screenOf(pn.lon, pn.lat, 1.012, 0.02);
        node.style.opacity = p.front ? '1' : '0'; node.style.pointerEvents = p.front ? 'auto' : 'none'; node.style.transform = `translate(${p.x + (pn.dx || 0)}px, ${p.y}px)`;
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
        const cvf = curve([fl.a.lon, fl.a.lat], [fl.b.lon, fl.b.lat]), w = cvf(e2), r = w.length();
        const p = screenAt(w, (1 - r * r) / camera.position.length());   // riding its dotted curve (up in the air: hidden only behind the earth's own horizon)
        let turnTo = '';
        if (flightBird) {   // the bird facing the way it goes (still, once it has landed)
          const p2 = screenAt(cvf(Math.min(1, e2 + 0.01)), 0), dx = p2.x - p.x, flip = dx < 0 ? -1 : 1;
          turnTo = ` rotate(${clamp((Math.atan2(p2.y - p.y, Math.abs(dx)) * 180) / Math.PI, -16, 16) * flip}deg) scaleX(${flip})`;
        }
        flightEl.current.style.opacity = p.front ? '1' : '0'; flightEl.current.style.transform = `translate(${p.x}px, ${p.y}px)` + turnTo;
      }
      flyJourneys(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro && ro.disconnect();
      if (routeDots) routeDots.dispose();
      dropWays();
      for (const x of trash) x.dispose();
      renderer.dispose();
    };
  }, [world]);

  // gestures: drag turns the globe, pinch / wheel zooms
  const pts = useRef(new Map<number, { x: number; y: number }>()), moved = useRef(0);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(), f = box.current!.offsetWidth / r.width || 1; return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f }; };
  const past = useRef(false), onPast = useRef(onZoomPast); onPast.current = onZoomPast;
  const zoomBy = (f: number) => {
    const s = st.current;
    // already as close as the globe goes, and still zooming in: on to the close-up map (once per gesture)
    if (s.k >= MAX_ZOOM - 0.01 && f > 1.01 && onPast.current && !past.current) {
      past.current = true;
      onPast.current({ lon: ((-s.rot[0] + 540) % 360) - 180, lat: clamp(-s.rot[1], -80, 80) });
      setTimeout(() => { past.current = false; }, 900);
    }
    s.k = clamp(s.k * f, 1, MAX_ZOOM); setK(s.k); s.idleAt = performance.now();
  };
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
    if (onCluster) {
      s.tween = { t0: performance.now(), r0: [...s.rot], r1: [-c.lon, clamp(-c.lat, -70, 70)], k0: s.k, k1: s.k };
      s.idleAt = performance.now() + 4000;
      onCluster(c.members.map((m) => m.cc)); return;
    }
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
    <div ref={box} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} onClick={() => { if (moved.current <= 6) onBlankTap?.(); }}
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
              <div style={{ width: '100%', height: '100%', borderRadius: s * 0.3, overflow: 'hidden', border: '3px solid ' + (c.mine ? '#FF4B3E' : '#fff'), boxSizing: 'border-box', boxShadow: '0 6px 14px rgba(40,30,20,.25)', background: '#EFE7DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.photo ? <img src={c.photo} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <span style={{ fontSize: s * 0.45 }}>🐱</span>}
              </div>
              <div style={{ position: 'absolute', left: '50%', bottom: -7, marginLeft: -6, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #fff' }} />
              {/* someone there here right now (the app open — Realtime presence): the small red dot — still, top right (top
                  left when the unread badge has the right) */}
              {c.active ? <span aria-label="active" style={{ position: 'absolute', ...(c.badge ? { left: -4 } : { right: -4 }), top: -4, width: 12, height: 12, borderRadius: 6, background: '#FF4B3E', border: '2px solid #fff', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} /> : null}
              {/* only example profiles here: said so, under it */}
              {c.example ? <span style={{ position: 'absolute', left: '50%', top: '100%', marginTop: 9, transform: 'translateX(-50%)', padding: '1px 6px', borderRadius: 7, background: 'rgba(255,255,255,.9)', boxShadow: '0 1px 3px rgba(0,0,0,.12)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 9.5, color: '#8E8A84', whiteSpace: 'nowrap' }}>{exampleTag}</span> : null}
              {/* letters from them not read yet (My letters only: given only there) */}
              {c.badge > 0 ? <span style={{ position: 'absolute', right: -7, top: -7, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#E5483D', color: '#fff', border: '2px solid #fff', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.badge > 99 ? '99+' : c.badge}</span> : null}
            </div>
          </div>
        );
      })}
      {pins.map((pn, i) => (
        /* a cat profile at one end of the way: its photo in a round frame (red ring: you), its name under it */
        <div key={pn.key} ref={(n) => { pinEls.current[i] = n; }} onClick={(e) => { e.stopPropagation(); if (moved.current <= 6) pn.onTap?.(); }} role={pn.onTap ? 'button' : undefined} aria-label={pn.name}
          style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, willChange: 'transform', zIndex: 5, transition: 'opacity .2s ease' }}>
          <div style={{ position: 'absolute', left: -27, top: -66, width: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: pn.onTap ? 'pointer' : 'default' }}>
            <div style={{ position: 'relative', width: 50, height: 50 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', border: '3px solid ' + (pn.ring || (pn.mine ? '#FF4B3E' : '#fff')), boxSizing: 'border-box', boxShadow: '0 6px 14px rgba(40,30,20,.25)', background: '#EFE7DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pn.photo ? <img src={pn.photo} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <span style={{ fontSize: 22 }}>🐱</span>}
              </div>
              {/* active lately: a small red dot on the frame */}
              {pn.active ? <span aria-label="active" className="cp-active-dot" style={{ position: 'absolute', right: 1, top: 1, width: 12, height: 12, borderRadius: 6, background: '#FF4B3E', border: '2px solid #fff', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} /> : null}
            </div>
            <span style={{ marginTop: 3, padding: '1px 7px', borderRadius: 8, background: 'rgba(255,255,255,.94)', boxShadow: '0 1px 3px rgba(0,0,0,.12)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10.5, color: '#22304A', whiteSpace: 'nowrap' }}>{pn.name}</span>
          </div>
        </div>
      ))}
      {/* letters on their way: a few birds (each one's ripple, where it lands, under it) — tap one for what it is */}
      {!aimAt && journeys.length ? Array.from({ length: Math.max(1, Math.min(6, maxBirds)) }, (_, i) => (
        <div key={'j' + i}>
          <div ref={(n) => { rippleEls.current[i] = n; }} className="cp-map-ripple" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none', zIndex: 3 }}><i /></div>
          <div ref={(n) => { birdEls.current[i] = n; }} className="cp-map-bird" role="button" aria-label="letter on its way"
            onClick={(e) => { e.stopPropagation(); if (moved.current > 6) return; const j = birdOf.current[i]; if (j >= 0) journeys[j]?.onTap?.(); }}
            style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none', willChange: 'transform, opacity', zIndex: 4, cursor: 'pointer' }}>
            <img src={reduceMotion() ? BIRD.still : BIRD.src} alt="" draggable={false} style={{ position: 'absolute', width: BIRD.w, height: BIRD.w * BIRD.ratio, left: -BIRD.at[0] * BIRD.w, top: -BIRD.at[1] * BIRD.w * BIRD.ratio }} />
          </div>
        </div>
      )) : null}
      {(flight || hover) && !aimAt ? (flightBird ? (
        /* the letter: carried by the bird (the envelope in its beak riding the curve) */
        <div ref={flightEl} aria-hidden="true" className="cp-map-bird is-mine" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none', willChange: 'transform', zIndex: 4 }}>
          <img src={reduceMotion() ? BIRD.still : BIRD.src} alt="" draggable={false} style={{ position: 'absolute', width: BIRD.wMine, height: BIRD.wMine * BIRD.ratio, left: -BIRD.at[0] * BIRD.wMine, top: -BIRD.at[1] * BIRD.wMine * BIRD.ratio }} />
        </div>
      ) : (
        /* the letter: the landing story's red envelope (the one the bird carries) — not over a way's two cats */
        <div ref={flightEl} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 40, height: 25, marginLeft: -20, marginTop: -12, opacity: 0, pointerEvents: 'none', willChange: 'transform', zIndex: 4 }}>
          <img src="./assets/onboarding-preview/envelope-closed.png" alt="" draggable={false} style={{ display: 'block', width: '100%', height: '100%', transform: 'rotate(-8deg)', filter: 'drop-shadow(0 3px 4px rgba(40,20,20,.35))' }} />
        </div>
      )) : null}
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
