// Onboarding — every asset path, position, size, timing and line of copy in one place.
// Positions are in "stage" units: the stage is a fixed design canvas (desktop 1280×800,
// mobile 390×844) that is scaled to fit the screen, so nothing here depends on the viewport.
// x / y are object centres, w is the rendered width, r the resting rotation (deg).

const A = '/assets/onboarding-preview/';

export const ASSETS = {
  /** your cat (a print with a white border) */
  photo: A + 'photos/2.png',
  /** the back of a compact camera (camera.png, trimmed to the body and resized; transparent) */
  camera: A + 'camera.png',
  envOpen: A + 'envelope-open.png', envFront: A + 'envelope-front.png', envClosed: A + 'envelope-closed.png',
  /** the star bird carrying a letter: its twelve wing poses (aligned on the letter's heart) side by side in one strip */
  bird: A + 'birds/bird-fly.webp',
  /** the coloured-pencil earth as a world map (the drawn globes of 회전하는 지구 스케치 프레임.png, re-projected) */
  earth: A + 'earth-pencil.webp',
};

/** Natural sizes of the assets (px) — used for aspect ratios and for the measured spots below. */
export const NATURAL = {
  photo: { w: 510, h: 358 }, camera: { w: 1000, h: 648 },
  /** the red envelope (투명 배경의 진홍색 열린 봉투 · 고급 질감의 열린 붉은 봉투 · the closed back), trimmed and lined up */
  envOpen: { w: 600, h: 671 }, envFront: { w: 600, h: 374 }, envClosed: { w: 600, h: 369 },
  bird: { w: 260, h: 215 },   // one frame of the strip
  /** the other cat lovers' photos in scene 1 (4 : 3 prints) */
  card: { w: 4, h: 3 },
  /** the note card is drawn in CSS (there is no blank letter-paper asset); this is its aspect */
  note: { w: 572, h: 391 },
};

/** Spots measured on the artwork itself (fractions of that image). */
export const SPOTS = {
  /** the envelope's flap hinges here (fraction of envelope-open height) */
  fold: 512 / 1245,
  /** envelope-front sits at this offset on envelope-open */
  frontTop: 551 / 1245,
  /** envelope-closed laid over envelope-open's body */
  closed: { left: 0, top: 561 / 1245, width: 1, height: 684 / 1245 },
  /** the camera's screen (where the live view shows) and its OK button (centre, diameter as a fraction of the width) */
  cameraScreen: { left: 0.069, top: 0.1345, right: 0.668, bottom: 0.8164 },
  cameraOk: { x: 0.834, y: 0.545, d: 0.074 },
  /** the letter in the bird's beak (part of the bird art): its centre, width and tilt as fractions of a frame;
   *  `clip` = the corner of the frame it sits in, cut away until the bird takes the envelope */
  letter: { x: 0.877, y: 0.66, w: 0.2, r: -14, clip: { left: 0.78, top: 0.53 } },
};

/** a cat photo (and its person) around yours in scene 1: centre, width, tilt */
export type Spot = { x: number; y: number; w: number; r: number };
export type Layout = {
  W: number; H: number;
  /** each scene's title and line (top edge at y, centred), and the progress dots at `dots` */
  text: { y: number; dots: number };
  scene1: {
    /** the camera that takes your cat's photo first (centred horizontally): centre y and width */
    camera: { y: number; w: number };
    /** your cat's photo, in the middle (centre y; it is as wide as the envelope's paper) */
    you: { y: number };
    /** the open envelope: width and centre y (centred horizontally) */
    envelope: { w: number; y: number };
    /** the note is written, and the photo waits, here above the envelope before going in (centre y); widths as a fraction of the envelope */
    paper: { y: number; photo: number; note: number };
    /** how far down they sit once inside: their top edge below the fold, as a fraction of their (shrunk) height */
    inserted: { photo: number; note: number };
  };
  scene2: {
    globe: { x: number; y: number; w: number };
    bird: { w: number };
    /** how high above the globe's surface the bird flies the route (globe-radius units, cobe's own scale) */
    lift: number;
  };
  scene3: {
    /** the CTA */
    final: { x: number; y: number };
  };
};

export const LAYOUTS: { desktop: Layout; mobile: Layout } = {
  desktop: {
    W: 1280, H: 800,
    text: { y: 60, dots: 150 },
    scene1: {
      camera: { y: 430, w: 500 },
      you: { y: 440 },
      envelope: { w: 250, y: 545 },
      paper: { y: 325, photo: 1.0, note: 1.06 },
      inserted: { photo: 0.0, note: 0.08 },
    },
    scene2: { globe: { x: 640, y: 500, w: 600 }, bird: { w: 170 }, lift: 0.02 },
    scene3: { final: { x: 640, y: 770 } },
  },
  mobile: {
    W: 390, H: 844,
    text: { y: 70, dots: 204 },
    scene1: {
      camera: { y: 470, w: 330 },
      you: { y: 480 },
      envelope: { w: 190, y: 600 },
      paper: { y: 400, photo: 1.0, note: 1.06 },
      inserted: { photo: 0.0, note: 0.08 },
    },
    scene2: { globe: { x: 195, y: 590, w: 440 }, bird: { w: 112 }, lift: 0.02 },
    scene3: { final: { x: 195, y: 806 } },
  },
};

