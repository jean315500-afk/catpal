// The landing page (/landing-preview, a first visit's first page): a few words and "Send your first letter" (to one
// cat lover, at random — said on the letter itself) from the first moment, beside (or, on a phone, under) a short example of
// a letter exchange that plays by itself — who it goes to, and what's in it:
//
//   1 · cat lovers' cats pop up on the globe, a country each (example places, at country level only)
//   2 · the camera closes in on her: the globe grows, the others drift off, and her profile opens into a phone's screen
//   3 · her day, on that phone: the grooming clip plays on its screen (silent, about 3 s; only inside the screen — the
//       phone frame lies over it); then the shutter: the white button gives a little, a short soft flash on the screen
//       only, and the clip stops on that very moment — the photo (held about 1.5 s). No hands; the phone never moves
//   4 · the photo (the letter's shape, cut from the screen as it was) lifts off the phone onto a letter, to whom it's
//       going above it (an example cat lover and their cat); two short lines, a little story and a question, under it
//   5 · the letter goes in the envelope, it's sealed; a little bird comes for it, and carries it slowly over the turning
//       globe to a cat far away (Korea → Canada, over the top of the world: seen from above the Arctic, from right to left)
//   6 · it lands in their mailbox (a new-letter mark), and the bird flies on, out of the picture — the end: it stays,
//       with "Replay" (it never jumps back to the start by itself)
//
// It's labelled as an example throughout (small, in its corner), so it never reads as real people's activity, and the flight is the whole
// journey in a few seconds, not an instant delivery. The button works at any point (the story needn't be watched).
// Reduced motion: the phone, still, on her (the clip's frame where it would start). The pieces are the app's own: the
// pastel globe, the red envelope, the wax seal, stamps and postmarks, the letter paper and type.
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { cobeArcPoint, cobeProject } from '@/components/ui/globe';
import DottedGlobe, { type DottedControl } from './DottedGlobe';
import { ASSETS, LANDING_LANG, NATURAL, SPOTS, unsplashCrop } from './config';
import { saveLang } from '../community/lang';
import { distanceKm } from '../community/countries';

gsap.registerPlugin(MotionPathPlugin);
const PastelGlobe = lazy(() => import('./PastelGlobe'));
let webgl: boolean | null = null;
const hasWebGL = () => {
  if (webgl === null) { try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webgl = false; } }
  return webgl;
};

const KO = LANDING_LANG === 'ko';
const WORDS = KO ? {
  title: '세계의 고양이 집사들을 만나보세요.', desc: '고양이 사진으로 나누는 일상, 새로운 친구.',
  cta: '첫 편지 보내기', example: '교환 예시', replay: '다시 보기', other: 'English',
  letter: ['토리는 제가 일할 때마다 키보드 위에 누워요.', '루나도 그런가요?'],
  steps: ['세계의 고양이 친구들', '우리 고양이의 오늘', '사진 한 장과 짧은 편지', '새가 편지를 전해 줘요'],   // (once it has landed: no caption, the new-letter mark says it)
  from: '대한민국', to: '캐나다', km: 'km',
  newLetter: '새 편지', me: '토리', toCat: '루나', toWho: '루나와 집사 Alex', toIntro: '창가 구경을 좋아하는 루나와 캐나다에 살아요.'
} : {
  title: 'Meet cat lovers worldwide.', desc: 'Swap cat photos. Make a new friend.',
  cta: 'Send your first letter', example: 'Preview', replay: 'Replay', other: '한국어',
  letter: ['Tori lies on my keyboard every time I work.', 'Does Luna do that too?'],
  steps: ['Cat friends around the world', 'Your cat’s day', 'One photo, one short letter', 'A bird carries the letter'],
  from: 'Korea', to: 'Canada', km: ' km',
  newLetter: 'New letter', me: 'Tori', toCat: 'Luna', toWho: 'Luna & Alex', toIntro: 'Luna loves watching from the window. We live in Canada.'
};

/** the grooming clip (5.2 s, 540 × 960, silent): it plays from FROM for PLAY s, then the shutter; and its frame at FROM
 *  (while it loads, or if it can't play) */
const CLIP = '/assets/landing/grooming.mp4', POSTER = '/assets/landing/grooming-shot.jpg';
const CLIP_FROM = 2.1, CLIP_PLAY = 3, HOLD = 1.5;
/** her profile photo (Tori, the cat in the clip) */
const MOMO = '/assets/landing/momo.jpg';
const SEAL = '/assets/mailbox/wax-seal.webp', STAMP = '/assets/stamp-2.png', PM_FROM = '/assets/pm/seoul.png';

/** the cats on the globe — examples, at their country's capital (no one's real place); the first is the sender's,
 *  the last the one the letter goes to */
