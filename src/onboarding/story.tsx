// The Cat Pal onboarding story — what the service is, one step (and one line) at a time:
//
//   1 · "Snap a photo of your cat."  The camera takes yours (focus, OK, a flash, the print).
//   2 · "Add a little note about their day."  The photo and a quick note go in the envelope; it's sealed.
//   3 · "Send a letter to a cat lover abroad!"  The star bird swoops it over the globe from Seoul to New York,
//       where a new friend pops up.
//   4 · "Make friends from other countries!"  The world turns; more cat friends appear, city by city, linked up
//       — all the way round and back to you. Then the page goes on to the app by itself (OnboardingPreview).
//
// <StoryStage> lays out the pieces (stage units); buildStory() makes the GSAP timeline that tells it.
import type { MutableRefObject, ReactNode } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ASSETS, COPY, DESTINATION, GLOBE_VIEW as V, NATURAL, ORIGIN, PLACES, SPOTS, TIMING as T, unsplashCrop, type Layout } from './config';
import { cobeProject, type GlobeControl } from '@/components/ui/globe';
import DottedGlobe, { type GlobeView } from './DottedGlobe';
import { lazy, Suspense } from 'react';

/** the app's pastel earth (the Map's), loaded with three.js as the story starts; without WebGL, the dotted globe */
const PastelGlobe = lazy(() => import('./PastelGlobe'));
let webgl: boolean | null = null;
const hasWebGL = () => {
  if (webgl === null) { try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webgl = false; } }
  return webgl;
};

gsap.registerPlugin(MotionPathPlugin);
gsap.config({ nullTargetWarn: false });

/** the route's two ends on the globe (the peach comes from DottedGlobe) */
export const BASE_MARKERS = [
  { location: [ORIGIN.lat, ORIGIN.lon] as [number, number], size: 0.07 },
  { location: [DESTINATION.lat, DESTINATION.lon] as [number, number], size: 0.07 },
];
/** the way east from Seoul to the destination: longitude and latitude eased across, bowed north (V.bow) */
const lonEnd = DESTINATION.lon < ORIGIN.lon ? DESTINATION.lon + 360 : DESTINATION.lon;
const along = (t: number): [number, number] => [ORIGIN.lon + (lonEnd - ORIGIN.lon) * t, ORIGIN.lat + (DESTINATION.lat - ORIGIN.lat) * t + V.bow * Math.sin(Math.PI * Math.min(1, Math.max(0, t)))];
/** small dots along the way, shown up to where the bird has flown: red, as the letter's way on the Map (on the pastel
 *  earth); white on the dotted globe (its fallback), where white reads on the black */
const TRAIL_RGB: [number, number, number] = typeof document !== 'undefined' && hasWebGL() ? [0.9, 0.29, 0.24] : [1, 1, 1];
const TRAIL = Array.from({ length: V.trail }, (_, i) => { const [lon, lat] = along((i + 0.5) / V.trail); return { location: [lat, lon] as [number, number], size: 0.018, color: TRAIL_RGB }; });
const NOTE_WORDS = COPY.note.body.split(' ');
/** scene 3 turns on from New York, east, all the way round to Seoul; this is how far along each friend is met */
const AROUND = { from: DESTINATION.lon, to: ORIGIN.lon > DESTINATION.lon ? ORIGIN.lon : ORIGIN.lon + 360, lat: 24 };
const metAt = (lon: number) => Math.max(0, Math.min(1, (((lon - AROUND.from + 360) % 360) || 360) / (AROUND.to - AROUND.from)));

export type Story = ReturnType<typeof geometry>;
/** what drives the globe: cobe's turn and markers, how far along the route the letter is, and (at the very end) where it's drawn */
export type StoryGlobe = GlobeControl & { route: number; view?: GlobeView; box?: { x: number; y: number } };
/** the globe's starting turn (a little before Seoul) */
export const globeStart = (G: Story): StoryGlobe => ({ ...G.rotAt(G.view(0) - V.preTurn), route: 0, markers: BASE_MARKERS, view: undefined, box: undefined });