/** Cat photos from Unsplash (free under the Unsplash License), hotlinked as small crops — the other cat
 *  lovers' cats. Each entry: [image id, photo page id] → https://unsplash.com/photos/<page id> */
export const UNSPLASH_CATS: [string, string][] = [
  ['photo-1514888286974-6c03e2ca1dba', 'gKXKBY-C-Dk'],
  ['photo-1573865526739-10659fec78a5', '75715CVEJhI'],
  ['photo-1764708844823-00d2188dafd8', 'UxWy8Un2Mjc'],
  ['photo-1592194996308-7b43878e84a6', 'ZCHj_2lJP00'],
  ['photo-1574144611937-0df059b5ef3e', '7AIDE8PrvA0'],
  ['photo-1759588032622-1388cf9505ad', 'f6ZQIQ6wAmE'],
  ['photo-1495360010541-f48722b34f7d', 'mJaD10XeD7w'],
  ['photo-1561948955-570b270e7c36', 'Tn8DLxwuDMA'],
  ['photo-1787404200329-78b2aaee13c1', 'BxyJvHbb4TA'],
  ['photo-1533738363-b7f9aef128ce', 'yMSecCHsIBc'],
  ['photo-1503777119540-ce54b422baff', 'xadzcCQZ_Xc'],
  ['photo-1774876267601-501fa7d17ac7', 'lMjRzppANHY'],
  ['photo-1543852786-1cf6624b9987', '7GX5aICb5i4'],
  ['photo-1596854407944-bf87f6fdd49e', 'p6yH8VmGqxo'],
  ['photo-1765714714461-174be7eaad85', '4Qg_HQ8NCEI'],
  ['photo-1574158622682-e40e69881006', 'IuJc2qh2TcA'],
  ['photo-1478098711619-5ab0b478d6e6', 'cWOzOnSoh6Q'],
  ['photo-1472491235688-bdc81a63246e', 'IFxjDdqK_0U'],
  ['photo-1511044568932-338cba0ad803', '9UUoGaaHtNE'],
  ['photo-1571566882372-1598d88abd90', 'ZlFKIG6dApg'],
  ['photo-1763839361290-4d711e42ab5f', 'xyBBgqMc8pg'],
  ['photo-1560114928-40f1f1eb26a0', 'RCfi7vgJjUY'],
  ['photo-1764323170445-37743bbb2ec1', 'k4_-66jcvzA'],
  ['photo-1529778873920-4da4926a72c2', 'nKC772R_qog'],
  ['photo-1757430757969-3d2b92025097', 'YraA6oO9qhY'],
  ['photo-1595433707802-6b2626ef1c91', 'Y0WXj3xqJz0'],
  ['photo-1774544583420-8067e60ecd5c', 'W5NiNyi8q1g'],
  ['photo-1517331156700-3c241d2b4d83', 'YCPkW_r_6uA'],
  ['photo-1533743983669-94fa5c4338ec', 'so5nsYDOdxw'],
  ['photo-1555685812-4b943f1cb0eb', '-81lVsfM4gQ'],
  ['photo-1494256997604-768d1f608cac', 'NodtnCsLdTE'],
  ['photo-1492370284958-c20b15c692d2', '7E9qvMOsZEM'],
];
export const unsplashCrop = (id: string, w = 120, h = 160) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=faces,center&q=70&auto=format`;

/** Where the letter leaves from. */
export const ORIGIN = { city: 'Seoul', lon: 126.98, lat: 37.57 };
/** Where it lands: the other side of the world, east across the Pacific (about half a turn of the globe). */
export const DESTINATION = { city: 'New York', country: 'USA', flag: '🇺🇸', lon: -74.01, lat: 40.71 };
/** The globe is round and whole (hand-drawn, PencilGlobe). The bird flies east from Seoul along a gentle path
 *  (longitude and latitude eased from one end to the other, not the polar great circle), and the globe
 *  faces the point the letter has reached, `tilt` degrees further south, so it turns about half way
 *  round beneath the bird. `preTurn` = how much of the route it turns through on its way in; `lead` =
 *  how far the view runs ahead of the letter at the start (and trails it at the end), so the bird
 *  also crosses the screen a little; `trail` = how many dots mark the way flown. */
export const GLOBE_VIEW = { tilt: 22, preTurn: 0.05, lead: 0.22, trail: 60,
  /** how far above Seoul the bird dives in from (fraction of the stage height) */
  dive: 0.32,
  /** the route bows north (degrees of latitude at its middle), like a real flight over the North Pacific — the dotted
   *  line curves, and the bird flies along it */
  bow: 24 };
/** The two ends of the route, labelled on the globe (only these: the globe explains, it doesn't decorate). */
export const PLACES = [
  { name: 'South Korea', lon: 126.98, lat: 37.57, key: 'from' },
  { name: 'United States', lon: -74.01, lat: 40.71, key: 'to' },
] as { name: string; lon: number; lat: number; key?: 'from' | 'to' }[];

/** The people in the story are examples (made-up names), each with their cat (an Unsplash photo id). */
export const COPY = {
  /** one message per step — what the service is, plainly, like a friend telling you */
  scenes: [
    { title: 'Snap a photo of your cat.', line: 'Naps, zoomies, judgy looks — any moment works.' },
    { title: 'Add a little note about their day.', line: 'A line or two is plenty. Then seal it up.' },
    { title: 'Send a letter to a cat lover abroad!', line: 'Your letter will find a new friend somewhere in the world.' },
    { title: 'Make friends from other countries!', line: 'Your cat is the perfect icebreaker.' },
  ],
  you: 'You 🇰🇷',
  /** the hello that goes in with your cat's photo (written out by hand) */
  note: { to: 'Hey new friend,', body: 'This is Mochi. She says hi!', from: '— Mina, Seoul' },
  /** the new friends, around the world — the first is where the letter lands; the last link comes back to you */
  friends: [
    { name: 'Tom', flag: '🇺🇸', id: 'photo-1561948955-570b270e7c36', lon: -74.01, lat: 40.71 },
    { name: 'Lucía', flag: '🇧🇷', id: 'photo-1573865526739-10659fec78a5', lon: -46.63, lat: -23.55 },
    { name: 'Léa', flag: '🇫🇷', id: 'photo-1514888286974-6c03e2ca1dba', lon: 2.35, lat: 48.86 },
    { name: 'Amara', flag: '🇳🇬', id: 'photo-1574158622682-e40e69881006', lon: 3.38, lat: 6.52 },
    { name: 'Priya', flag: '🇮🇳', id: 'photo-1533738363-b7f9aef128ce', lon: 72.88, lat: 19.08 },
    { name: 'Yuki', flag: '🇯🇵', id: 'photo-1592194996308-7b43878e84a6', lon: 139.69, lat: 35.68 },
    { name: 'You', flag: '🇰🇷', id: '', lon: 126.98, lat: 37.57 },
  ],
  /** at the very end, more cat lovers pop up on the globe's horizon, round you (examples too) */
  locals: [
    { name: 'Wei', flag: '🇨🇳', id: 'photo-1495360010541-f48722b34f7d', lon: 116.4, lat: 39.9 },
    { name: 'Mei', flag: '🇹🇼', id: 'photo-1543852786-1cf6624b9987', lon: 121.56, lat: 25.03 },
    { name: 'Ana', flag: '🇵🇭', id: 'photo-1574144611937-0df059b5ef3e', lon: 120.98, lat: 14.6 },
    { name: 'Linh', flag: '🇻🇳', id: 'photo-1503777119540-ce54b422baff', lon: 105.85, lat: 21.03 },
    { name: 'Saraa', flag: '🇲🇳', id: 'photo-1596854407944-bf87f6fdd49e', lon: 106.9, lat: 47.9 },
    { name: 'Niran', flag: '🇹🇭', id: 'photo-1764708844823-00d2188dafd8', lon: 100.5, lat: 13.75 },
    { name: 'Lani', flag: '🇬🇺', id: 'photo-1759588032622-1388cf9505ad', lon: 144.79, lat: 13.44 },
    { name: 'Kai', flag: '🇺🇸', id: 'photo-1787404200329-78b2aaee13c1', lon: -157.86, lat: 21.31 },
    { name: 'Emma', flag: '🇺🇸', id: 'photo-1774876267601-501fa7d17ac7', lon: -149.9, lat: 61.22 },
  ],
  /** who is linked to whom (indexes into friends; 6 = you) — drawn as the world turns */
  links: [[6, 0], [0, 1], [0, 2], [2, 3], [2, 4], [4, 5], [5, 6]] as [number, number][],
  /** the last words, over the globe's horizon at the very end */
  outro: { lead: 'It’s not just pen pals.', brand: 'It’s Cat Pal.' },
  cta: 'Say hi with your cat', replay: 'Replay',
};

/** Durations (s). The timeline reads everything from here. */
export const TIMING = {
  // 1 · your cat's photo is taken
  cameraIn: 0.6, focus: 0.6, shutter: 0.16, flash: 0.45, print: 0.6,
  // 2 · your cat's photo and a hello go in the envelope; the bird takes it to a new friend
  envIn: 0.7, toPaper: 0.7, shrink: 0.4, insert: 0.65, noteIn: 0.5, perChar: 0.035, flapUp: 0.24, flapDown: 0.32, squash: 0.7,
  sceneIn: 0.9, toSeoul: 1.1,
  /** the bird: gliding in to Seoul, flying the route to New York, flying on out; one slow rise-and-fall */
  enter: 1.6, flight: 4.6, leave: 2.0, bob: 2.6,
  // 3 · the world turns, and friends appear one by one, linked up — all the way back round to you
  around: 8,
  /** a short pause between scenes */
  beat: 0.3,
};

/** the landing comes first, so Start opens the app straight on Home (skips the app's own intro) */
export const CTA_HREF = '/?start=home';