const CATS = [
  { key: 'me', name: WORDS.me, flag: '🇰🇷', lat: 37.57, lon: 126.98, photo: MOMO },
  { key: 'th', name: 'Mali', flag: '🇹🇭', lat: 13.75, lon: 100.5, photo: unsplashCrop('photo-1764708844823-00d2188dafd8', 120, 120) },
  { key: 'in', name: 'Chai', flag: '🇮🇳', lat: 28.61, lon: 77.21, photo: unsplashCrop('photo-1533738363-b7f9aef128ce', 120, 120) },
  { key: 'id', name: 'Ayu', flag: '🇮🇩', lat: -8.4, lon: 115.19, photo: unsplashCrop('photo-1592194996308-7b43878e84a6', 120, 120) },
  { key: 'au', name: 'Milo', flag: '🇦🇺', lat: -33.87, lon: 151.21, photo: unsplashCrop('photo-1514888286974-6c03e2ca1dba', 120, 120) },
  { key: 'ca', name: WORDS.toCat, flag: '🇨🇦', lat: 45.42, lon: -75.7, photo: unsplashCrop('photo-1574158622682-e40e69881006', 120, 120) },
];
/** who the letter goes to — an example cat lover, Alex, and their cat Luna, in Canada: far to the east, over the Pacific
 *  (on the globe's far side at first: the world turns to them as the bird flies) */
const FROM = CATS[0], TO = CATS.find((c) => c.key === 'ca')!;
/** how far it goes, capital to capital (the app's own measure): shown with the two countries over the flight */
const ROUTE_KM = (distanceKm('KR', 'CA') || 0).toLocaleString('en-US');

/** the demo's canvas (design units; scaled to its box) and where things sit on it */
const W = 360, H = 500;
const GLOBE = { x: 180, y: 278, w: 470 };   // wider than the screen, as on the story page before: the page's big globe
/** where the globe faces: at first (120° E, 4° N: the cats of Asia); as the bird sets off — from above the Arctic, the
 *  way over the top of the world (15° E, 66° N: Korea on the right, Canada on the left, so the bird flies right to
 *  left); and once it has turned a little, slowly, under the bird (38° E, 72° N) */
const facing = (lon: number, lat: number) => ({ phi: 1.5 * Math.PI - (lon * Math.PI) / 180, theta: (lat * Math.PI) / 180 });
const VIEW = facing(120, 4), VIEW_A = facing(15, 66), VIEW_B = facing(38, 72);
/** how high the way is lifted off the globe (a long way: higher, so it clears the curve) */
const ARC = 0.34;
/** the phone (iphone-frame.webp: its screen see-through), on the canvas between the label above and the caption below;
 *  its screen's opening in the frame's px — a few px wider than the glass, under the bezel, so no gap shows */
const FRAME = { src: '/assets/landing/iphone-frame.webp', w: 708, h: 1484 };
const FRAME_IN = { x: 39, y: 30, w: 630, h: 1425, r: 104 };
const PIN = 44;
/** the close-up: the world scaled about her place until she's here, this big */
const ZOOM = { k: 2.4, x: 180, y: 222 };
const PHONE = (() => { const h = 424, w = (h * FRAME.w) / FRAME.h; return { x: (W - w) / 2, y: 31, w, h }; })();
/** its screen on the canvas, and her face in it (the clip is a little wider than the screen) */
const SCR = { x: PHONE.x + (FRAME_IN.x / FRAME.w) * PHONE.w, y: PHONE.y + (FRAME_IN.y / FRAME.h) * PHONE.h, w: (FRAME_IN.w / FRAME.w) * PHONE.w, h: (FRAME_IN.h / FRAME.h) * PHONE.h };
const FOCUS = { x: 0.46, y: 0.5 };
const pct = (a: number, b: number) => (a / b) * 100 + '%';
/** the photo: the letter's shape (about 2 : 3), cut from the middle of the screen as it is at the shutter — where it lifts
 *  off from */
const SW = 210, SH = 310;
const rectQuad = (cx: number, cy: number, w: number, h: number): [number, number][] => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
const SHOT_Q = rectQuad(SCR.x + SCR.w / 2, SCR.y + SCR.h / 2, SCR.w, (SCR.w * SH) / SW);
/** the letter paper, and the photo on it (the screen's shape) */
const PAPER = { w: 218, h: 292, x: 180, y: 218 };
const PHOTO = { w: 104, h: 154, top: 18 };
const EW = 190, EH = (EW * NATURAL.envOpen.h) / NATURAL.envOpen.w, ENV = { x: 180, y: 312 };
const RIG = { left: ENV.x - EW / 2, top: ENV.y - EH / 2 };
const FOLD = SPOTS.fold * EH;
/** the closed envelope's middle (the envelope rig turns and scales about it) */
const CLOSED_Y = RIG.top + (SPOTS.closed.top + SPOTS.closed.height / 2) * EH;

/** the bird that carries the letter (bird-*.webp: six wing poses, looping): with no letter, and with the envelope in
 *  its beak. Drawn the same size (the letter's frame is wider: the envelope); each has its point — the beak, the
 *  envelope — where it's placed. It faces right in the art; flying west it's mirrored. */