/** Everything derived from a layout: the envelope rig, the papers that go in, the flight, the way round. */
export function geometry(L: Layout) {
  const s1 = L.scene1;
  const EW = s1.envelope.w, EH = (EW * NATURAL.envOpen.h) / NATURAL.envOpen.w, FOLD = SPOTS.fold * EH;
  const e = { x: L.W / 2, y: s1.envelope.y }, envTop = e.y - EH / 2;
  /** a paper that lives in the rig: its size, and the GSAP `y` (its top edge in the rig) for each pose. To go
   *  in it first shrinks to fit (still above the envelope), then slides straight down between the back and
   *  the front pocket, so no edge pokes out. */
  const paper = (frac: number, nat: { w: number; h: number }, top: number) => {
    const w = frac * EW, h = (w * nat.h) / nat.w, s = (0.8 * EW) / w;
    return { w, h, s, at: (y: number) => y - envTop - h / 2, above: FOLD - (h * (1 + s)) / 2 - EH * 0.06, inside: FOLD + top * h * s - (h * (1 - s)) / 2 };
  };
  const photo = paper(s1.paper.photo, NATURAL.photo, s1.inserted.photo), note = paper(s1.paper.note, NATURAL.note, s1.inserted.note);
  // scene 1: the camera, and where on it the print first appears: over its screen, at the screen's size
  const cw = s1.camera.w, camH = (cw * NATURAL.camera.h) / NATURAL.camera.w, sc = SPOTS.cameraScreen;
  const shot = { x: ((sc.left + sc.right) / 2 - 0.5) * cw, y: s1.camera.y + ((sc.top + sc.bottom) / 2 - 0.5) * camH, s: ((sc.right - sc.left) * cw * 1.04) / photo.w };

  // scene 2: the globe (PastelGlobe — the app's earth — or DottedGlobe, both drawn with cobe's projection). It faces the point of the route the
  // view has reached (`tilt` further south), so as the route goes 0 → 1 the world turns from Seoul east.
  const g = L.scene2.globe;
  // (the view follows the route's longitude, but only a little of its bow, so the curve shows on screen)
  const rotAt = (t: number) => { const [lon, lat0] = along(t), lat = lat0 - V.bow * 0.7 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))); return { phi: 1.5 * Math.PI - (lon * Math.PI) / 180, theta: ((lat - V.tilt) * Math.PI) / 180 }; };
  /** where the view looks when the letter is at `route` (a little ahead, then a little behind) */
  const view = (route: number) => V.lead + (1 - 2 * V.lead) * route;
  /** scene 3: the view at t of the way round (0 = as it ended on New York, 1 = back on Seoul), easing into a level view */
  const end = rotAt(view(1)), phiFrom = 1.5 * Math.PI - (AROUND.from * Math.PI) / 180, thetaTo = ((AROUND.lat - V.tilt) * Math.PI) / 180;
  // how far the flight's last view is from New York, the shorter way round (so easing it out never spins the world)
  const dPhi = ((((end.phi - phiFrom + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const roundAt = (t: number) => {
    const lon = AROUND.from + (AROUND.to - AROUND.from) * t, settle = Math.min(1, t * 4);
    return { phi: 1.5 * Math.PI - (lon * Math.PI) / 180 + dPhi * (1 - settle), theta: end.theta + (thetaTo - end.theta) * settle };
  };
  const toStage = (p: { x: number; y: number; depth: number }) => ({ x: g.x - g.w / 2 + p.x * g.w, y: g.y - g.w / 2 + p.y * g.w, depth: p.depth });
  /** a place on the globe, in stage coordinates, for a rotation (lift = height above the surface) */
  const at = (r: { phi: number; theta: number }, lon: number, lat: number, lift?: number) => toStage(cobeProject(lat, lon, r.phi, r.theta, lift));
  // the bird flies the route itself — from Seoul to New York, a little above the surface — while the world
  // turns beneath it; it glides in from the left to take the envelope over Seoul, and flies on out after New York
  const bw = L.scene2.bird.w, bh = (bw * NATURAL.bird.h) / NATURAL.bird.w, lt = SPOTS.letter;
  /** the letter's centre relative to the bird's centre (before the bird tilts) */
  const letter = { x: (lt.x - 0.5) * bw, y: (lt.y - 0.5) * bh, w: lt.w * bw, r: lt.r };
  /** where the letter is on the route at u (0 = Seoul, 1 = New York), with the globe turned as it is then */
  const onRoute = (u: number) => at(rotAt(view(u)), ...along(u), L.scene2.lift);
  const P0 = onRoute(0);
  // the closed envelope rises to meet the beak over Seoul, shrinking to the letter's size; it scales about the closed part's centre
  const closedY = SPOTS.closed.top + SPOTS.closed.height / 2, envS = letter.w / (SPOTS.closed.width * EW);
  const toBeak = { x: P0.x - e.x, y: P0.y - (e.y + (closedY - 0.5) * EH) };
  return { e, EW, EH, FOLD, photo, note, camH, shot, rotAt, view, roundAt, at, g, letter, onRoute, P0, bw, bh, closedY, envS, toBeak };
}

/** The story's pieces on the stage (stage units). Children go in among them. */
export function StoryStage({ L, G, globe, children }: { L: Layout; G: Story; globe: MutableRefObject<StoryGlobe>; children?: ReactNode }) {
  const s1 = L.scene1, s2 = L.scene2;
  const labels: (HTMLDivElement | null)[] = [], pulses: Record<'from' | 'to', HTMLSpanElement | null> = { from: null, to: null };
  const friends: (HTMLDivElement | null)[] = [], locals: (HTMLDivElement | null)[] = [], links: (SVGPathElement | null)[] = [];
  // every frame: pin the labels, pulses and friends to their places on the turning globe, and draw the links between friends
  const onFrame = () => {
    const s = globe.current, seen = (d: number) => Math.max(0, Math.min(1, (d - 0.12) / 0.25));
    // at the very end the globe is drawn by its `view` (in its box, at `box` on the stage): places follow it there
    const v = s.view, b = s.box;
    const where = (lon: number, lat: number) => {
      if (!v || !b) return G.at(s, lon, lat);
      // (lifted as at the start, less and less as it grows, so the pins sit on the horizon's surface)
      const p = cobeProject(lat, lon, s.phi, s.theta, 0.05 * Math.min(1, (0.4 * G.g.w) / v.r)), S = v.r / 0.4;
      return { x: b.x + v.x + (p.x - 0.5) * S, y: b.y + v.y + (p.y - 0.5) * S, depth: p.depth };
    };
    const pin = (el: HTMLElement | null, lon: number, lat: number) => {
      if (!el) return null;
      const a = where(lon, lat);
      el.style.left = `${a.x}px`; el.style.top = `${a.y}px`; el.style.setProperty('--seen', String(seen(a.depth)));
      return a;
    };
    PLACES.forEach((pl, i) => pin(labels[i], pl.lon, pl.lat));
    for (const [k, c] of [['from', ORIGIN], ['to', DESTINATION]] as const) pin(pulses[k], c.lon, c.lat);
    const pts = COPY.friends.map((f, i) => pin(friends[i], f.lon, f.lat));
    if (v) COPY.locals.forEach((f, i) => pin(locals[i], f.lon, f.lat));
    COPY.links.forEach(([a, b], i) => {
      const el = links[i], A = pts[a], B = pts[b]; if (!el || !A || !B) return;
      // a gentle arc, bowed away from the globe's centre
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = mx - G.g.x, dy = my - G.g.y, dl = Math.hypot(dx, dy) || 1, k = Math.hypot(B.x - A.x, B.y - A.y) * 0.32;
      el.setAttribute('d', `M${A.x},${A.y} Q${mx + (dx / dl) * k},${my + (dy / dl) * k} ${B.x},${B.y}`);
      el.style.setProperty('--seen', String(Math.min(seen(A.depth), seen(B.depth))));
    });
  };
  const box = (x: number, y: number, w: number, extra?: object) => ({ left: x, top: y, width: w, ...extra });
  const pct = (v: number) => `${v * 100}%`;
  const closed = SPOTS.closed, sc = SPOTS.cameraScreen, ok = SPOTS.cameraOk;

  return (
    <>
      {/* ---- scenes 2–3: the globe, and the friends on it (under everything that moves) */}
      <div className="ob-globe" style={box(s2.globe.x, s2.globe.y, s2.globe.w, { height: s2.globe.w })}>
        {hasWebGL() ? <Suspense fallback={null}><PastelGlobe control={globe} onFrame={onFrame} /></Suspense> : <DottedGlobe control={globe} onFrame={onFrame} />}
      </div>
      <svg className="ob-links" viewBox={`0 0 ${L.W} ${L.H}`} width={L.W} height={L.H} aria-hidden="true">
        {COPY.links.map((_, i) => <path key={i} ref={(el) => { links[i] = el; }} className="ob-link" />)}
      </svg>
      {(['from', 'to'] as const).map((k) => <span key={k} ref={(el) => { pulses[k] = el; }} className={`ob-pulse ob-pulse-${k}`} />)}
      {PLACES.map((pl, i) => (
        <div key={pl.name} ref={(el) => { labels[i] = el; }} className="ob-label-pin">
          <span className={`ob-label ob-label-${pl.key} ob-label-key`}>{pl.name}</span>
        </div>
      ))}
      {COPY.friends.map((f, i) => (
        <div key={i} ref={(el) => { friends[i] = el; }} className="ob-friend-pin">
          <div className={`ob-friend ob-friend-${i}`}>
            <img src={f.id ? unsplashCrop(f.id, 120, 120) : ASSETS.photo} alt="" draggable={false} />
            <span>{f.name} {f.flag}</span>
          </div>
        </div>
      ))}
      {/* the cat lovers who pop up on the horizon at the very end */}
      {COPY.locals.map((f, i) => (
        <div key={i} ref={(el) => { locals[i] = el; }} className="ob-friend-pin">
          <div className="ob-friend ob-local">
            <img src={unsplashCrop(f.id, 120, 120)} alt="" draggable={false} />
            <span>{f.name} {f.flag}</span>
          </div>
        </div>
      ))}
      {children}

      {/* ---- scene 1: the camera, its live view (your cat) on the screen */}
      <div className="ob-cam" style={box(L.W / 2, s1.camera.y, s1.camera.w, { height: G.camH })}>
        <img className="ob-cam-body" src={ASSETS.camera} alt="" draggable={false} />
        <div className="ob-cam-screen" style={{ left: pct(sc.left), top: pct(sc.top), width: pct(sc.right - sc.left), height: pct(sc.bottom - sc.top) }}>
          <div className="ob-cam-view"><img src={ASSETS.photo} alt="" draggable={false} /></div>
          <div className="ob-cam-corners"><i /><i /><i /><i /></div>
          <span className="ob-cam-focus" />
          <span className="ob-cam-blink" />
        </div>
        <span className="ob-cam-ok" style={{ left: pct(ok.x), top: pct(ok.y), width: pct(ok.d) }} />
      </div>

      <span className="ob-tag ob-you-tag" style={{ left: L.W / 2, top: s1.you.y + G.photo.h / 2 + 12 }}>{COPY.you}</span>

      {/* ---- the envelope rig: back · the hello and your photo going in · front pocket · flaps · closed */}
      <div className="ob-env" style={box(G.e.x, G.e.y, G.EW, { height: G.EH })}>
        <img className="ob-env-back ob-fill" src={ASSETS.envOpen} alt="" />
        <img className="ob-env-flapup ob-fill" src={ASSETS.envOpen} alt="" style={{ clipPath: `inset(0 0 ${(1 - SPOTS.fold) * 100}% 0)` }} />
        <div className="ob-note" style={{ left: (G.EW - G.note.w) / 2, width: G.note.w, height: G.note.h, ['--nw' as string]: `${G.note.w}px` }}>
          <p className="ob-note-to">{COPY.note.to}</p>
          <p className="ob-note-body">
            {NOTE_WORDS.map((w, i) => <span key={i} className="ob-word">{[...w].map((c, j) => <span key={j} className="ob-ch">{c}</span>)}{i < NOTE_WORDS.length - 1 ? ' ' : ''}</span>)}
          </p>
          <p className="ob-note-from">{COPY.note.from}</p>
        </div>
        <img className="ob-photo" src={ASSETS.photo} alt="" style={{ left: (G.EW - G.photo.w) / 2, width: G.photo.w, height: G.photo.h }} />
        <img className="ob-env-front" src={ASSETS.envFront} alt="" style={{ top: pct(SPOTS.frontTop), height: pct(NATURAL.envFront.h / NATURAL.envOpen.h) }} />
        <img className="ob-env-flapdown ob-fill" src={ASSETS.envOpen} alt="" style={{ clipPath: `inset(0 0 ${(1 - SPOTS.fold) * 100}% 0)` }} />
        <img className="ob-env-closed" src={ASSETS.envClosed} alt="" style={{ left: pct(closed.left), top: pct(closed.top), width: pct(closed.width), height: pct(closed.height) }} />
      </div>

      {/* ---- the star bird carrying the letter */}
      <div className="ob-bird" style={{ width: s2.bird.w, height: G.bh }}>
        {/* twelve wing poses side by side, stepped through by CSS (see .ob-bird-frame) */}
        <div className="ob-bird-frame" style={{ backgroundImage: `url(${ASSETS.bird})` }} />
      </div>

      <div className="ob-flash" />
    </>
  );
}

/** Builds the story's timeline (call inside a gsap.context scoped to the page). */
export function buildStory(root: HTMLElement, L: Layout, G: Story, gs: StoryGlobe) {
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  const env = $('.ob-env'), photo = $('.ob-photo'), note = $('.ob-note'), bird = $('.ob-bird');
  const friends = COPY.friends.map((_, i) => $(`.ob-friend-${i}`)), links = gsap.utils.toArray<SVGPathElement>('.ob-link');
  const steps = gsap.utils.toArray<HTMLElement>('.ob-step'), dots = gsap.utils.toArray<HTMLElement>('.ob-dot');
  const s1 = L.scene1;
  // the progress dots' colours come from the page's palette (--dot / --dot-on)
  const css = getComputedStyle(root), dotOff = css.getPropertyValue('--dot').trim() || '#C9CED8', dotOn = css.getPropertyValue('--dot-on').trim() || '#22304A';

  // ---- resting state
  gsap.set(['.ob-cam', env, '.ob-globe', '.ob-final'], { xPercent: -50, yPercent: -50 });
  gsap.set('.ob-cam', { opacity: 0, scale: 0.94, y: 0 });
  gsap.set('.ob-cam-corners', { scale: 1.14, opacity: 0 });
  gsap.set('.ob-cam-focus', { scale: 1.5, opacity: 0 });
  gsap.set('.ob-cam-view img', { scale: 1.2, x: 8 });
  gsap.set(['.ob-cam-blink', '.ob-cam-ok', '.ob-flash'], { opacity: 0 });
  gsap.set('.ob-you-tag', { xPercent: -50, opacity: 0, y: 6 });
  gsap.set(photo, { x: G.shot.x, y: G.photo.at(G.shot.y), scale: G.shot.s, rotation: 0, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(note, { x: 0, y: G.note.at(s1.paper.y) + 24, scale: 0.92, rotation: 2, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(['.ob-ch', '.ob-note-to', '.ob-note-from'], { opacity: 0 });
  gsap.set(['.ob-env-back', '.ob-env-front'], { opacity: 0, y: 36 });
  gsap.set(['.ob-env-flapup', '.ob-env-flapdown', '.ob-env-closed'], { opacity: 0 });
  gsap.set('.ob-env-flapup', { transformOrigin: `50% ${SPOTS.fold * 100}%`, transformPerspective: 700, rotationX: 0 });
  gsap.set('.ob-env-flapdown', { transformOrigin: `50% ${SPOTS.fold * 100}%`, transformPerspective: 700, rotationX: 90 });
  gsap.set('.ob-env-back', { clipPath: 'inset(0% 0% 0% 0%)' });
  gsap.set(env, { transformOrigin: '50% 100%', opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 });
  gsap.set('.ob-globe', { opacity: 0, y: L.H * 0.45, scale: 0.9 });
  gsap.set(bird, { x: -G.bw * 0.7 - G.letter.x, y: G.P0.y - G.letter.y, xPercent: -50, yPercent: -50, opacity: 0, rotation: 0, scale: 1 });
  gsap.set([...friends, ...gsap.utils.toArray<HTMLElement>('.ob-local')], { scale: 0, opacity: 0 });
  gsap.set(links, { '--on': 0 });
  // until it takes the envelope the bird's own letter is hidden (the corner of the frame it sits in is cut away)
  const cl = SPOTS.letter.clip, empty = `polygon(0 0, 100% 0, 100% ${cl.top * 100}%, ${cl.left * 100}% ${cl.top * 100}%, ${cl.left * 100}% 100%, 0 100%)`;
  const full = 'polygon(0 0, 100% 0, 100% 0%, 100% 0%, 100% 100%, 0 100%)';
  gsap.set('.ob-bird-frame', { clipPath: empty });
  Object.assign(gs, globeStart(G));
  const turn = { t: G.view(0) - V.preTurn }, follow = () => Object.assign(gs, G.rotAt(turn.t));   // the globe follows the route
  let shown = 0;
  const trail = () => { const n = Math.round(gs.route * V.trail); if (n !== shown) { shown = n; gs.markers = n ? [...BASE_MARKERS, ...TRAIL.slice(0, n)] : BASE_MARKERS; } };
  gsap.set('.ob-pulse', { opacity: 0, scale: 0.5 });
  gsap.set('.ob-label', { opacity: 0, scale: 0.6 });
  gsap.set('.ob-final', { opacity: 0, y: 12 });
  gsap.set(steps, { opacity: 0, y: 8 });
  gsap.set(dots, { width: 6, backgroundColor: dotOff });
  gsap.set('.ob-dots', { opacity: 0 });

  // the bird's wings beat on their own (a CSS sprite animation); `still` holds one pose (reduced motion)
  const still = () => { $('.ob-bird-frame').style.animation = 'none'; };

  const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
  /** the scene's title and line (and the progress dots) move on to scene i, at `at` */
  const scene = (i: number, at: string) => {
    if (i) tl.to(steps[i - 1], { opacity: 0, y: -6, duration: 0.3, ease: 'power2.in' }, at).to(dots[i - 1], { width: 6, backgroundColor: dotOff, duration: 0.4 }, at);
    tl.to(steps[i], { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, `${at}+=0.2`).to(dots[i], { width: 18, backgroundColor: dotOn, duration: 0.45, ease: 'back.out(2)' }, at);
  };
  /** a paper goes into the envelope, as by hand: it straightens and shrinks to fit as it lines up over the opening,
   *  slips down into the pocket (quicker as it goes, the two moves running into each other), lands a touch deep and
   *  settles; the envelope takes it — a little dip and give, papers and all — and springs back */
  const putIn = (el: HTMLElement, p: typeof G.photo, at: string) => tl
    .to(el, { scale: p.s, rotation: 0, y: p.above, duration: T.shrink, ease: 'power2.inOut' }, at)
    .to(el, { y: p.inside + 5, duration: T.insert, ease: 'power2.in' }, '>-0.12')
    .addLabel('landed')
    .to(el, { y: p.inside, duration: 0.3, ease: 'power2.out' }, 'landed')
    .to(env, { y: 4, scaleY: 0.975, scaleX: 1.012, duration: 0.12, ease: 'power2.out' }, 'landed')
    .to(env, { y: 0, scaleY: 1, scaleX: 1, duration: 0.55, ease: 'elastic.out(1, 0.55)' }, 'landed+=0.12');
  /** a friend pops up on the globe, with a little bounce; a link draws in between two friends */
  const meet = (i: number, at: number) => tl.to(friends[i], { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }, at);
  const link = (i: number, at: number) => tl.to(links[i], { '--on': 1, duration: 0.6, ease: 'power2.out' }, at);

  // ========== 1 · Snap a photo of your cat. — the camera takes yours
  tl.addLabel('s2', 0.1).to('.ob-dots', { opacity: 1, duration: 0.5, ease: 'none' }, 0.1);
  scene(0, 's2');
  tl.to('.ob-cam', { opacity: 1, scale: 1, duration: T.cameraIn, ease: 'back.out(1.6)' }, 's2+=0.2')
    // the live view drifts a little, the camera finds focus
    .to('.ob-cam-view img', { scale: 1.14, x: 0, duration: 1.3, ease: 'sine.out' }, 's2+=0.3')
    .to('.ob-cam-corners', { opacity: 1, scale: 1, duration: T.focus, ease: 'elastic.out(1, 0.55)' }, 's2+=0.65')
    .to('.ob-cam-focus', { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, 's2+=0.85')
    // OK — click — the screen flashes white — the print comes out of it
    .addLabel('snap', 's2+=1.55')
    .to('.ob-cam-ok', { opacity: 1, scale: 0.86, duration: T.shutter, ease: 'power2.in', yoyo: true, repeat: 1 }, 'snap')
    .to('.ob-cam', { y: 3, duration: T.shutter, ease: 'power2.in', yoyo: true, repeat: 1 }, 'snap')
    .to(['.ob-cam-blink', '.ob-flash'], { opacity: (i) => (i ? 0.55 : 1), duration: 0.06, ease: 'none' }, `snap+=${T.shutter}`)
    .set(photo, { opacity: 1 }, '>')
    .to(['.ob-cam-blink', '.ob-flash'], { opacity: 0, duration: T.flash, ease: 'power2.out' }, '<')
    .to('.ob-cam', { opacity: 0, y: G.camH * 0.2, scale: 0.94, duration: 0.5, ease: 'power2.in' }, '<+=0.15')
    // here's your cat
    .addLabel('you', '<')
    .to(photo, { x: 0, y: G.photo.at(s1.you.y), scale: 1, rotation: -3, duration: T.print, ease: 'back.out(1.6)' }, 'you')
    .to('.ob-you-tag', { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 'you+=0.35');

  // ========== 2 · Add a little note about their day. — the photo and the note go in the envelope, sealed
  tl.addLabel('s3n', 'you+=1.3');
  scene(1, 's3n');
  tl.to('.ob-you-tag', { opacity: 0, duration: 0.3 }, 's3n')
    .to(['.ob-env-back', '.ob-env-front'], { opacity: 1, y: 0, duration: T.envIn, ease: 'back.out(1.5)' }, 's3n+=0.2')
    .to(photo, { x: 0, y: G.photo.at(s1.paper.y), scale: 1, rotation: -3, duration: T.toPaper, ease: 'power3.inOut' }, 's3n+=0.25');
  putIn(photo, G.photo, `s3n+=${0.25 + T.toPaper + 0.1}`);
  tl.addLabel('note', '>+=0.1')
    .to(note, { y: G.note.at(s1.paper.y), opacity: 1, scale: 1, rotation: 2, duration: T.noteIn, ease: 'back.out(1.6)' }, 'note')
    .to('.ob-note-to', { opacity: 1, duration: 0.3, ease: 'none' }, 'note+=0.4')
    .to('.ob-ch', { opacity: 1, duration: 0.1, ease: 'none', stagger: T.perChar }, 'note+=0.65')
    .to('.ob-note-from', { opacity: 1, duration: 0.3, ease: 'none' }, '>+=0.1');
  putIn(note, G.note, '>+=0.3');
  tl.set('.ob-env-back', { clipPath: `inset(${SPOTS.fold * 100}% 0% 0% 0%)` }, '>').set('.ob-env-flapup', { opacity: 1, rotationX: 0 }, '<')
    .to('.ob-env-flapup', { rotationX: 90, duration: T.flapUp, ease: 'sine.in' })
    .set('.ob-env-flapup', { opacity: 0 }).set('.ob-env-flapdown', { opacity: 1, rotationX: 90 }, '<')
    .to('.ob-env-flapdown', { rotationX: 179.5, duration: T.flapDown, ease: 'power3.out' })
    .to('.ob-env-closed', { opacity: 1, duration: 0.22, ease: 'sine.inOut' }, '>-0.14')
    .to(['.ob-env-back', '.ob-env-front', '.ob-env-flapdown', photo, note], { opacity: 0, duration: 0.22, ease: 'sine.inOut' }, '<')
    .to(env, { scaleX: 1.03, scaleY: 0.955, y: 2, duration: 0.13, ease: 'power2.out' }, '<+=0.06')
    .to(env, { scaleX: 1, scaleY: 1, y: 0, duration: T.squash, ease: 'elastic.out(1, 0.5)' })

  // ========== 3 · Send a letter to a cat lover abroad! — the bird takes it across the world
    .addLabel('s4', '>-0.4');
  scene(2, 's4');
  tl
    // from here the envelope turns and scales about its closed part's centre
    .addLabel('globe', 's4').set(env, { transformOrigin: `50% ${G.closedY * 100}%` }, 'globe')
    .to('.ob-globe', { opacity: 1, y: 0, scale: 1, duration: T.sceneIn, ease: 'back.out(1.15)' }, 'globe')
    .fromTo(turn, { t: G.view(0) - V.preTurn }, { t: G.view(0), duration: 0.1 + T.toSeoul, ease: 'sine.out', onUpdate: follow, immediateRender: false }, 'globe')
    .to('.ob-label', { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', stagger: 0.1 }, 'globe+=0.55');
  // the flight: in from the left at Seoul's height, then along the route to New York, then on out of the picture
  const S = tl.labels.globe, turned = S + 0.1 + T.toSeoul;      // the globe has settled on Seoul
  const pick = turned + 0.2, start = pick - T.enter, arrive = pick + T.flight, end = arrive + T.leave;
  // the bird swoops down from high up to Seoul (where it scoops up the envelope), then flies the curved route
  // itself — the dotted line drawing out right behind it — to New York, then up and away
  const top = L.text.dots + G.bh * 0.68;   // the dive starts clear of the scene's title and line
  const diveH = Math.min(L.H * V.dive, Math.max(0, G.P0.y - top)), inDist = G.P0.x + G.bw * 0.9;
  /** the letter on the route (u: 0 = Seoul, 1 = New York), at the head of the dotted line */
  const flown = (u: number) => G.onRoute(u);
  // how it's moving as it lands in New York (it carries on that way, then lifts up and away)
  const ee = 0.01, F1 = flown(1), Fb = flown(1 - ee), vx = (F1.x - Fb.x) / (ee * T.flight), vy = (F1.y - Fb.y) / (ee * T.flight);
  /** the letter's position at time t (a pure function, so the bird's heading can be read from it) */
  const letterAt = (t: number) => {
    let p: { x: number; y: number };
    if (t <= pick) { const f = Math.max(0, (t - start) / T.enter); p = { x: G.P0.x - inDist * (1 - f), y: G.P0.y - diveH * (1 - f) * (1 - f) }; }
    else if (t <= arrive) p = flown((t - pick) / T.flight);
    else { const k = t - arrive, up = (Math.abs(vy) * 1.6) / T.leave; p = { x: F1.x + Math.max(vx, 120) * k, y: F1.y + vy * 0.35 * k - up * k * k }; }   // a short dip, then up
    return { x: p.x, y: p.y + Math.sin(((t - start) / T.bob) * Math.PI * 2) * G.bh * 0.02 };   // and a little flutter
  };
  const glide = { t: start };
  const place = () => {
    const t = glide.t, p = letterAt(t), a = letterAt(t - 0.12), b = letterAt(t + 0.12);
    // the body points the way it flies (gently), and the letter stays on the route
    const ang = Math.max(-38, Math.min(38, (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI)), rad = (ang * Math.PI) / 180;
    const ox = G.letter.x * Math.cos(rad) - G.letter.y * Math.sin(rad), oy = G.letter.x * Math.sin(rad) + G.letter.y * Math.cos(rad);
    gsap.set(bird, { x: p.x - ox, y: p.y - oy, rotation: ang, scale: 1 - (t > arrive ? (t - arrive) / T.leave : 0) * 0.2 });
    if (t >= turned && t <= arrive + 0.05) {
      // the world turns beneath: Seoul at pick-up → New York at delivery
      gs.route = Math.max(0, Math.min(1, (t - pick) / T.flight));
      turn.t = G.view(gs.route); follow(); trail();
    }
  };
  tl.addLabel('fly', pick).addLabel('arrive', arrive)
    .to(bird, { opacity: 1, duration: 0.5, ease: 'none' }, start)
    .fromTo(glide, { t: start }, { t: end, duration: end - start, ease: 'none', immediateRender: false, onUpdate: place }, start)
    // the envelope rises from the middle to meet the beak over Seoul
    .to(env, {
      motionPath: { path: [{ x: 0, y: 0 }, { x: G.toBeak.x * 0.5, y: G.toBeak.y * 0.5 - 30 }, { x: G.toBeak.x, y: G.toBeak.y }], curviness: 1 },
      scale: G.envS, rotation: G.letter.r, duration: pick - (S + 0.1), ease: 'power1.inOut',
    }, S + 0.1)
    .set(env, { opacity: 0 }, pick).set('.ob-bird-frame', { clipPath: full }, pick)
    .fromTo('.ob-pulse-from', { opacity: 0.8, scale: 0.4 }, { opacity: 0, scale: 2.6, duration: 0.9, ease: 'power2.out', immediateRender: false }, pick - 0.1)
    // a new friend, there where it lands
    .fromTo('.ob-pulse-to', { opacity: 0.8, scale: 0.4 }, { opacity: 0, scale: 2.8, duration: 1, ease: 'power2.out', immediateRender: false }, arrive)
    .to('.ob-label', { opacity: 0, scale: 0.8, duration: 0.3, ease: 'power2.in' }, arrive);
  meet(0, arrive + 0.05);
  link(0, arrive + 0.3);
  tl.to(bird, { opacity: 0, duration: 1, ease: 'power1.in' }, end - 1);

  // ========== 4 · Make friends from other countries! — friends appear all the way round, back to you
  tl.addLabel('s3', arrive + 1.2);
  scene(3, 's3');
  const round = { t: 0 }, S3 = tl.labels.s3 + 0.3;
  tl.fromTo(round, { t: 0 }, { t: 1, duration: T.around, ease: 'sine.inOut', immediateRender: false, onUpdate: () => Object.assign(gs, G.roundAt(round.t)) }, S3);
  // each friend pops up as they come round to the front (sine.inOut: the time the turn reaches f of the way)
  const timeAt = (f: number) => S3 + (Math.acos(1 - 2 * f) / Math.PI) * T.around;
  COPY.friends.forEach((f, i) => {
    if (!i) return;
    const tm = timeAt(Math.max(0.02, metAt(f.lon) - 0.12));
    meet(i, tm);
    COPY.links.forEach(([a, b], k) => { if (k && Math.max(a, b) === i) link(k, tm + 0.25); });
  });
  // a short hold on the friends, all linked up (the page then zooms into the globe and on to the app)
  tl.to({}, { duration: 1.0 }, S3 + T.around);

  return { tl, still };
}