const BIRD = {
  plain: { src: '/assets/landing/bird-plain.webp', still: '/assets/landing/bird-plain-still.webp', w: 60, h: 60 * (301 / 300), at: [0.9345, 0.4489] },
  letter: { src: '/assets/landing/bird-letter.webp', still: '/assets/landing/bird-letter-still.webp', w: 76, h: 76 * (239 / 300), at: [0.8074, 0.5393] },
};
/** the envelope in its beak: its width in the letter bird (for the hand-over), and the beak just left of it */
const BEAK_ENV = { w: 0.1933 * BIRD.letter.w, dx: (0.8074 - 0.7421) * BIRD.letter.w, dy: (0.5393 - 0.4949) * BIRD.letter.h };
/** the letter waits, and lands, a little above the cat's photo (not on it) */
const ABOVE = 36;

/** a CSS transform taking a w × h box onto a four-cornered shape (clockwise from top left): the screen's perspective */
function quadMatrix(w: number, h: number, q: [number, number][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, hh = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { const den = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den; }
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
}
/** where the photo lands: its place on the letter (the paper's own box, before it moves) */
const LAND: [number, number][] = (() => {
  const l = PAPER.x - PHOTO.w / 2, t = PAPER.y - PAPER.h / 2 + PHOTO.top;
  return [[l, t], [l + PHOTO.w, t], [l + PHOTO.w, t + PHOTO.h], [l, t + PHOTO.h]];
})();
/** the photo: the picture (the clip's frame now, or its still) cut as the screen shows it, there (SHOT_Q) */
function snapshot(src: CanvasImageSource, sw: number, sh: number) {
  const c = document.createElement('canvas'); c.width = SW * 3; c.height = SH * 3;
  const ctx = c.getContext('2d'); if (!ctx || !sw || !sh) return '';
  const s = Math.max(SCR.w / sw, SCR.h / sh), qh = (SCR.w * SH) / SW;   // (as the screen covers itself with it)
  ctx.drawImage(src, ((sw * s - SCR.w) * FOCUS.x) / s, ((sh * s - SCR.h) * FOCUS.y + (SCR.h - qh) / 2) / s, SCR.w / s, qh / s, 0, 0, c.width, c.height);
  try { return c.toDataURL('image/jpeg', 0.86); } catch { return ''; }
}

/** a place on the globe, on the canvas, as the globe faces `v` (depth > 0: on the side you see) */
const onGlobeAt = (lat: number, lon: number, v: { phi: number; theta: number }) => {
  const p = cobeProject(lat, lon, v.phi, v.theta);
  return { x: GLOBE.x - GLOBE.w / 2 + p.x * GLOBE.w, y: GLOBE.y - GLOBE.w / 2 + p.y * GLOBE.w, depth: p.depth };
};
const onGlobe = (lat: number, lon: number) => onGlobeAt(lat, lon, VIEW);
/** the way from one cat to the other (cobe's arc, lifted), on the canvas, as the globe faces `v` */
const arcOn = (v: { phi: number; theta: number }) => Array.from({ length: 41 }, (_, i) => {
  const p = cobeArcPoint([FROM.lat, FROM.lon], [TO.lat, TO.lon], i / 40, v.phi, v.theta, ARC);
  return { x: GLOBE.x - GLOBE.w / 2 + p.x * GLOBE.w, y: GLOBE.y - GLOBE.w / 2 + p.y * GLOBE.w };
});
const pathOf = (pts: { x: number; y: number }[]) => 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');

/** the canvas scaled to fit its box (width-led; the box keeps the canvas's shape) */
function useScale(box: MutableRefObject<HTMLDivElement | null>) {
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const on = () => setK(el.clientWidth / W || 1);
    on(); const ro = new ResizeObserver(on); ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return k;
}

const seen = () => { try { localStorage.setItem('cp-onboarded', '1'); } catch { /* private mode */ } };
const switchLang = () => { saveLang(KO ? 'en' : 'ko'); location.reload(); };

export default function Landing() {
  const box = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null);
  const k = useScale(box);
  const still = useMemo(() => typeof matchMedia === 'function' && (matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduce')), []);
  const [run, setRun] = useState(0), [done, setDone] = useState(false), [step, setStep] = useState(still ? 1 : 0);
  const globe = useRef<DottedControl>({ phi: VIEW.phi, theta: VIEW.theta, markers: [] });
  const pins = useMemo(() => CATS.map((c) => onGlobe(c.lat, c.lon)), []);
  // the flight: cobe's own arc from one capital to the other, lifted, as points on the canvas (as the globe first faces)
  const way = useMemo(() => arcOn(VIEW), []);
  const wayD = pathOf(way);

  useEffect(() => { try { document.documentElement.lang = LANDING_LANG; document.title = 'Cat Pal · ' + WORDS.title; } catch { /* no document */ } }, []);

  useLayoutEffect(() => {
    const root = stage.current!, v = video.current!;
    setDone(false); setStep(still ? 1 : 0);
    const $ = (s: string) => root.querySelector(s) as HTMLElement;
    const $$ = (s: string) => [...root.querySelectorAll(s)] as HTMLElement[];
    let waitT = 0, raf = 0;
    const ctx = gsap.context(() => {
      const fly = $('.ln-fly'), flyImg = $('.ln-fly img') as HTMLImageElement, photo = $('.ln-paper-photo img') as HTMLImageElement;
      const paper = $('.ln-paper'), rig = $('.ln-env'), flap = $('.ln-env-flap'), closed = $('.ln-env-closed');
      const pinEls = $$('.ln-pin'), lines = $$('.ln-line'), me = pinEls[0], to = pinEls[CATS.indexOf(TO)];
      const birdP = $('.ln-bird-plain'), birdL = $('.ln-bird-letter');
      // ---- resting state
      gsap.set('.ln-globe', { opacity: 0, scale: 0.96 });
      gsap.set(pinEls, { scale: 0, opacity: 0 });
      const p0 = pins[0], world = $('.ln-world'), phone = $('.ln-iphone'), poster = $('.ln-phone-poster') as HTMLImageElement;
      gsap.set(world, { x: 0, y: 0, scale: 1, transformOrigin: `${p0.x}px ${p0.y}px` }); gsap.set('.ln-globe-in', { filter: 'blur(0px)' });
      // the phone comes out of her profile (there, once the world has closed in on it: this small)
      const fromPin = { scale: (PIN * ZOOM.k) / PHONE.w, x: ZOOM.x - (PHONE.x + PHONE.w / 2), y: ZOOM.y - (PHONE.y + PHONE.h / 2) };
      gsap.set(phone, { opacity: 0, ...fromPin, transformOrigin: '50% 50%' });
      gsap.set(poster, { opacity: 1 }); gsap.set(['.ln-phone-flash', '.ln-phone-dim'], { opacity: 0 }); gsap.set('.ln-phone-shutter i', { scale: 1 });
      gsap.set(fly, { opacity: 0 }); gsap.set(photo, { opacity: 0 });
      const flyAt = { t: 0 };
      // the photo between the screen and its place on the letter: the shape eased from one to the other, lifted on the way
      const placeFly = () => {
        const t = flyAt.t, lift = Math.sin(Math.PI * t), q = SHOT_Q.map((pt, i) => [pt[0] + (LAND[i][0] - pt[0]) * t, pt[1] + (LAND[i][1] - pt[1]) * t] as [number, number]);
        const cx = q.reduce((s2, p) => s2 + p[0], 0) / 4, cy = q.reduce((s2, p) => s2 + p[1], 0) / 4, k2 = 1 + 0.07 * lift;
        fly.style.transform = quadMatrix(SW, SH, q.map(([x, y]) => [cx + (x - cx) * k2, cy + (y - cy) * k2 - 16 * lift] as [number, number]));
      };
      placeFly();
      gsap.set(paper, { opacity: 0, scale: 0.96, x: 0, y: 0 });
      gsap.set('.ln-to', { xPercent: -50, opacity: 0, y: 6 });
      gsap.set(lines, { opacity: 0, y: 6 });
      gsap.set(['.ln-env-back', '.ln-env-front', flap], { opacity: 0 });
      gsap.set(flap, { scaleY: 1, zIndex: 9 });
      gsap.set([closed, '.ln-env-dress'], { opacity: 0 });
      gsap.set(rig, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
      gsap.set('.ln-way', { opacity: 0 }); gsap.set('.ln-way-reveal', { strokeDashoffset: 1 });
      gsap.set(['.ln-badge', '.ln-newchip'], { scale: 0, opacity: 0 });
      gsap.set([birdP, birdL], { opacity: 0, x: 0, y: 0, rotation: 0 });
      gsap.set('.ln-routechip', { xPercent: -50, opacity: 0, y: -6 });
      v.pause(); try { v.currentTime = CLIP_FROM; } catch { /* not loaded yet */ }

      // the globe turns, slowly, while the bird flies: the cats on it, the way and the bird follow it every frame
      const view = globe.current; view.phi = VIEW.phi; view.theta = VIEW.theta;
      const wayEls = $$('.ln-way, .ln-way-reveal');
      let air = way.map((p) => ({ x: p.x, y: p.y - ABOVE }));
      const lifted = (v: { phi: number; theta: number }) => arcOn(v).map((p) => ({ x: p.x, y: p.y - ABOVE }));
      const sync = () => {
        CATS.forEach((c, i) => { const p = onGlobeAt(c.lat, c.lon, view); const el = pinEls[i]; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.visibility = p.depth > 0.04 ? '' : 'hidden'; });
        const arc = arcOn(view); air = arc.map((p) => ({ x: p.x, y: p.y - ABOVE }));
        const d = pathOf(arc); for (const el of wayEls) el.setAttribute('d', d);
      };
      sync();
      // the flight: along the way (a little above it, over the photos), the bird mirrored to face west; the envelope at
      // its beak's size for the hand-over; a slight tilt with the way (never steep) and a soft rise and fall
      const start = lifted(VIEW_A)[0], end = lifted(VIEW_B).pop()!;   // where it's taken (the world turned to set off), and left
      const FLIP = end.x < start.x ? -1 : 1;
      const flipX = (b: typeof BIRD.plain) => (FLIP < 0 ? (1 - b.at[0]) : b.at[0]) * b.w;
      const envS = BEAK_ENV.w / EW;
      const beakAt = { x: start.x - BEAK_ENV.dx * FLIP, y: start.y - BEAK_ENV.dy };
      gsap.set([birdP, birdL], { scaleX: FLIP, transformOrigin: '50% 50%' });
      const flight = { u: 0 };
      const others = pinEls.filter((el) => el !== me && el !== to);
      const placeBird = (u: number) => {
        const f = Math.min(air.length - 1.001, Math.max(0, u * (air.length - 1))), i = Math.floor(f), t = f - i;
        const a = air[i], b = air[i + 1], x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - Math.sin(u * Math.PI * 5) * 1.6;
        let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - (FLIP < 0 ? 180 : 0);
        ang = ((ang + 540) % 360) - 180;
        gsap.set(birdL, { x: x - flipX(BIRD.letter), y: y - BIRD.letter.at[1] * BIRD.letter.h, rotation: Math.max(-12, Math.min(12, ang * 0.5)) * Math.min(1, u * 6) });   // level as it takes the letter, then with the way
      };
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: () => setDone(true) });
      const label = (n: number) => () => setStep(n);
      // 1 · the cats of the world, one by one (the only springy motion: the profiles' pop)
      tl.call(label(0))
        .to('.ln-globe', { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' })
        .to(pinEls, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.28 }, 0.45)
        .to({}, { duration: 0.7 })
        // 2 · the camera closes in on her: the world grows about her place, the others drift off, the globe softens
        .call(label(1))
        .to(world, { scale: ZOOM.k, x: ZOOM.x - p0.x, y: ZOOM.y - p0.y, duration: 1.7, ease: 'power3.inOut' })
        .to('.ln-globe-in', { filter: 'blur(3px)', duration: 1.2, ease: 'power1.in' }, '<0.4')
        .to(pinEls.slice(1), { opacity: 0, duration: 0.8, ease: 'power1.in' }, '<')
        .to('.ln-globe', { opacity: 0.55, duration: 1.1 }, '<')
        .to('.ln-pin-me .ln-pin-name', { opacity: 0, duration: 0.4 }, '<0.3')
        // … and her profile opens into a phone's screen: her day on it (the clip plays, silent, about 3 s — held here
        // until the shutter)
        .to(phone, { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.15')
        .to(me, { opacity: 0, duration: 0.3 }, '<0.1')
        .to('.ln-globe', { opacity: 0.25, duration: 0.6 }, '<')
        .addPause('+=0.05', () => {
          let shot0 = false, fromStill = false;
          const take = (src: CanvasImageSource, w: number, h: number) => { const url = snapshot(src, w, h); if (url) { flyImg.src = url; photo.src = url; } };
          // the shutter: the clip stops on this very frame — the photo — and the story goes on (the button, the flash)
          const shoot = () => {
            if (shot0) return; shot0 = true; cancelAnimationFrame(raf); clearTimeout(waitT); v.onended = v.onplaying = v.onloadedmetadata = null; v.pause();
            if (fromStill) take(poster, poster.naturalWidth, poster.naturalHeight); else take(v, v.videoWidth, v.videoHeight);
            tl.resume();
          };
          // not able to play (autoplay blocked, too slow): its frame stays on, and the shutter goes after the same wait
          const fallback = () => { if (shot0) return; cancelAnimationFrame(raf); fromStill = true; gsap.set(poster, { opacity: 1 }); clearTimeout(waitT); waitT = window.setTimeout(shoot, CLIP_PLAY * 1000); };
          const start = () => {
            v.muted = true; try { v.currentTime = CLIP_FROM; } catch { /* not seekable yet */ }
            const pl = v.play();
            // watched every frame (timeupdate comes only a few times a second): the shutter goes right on time
            const watch = () => { if (shot0) return; if (v.currentTime >= CLIP_FROM + CLIP_PLAY) shoot(); else raf = requestAnimationFrame(watch); };
            raf = requestAnimationFrame(watch); v.onended = shoot;
            if (pl && pl.catch) pl.catch(fallback);
          };
          v.onplaying = () => { if (!fromStill) gsap.to(poster, { opacity: 0, duration: 0.3 }); };
          if (v.readyState >= 1) start(); else v.onloadedmetadata = start;
          waitT = window.setTimeout(() => { if (v.paused || v.readyState < 2) fallback(); }, 2500);
        })
        // … the white button gives a little, a soft flash on the screen only; the photo held a moment (about 1.5 s)
        .to('.ln-phone-shutter i', { scale: 0.86, duration: 0.11, ease: 'power1.out' }, '+=0.01')
        .to('.ln-phone-flash', { opacity: 0.72, duration: 0.07, ease: 'none' }, '<')
        .to('.ln-phone-flash', { opacity: 0, duration: 0.34, ease: 'power1.out' })
        .to('.ln-phone-shutter i', { scale: 1, duration: 0.22, ease: 'power2.out' }, '<')
        .to({}, { duration: HOLD - 0.34 })
        // 3 · the photo (the letter's shape) lifts off the screen onto a letter; the phone goes, the world comes back
        .call(label(2))
        .set(fly, { opacity: 1 })
        .to(flyAt, { t: 1, duration: 1.15, ease: 'power3.inOut', onUpdate: placeFly })
        .to('.ln-phone-dim', { opacity: 0.55, duration: 0.4, ease: 'power1.out' }, '<')   // the screen dims as the photo lifts off it
        .to(phone, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, '<0.2')
        .to(['.ln-globe', ...pinEls.slice(1)], { opacity: 0.12, duration: 0.7 }, '<')
        .to(paper, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, '<0.15')
        .to('.ln-to', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '<0.35')   // to whom: above the letter
        .to(world, { scale: 1, x: 0, y: 0, duration: 1.4, ease: 'power2.inOut' }, '<')
        .to('.ln-globe-in', { filter: 'blur(0px)', duration: 1.0 }, '<0.3')
        .set('.ln-pin-me .ln-pin-name', { opacity: 1 }, '<')
        .set(photo, { opacity: 1 })
        .set(fly, { opacity: 0 })
        .to(lines, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.45 })
        .to({}, { duration: 1.3 })
        // 4 · into the envelope; sealed (the world, faint behind, turns to where the bird will set off)
        .call(label(3))
        .to('.ln-to', { opacity: 0, y: -4, duration: 0.35 })
        .to(['.ln-env-back', '.ln-env-front', flap], { opacity: 1, duration: 0.45 }, '<')
        .to(view, { phi: VIEW_A.phi, theta: VIEW_A.theta, duration: 1.8, ease: 'sine.inOut', onUpdate: sync }, '<')
        .to(paper, { scale: 0.5, y: ENV.y - EH / 2 + 62 + (PAPER.h * 0.5) / 2 - PAPER.y, duration: 0.95, ease: 'power2.inOut' }, '<0.1')
        .set(flap, { zIndex: 13 })
        .to(flap, { scaleY: 0, duration: 0.28, ease: 'power1.in' })
        .set([closed, '.ln-env-dress'], { opacity: 1 })
        .set([paper, '.ln-env-back', '.ln-env-front', flap], { opacity: 0 })
        .to('.ln-env-seal', { scale: 1.12, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.out' })
        // … over the globe: only the two cats now, the letter's way between them. The envelope waits above her photo; a
        // bird comes for it, and carries it slowly along the way while the world turns beneath them
        .to('.ln-globe', { opacity: 1, duration: 0.6 }, '+=0.2')
        .to([me, to], { opacity: 1, duration: 0.5 }, '<')
        .to('.ln-routechip', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '<0.2')
        .to(others, { opacity: 0, scale: 0.7, duration: 0.5 }, '<')
        .to(rig, { scale: envS, x: start.x - ENV.x, y: start.y - CLOSED_Y, duration: 0.9, ease: 'power2.inOut' }, '<')
        .set(birdP, { opacity: 1, x: W + 40 - flipX(BIRD.plain), y: start.y - 46 - BIRD.plain.at[1] * BIRD.plain.h })
        .to(birdP, { x: beakAt.x - flipX(BIRD.plain), y: beakAt.y - BIRD.plain.at[1] * BIRD.plain.h, duration: 1.6, ease: 'power2.out' })
        // it takes the envelope in its beak
        .set(rig, { opacity: 0 })
        .set(birdP, { opacity: 0 })
        .set(birdL, { opacity: 1 })
        .call(placeBird, [0])
        .to('.ln-way', { opacity: 1, duration: 0.2 })
        .to(view, { phi: VIEW_B.phi, theta: VIEW_B.theta, duration: 6.0, ease: 'sine.inOut', onUpdate: sync }, '<')
        .to('.ln-way-reveal', { strokeDashoffset: 0, duration: 6.0, ease: 'sine.inOut' }, '<')
        .to(flight, { u: 1, duration: 6.0, ease: 'sine.inOut', onUpdate: () => placeBird(flight.u) }, '<')
        // 5 · there: it leaves the envelope in their mailbox — the new-letter mark — and flies on
        .call(label(4))
        .set(rig, { opacity: 1, scale: envS, x: end.x - ENV.x, y: end.y - CLOSED_Y })
        .set(birdL, { opacity: 0 })
        .set(birdP, { opacity: 1, x: end.x - BEAK_ENV.dx * FLIP - flipX(BIRD.plain), y: end.y - BEAK_ENV.dy - BIRD.plain.at[1] * BIRD.plain.h })
        .to(rig, { y: end.y + ABOVE - 10 - CLOSED_Y, scale: envS * 0.7, opacity: 0, duration: 0.5, ease: 'power2.in' })
        .to(birdP, { x: -130 - flipX(BIRD.plain), y: '-=40', duration: 2.6, ease: 'sine.in' }, '<0.1')
        .to(to, { scale: 1.16, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.out' }, '<0.35')
        .to(['.ln-badge', '.ln-newchip'], { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)' }, '<0.1')
        // … and the bird flies on, out of the picture: the end (gone as it leaves it)
        .set(birdP, { opacity: 0 }, '>1.75')
        .to({}, { duration: 0.6 });
      // reduced motion: one still scene instead — the phone on her (the clip's frame where it would start; callbacks
      // skipped: it never plays)
      if (still) {
        tl.progress(1, true); tl.pause();
        gsap.set([world, rig, birdP, birdL, fly, '.ln-routechip', '.ln-to'], { opacity: 0 });
        gsap.set(phone, { opacity: 1, scale: 1, x: 0, y: 0 }); gsap.set(poster, { opacity: 1 }); gsap.set(['.ln-phone-flash', '.ln-phone-dim'], { opacity: 0 });
        setStep(1); setDone(true);
      }
      if (import.meta.env.DEV) (window as any).__lnTl = tl;   // to look at a scene while working on it
    }, root);
    return () => { clearTimeout(waitT); cancelAnimationFrame(raf); v.onended = v.onplaying = v.onloadedmetadata = null; ctx.revert(); };
  }, [run, still, pins, way]);

  const replay = () => { const v = video.current; if (v) { v.pause(); try { v.currentTime = CLIP_FROM; } catch { /* fine */ } } setRun((n) => n + 1); };
  const toApp = (href: string) => (e: { preventDefault: () => void }) => { e.preventDefault(); seen(); location.href = href; };

  return (
    <main className="ln-page">
      <div className="ln-topbar"><button type="button" className="ob-btn ob-btn-small" onClick={switchLang} lang={KO ? 'en' : 'ko'}>{WORDS.other}</button></div>
      <div className="ln-wrap">
        {/* the words and the way in: there from the first moment, whatever the story is doing */}
        <section className="ln-hero">
          <h1 className="ln-title">{WORDS.title}</h1>
          <p className="ln-desc">{WORDS.desc}</p>
          <div className="ln-actions">
            <a className="ob-btn ob-btn-ink ln-cta" href="/?start=letter" onClick={toApp('/?start=letter')}>{WORDS.cta}</a>
          </div>
        </section>

        {/* the example: a letter exchange, told in five steps */}
        <section className="ln-demo" aria-label={WORDS.example}>
          <div className="ln-box" ref={box}>
            <div className="ln-stage" ref={stage} style={{ width: W, height: H, transform: `scale(${k})` }}>
              {/* the world: the globe, the way and the cats on it — one layer, so the camera can close in on her */}
              <div className="ln-world">
                <div className="ln-globe" style={{ left: GLOBE.x - GLOBE.w / 2, top: GLOBE.y - GLOBE.w / 2, width: GLOBE.w, height: GLOBE.w }}><div className="ln-globe-in">
                  {hasWebGL() ? <Suspense fallback={null}><PastelGlobe control={globe} /></Suspense> : <DottedGlobe control={globe} />}
                </div></div>
                <svg className="ln-route" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
                  {/* the way, dotted, drawn out behind the letter (a solid stroke in the mask reveals it) */}
                  <defs><mask id="ln-way-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}><path className="ln-way-reveal" d={wayD} pathLength={1} /></mask></defs>
                  <path className="ln-way" d={wayD} mask="url(#ln-way-mask)" />
                </svg>
                {CATS.map((c, i) => (
                  <div key={c.key} className={`ln-pin ln-pin-${c.key}`} style={{ left: pins[i].x, top: pins[i].y }}>
                    <img src={c.photo} alt="" draggable={false} />
                    <span className="ln-pin-name">{c.name} {c.flag}</span>
                    {c.key === TO.key ? <><span className="ln-badge">1</span><span className="ln-newchip">💌 {WORDS.newLetter}</span></> : null}
                  </div>
                ))}
              </div>

              {/* her day, on a phone: the clip on its screen (only inside it: the frame lies over it), the camera's one white
                  button, the shutter's soft flash — then the photo lifts off it */}
              <div className="ln-iphone" aria-hidden="true" style={{ left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h }}>
                <div className="ln-phone-screen" style={{ left: pct(FRAME_IN.x, FRAME.w), top: pct(FRAME_IN.y, FRAME.h), width: pct(FRAME_IN.w, FRAME.w), height: pct(FRAME_IN.h, FRAME.h), borderRadius: `${pct(FRAME_IN.r, FRAME_IN.w)} / ${pct(FRAME_IN.r, FRAME_IN.h)}` }}>
                  <video ref={video} src={CLIP} poster={POSTER} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} style={{ objectPosition: `${FOCUS.x * 100}% ${FOCUS.y * 100}%` }} />
                  <img className="ln-phone-poster" src={POSTER} alt="" style={{ objectPosition: `${FOCUS.x * 100}% ${FOCUS.y * 100}%` }} />
                  <span className="ln-phone-shutter"><i /></span>
                  <span className="ln-phone-dim" />
                  <span className="ln-phone-flash" />
                </div>
                <img className="ln-phone-frame" src={FRAME.src} alt="" draggable={false} />
              </div>
              {/* the bird: coming for the letter, carrying it, flying on */}
              <div className="ln-bird ln-bird-plain" aria-hidden="true" style={{ width: BIRD.plain.w, height: BIRD.plain.h }}><img src={still ? BIRD.plain.still : BIRD.plain.src} alt="" /></div>
              <div className="ln-bird ln-bird-letter" aria-hidden="true" style={{ width: BIRD.letter.w, height: BIRD.letter.h }}><img src={still ? BIRD.letter.still : BIRD.letter.src} alt="" /></div>
              {/* the photo, on its way out of the phone onto the letter */}
              <div className="ln-fly" aria-hidden="true" style={{ width: SW, height: SH }}><img src={POSTER} alt="" /></div>

              {/* the envelope: back · the letter going in · front pocket · flap · closed (with its seal, stamp, postmark) */}
              <div className="ln-env" style={{ left: RIG.left, top: RIG.top, width: EW, height: EH, transformOrigin: `50% ${(SPOTS.closed.top + SPOTS.closed.height / 2) * 100}%` }}>
                <img className="ln-env-back" src={ASSETS.envOpen} alt="" style={{ clipPath: `inset(${SPOTS.fold * 100}% 0 0 0)` }} />
                <img className="ln-env-flap" src={ASSETS.envOpen} alt="" style={{ clipPath: `inset(0 0 ${(1 - SPOTS.fold) * 100}% 0)`, transformOrigin: `50% ${FOLD}px` }} />
                {/* the letter: the photo (the frame the shutter caught) and two short lines */}
                <div className="ln-paper" style={{ left: PAPER.x - PAPER.w / 2 - RIG.left, top: PAPER.y - PAPER.h / 2 - RIG.top, width: PAPER.w, height: PAPER.h }}>
                  <div className="ln-paper-photo" style={{ width: PHOTO.w + 10, top: PHOTO.top - 5 }}><img src={POSTER} alt="" style={{ width: PHOTO.w, height: PHOTO.h }} /></div>
                  <div className="ln-paper-lines" style={{ top: PHOTO.top + PHOTO.h + 14 }}>
                    {WORDS.letter.map((t, i) => <p key={i} className="ln-line">{t}</p>)}
                  </div>
                </div>
                <img className="ln-env-front" src={ASSETS.envFront} alt="" style={{ top: `${SPOTS.frontTop * 100}%`, height: `${(NATURAL.envFront.h / NATURAL.envOpen.h) * 100}%` }} />
                <img className="ln-env-closed" src={ASSETS.envClosed} alt="" style={{ top: `${SPOTS.closed.top * 100}%`, height: `${SPOTS.closed.height * 100}%` }} />
                <div className="ln-env-dress" style={{ top: `${SPOTS.closed.top * 100}%`, height: `${SPOTS.closed.height * 100}%` }}>
                  <img className="ln-env-stamp" src={STAMP} alt="" />
                  <img className="ln-env-pm" src={PM_FROM} alt="" />
                  <img className="ln-env-seal" src={SEAL} alt="" />
                </div>
              </div>

              {/* where it goes, and how far (over the flight) */}
              <span className="ln-routechip">{FROM.flag} {WORDS.from} → {TO.flag} {WORDS.to} <b>({ROUTE_KM}{WORDS.km})</b></span>
              {/* to whom the letter is going (an example): over the letter while it's written */}
              <div className="ln-to"><img src={TO.photo} alt="" /><span><b>To. {TO.flag} {WORDS.toWho}</b><i>{WORDS.toIntro}</i></span></div>
              <span className="ln-example">{WORDS.example}</span>
              {WORDS.steps[step] ? <p className="ln-step" aria-live="polite">{WORDS.steps[step]}</p> : null}
              {done && !still ? <button type="button" className="ln-replay" onClick={replay}>↻ {WORDS.replay}</button> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
