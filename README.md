# CatPal

CatPal mobile prototype, migrated from the Claude Design export
(`legacy/Cat Pal v6.dc.html`) to **Vite + React 18 + TypeScript**. The UI,
assets and behaviour are unchanged — only the technical structure moved.

## Run locally

Requires Node 20.19+ (tested with 22).

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on http://localhost:5180
```

Fonts (Pretendard, Inter) and the globe's d3/topojson/world-atlas still load
from public CDNs, so an internet connection is required.

## Project structure

```
index.html              Vite entry: font links, /image-slot.js, #root
src/
  main.tsx              mounts <App/> (no StrictMode — see comment there)
  App.tsx               page layout + phone frame, renders every screen
  CatPalLogic.ts        all state and behaviour (the prototype's logic class,
                        ported unchanged); renderVals() feeds the screens
  i18n.ts               UI strings for the 10 languages
  screens/*.tsx         one component per screen / overlay (Home, Mailbox, …)
  dc/                   tiny port of the Claude Design runtime the logic expects:
    DCLogic.ts            base class (synchronous setState, lifecycles)
    DCHost.tsx            React host that renders a DCLogic instance
    runtime.tsx           css() / I() / each() / R() helpers used by screens
  styles.css            global styles + keyframes (from the prototype <helmet>)
  hover.css             hover rules (from the prototype's style-hover="…")
public/                 served as-is: assets/, globe.html, image-slot.js,
                        .image-slots.state.json
legacy/                 the original Claude Design prototype, for reference
                        (no longer runnable here — its assets moved to public/)
video/                  demo video + recording script
```

Screens read everything from the `v` (renderVals) object, e.g. `v.t.homeQ`,
`v.openSendSheet`. To change behaviour edit `CatPalLogic.ts`; to change markup
edit the screen component. Asset paths in the notes below are relative to
`public/`.

## Local changes

- Home tab: tapping it plays `assets/home.gif` (8-frame house sprite, 3s) and
  then returns to `assets/icon-home.png`, the same way the Mailbox tab plays
  `mailbox.gif`. `home-b.gif` is a byte-identical copy so a repeat tap restarts
  the animation. The GIF is 44×62 so the smoke can rise above the 44px icon box;
  the house sits exactly where the still icon does.
- World Map tab: same pattern with `assets/map.gif` / `map-b.gif` (cat peeks
  into the pin and waves, 3s), returning to `assets/icon-map-160.png`. The GIF
  is 44×54 so the rays fit above the pin.
- Passport tab: `assets/passport.gif` / `passport-b.gif` (14 frames, the
  passport opens and flips pages, 3s), returning to `assets/passport-still.png`
  (the GIF's first frame, the closed passport — replaces the stamp icon in the
  nav only). All frames share one scale, anchored bottom-centre, sized so the
  closed passport is ~30×40px like the other icons. The opened book is wider,
  so the Passport icon box is 56×50 (6px drawn above the usual 44px box); the
  label stays aligned with the other tabs.

- Uploaded/camera photos: `afterPhoto` turns the `data:` URL into a `blob:`
  URL. The `;` in `data:image/...;base64` broke the inline `background:url()`
  style, so uploaded photos never showed in the original export.
- Arrived screen: headline and route are bold 17px, distance is 13px grey,
  date under the postcard is 14px.

- "Surprise Me" is now "🌍 Meet a New CatPal" (translated in every language).
- CatPal photos: every pal image slot gets a default `src` from
  `assets/cats/cat-1…6.jpg` (4:5 crops of the photos in `~/Downloads/cat img
  asset`). `palImg(id)` maps pals in `PALS` order to the 6 photos, so pals 7–11
  reuse them. Dropping an image on a slot still overrides the default.

- Home screen simplified into SEND → RECEIVE → EXPLORE: headline only (the
  small photo beside it is gone; tapping the photo in the send card opens your
  profile), a shorter send card with "To a cat somewhere 🌎" / photo / Seoul
  stamp / "Not sent yet", the CTA "Send today’s Cat Mail", New Cat Mail without
  the count badge and with a light "🔒 Send yours to open" pill instead of the
  black bar, and a tighter "Right now, around the world" list without the
  subtitle. Sections are 28px apart. Strings updated in every language.
- Home text trimmed further: no "Not sent yet" (only "✓ Sent to {city}" after
  sending), mail cards show just flag + city, the list is titled "Around the
  world", and activities are short ("Napping 💤").

- Open Cat Mail has one "Reply" button (was "Reply with a photo" + "Letters").
  It opens the letters thread; the reply box has an optional "📷 Photo"
  (thumbnail with ✕ to remove). A reply can be text, a photo, or both, and the
  photo shows inside your letter. The thread header's Photo button is gone, and
  letter bubbles no longer shrink when the thread scrolls.

- Reactions on an opened Cat Mail: the tapped emoji pops, seven copies float
  up toward the cat photo, the photo wiggles, and phones get a short vibration.
  Repeat taps replay it (keyframes alternate a/b names).
- Home is now only SEND → RECEIVE: the "Around the world" list is removed, and
  New Cat Mail shows just the newest incoming mail (locked until today's Cat
  Mail is sent). The title has an orange badge with the unread count.
- Home layout (latest): the send card is a tall 232px envelope (flap, bigger
  photo, stamp top-right, "To …" and status along the bottom), and New Cat Mail
  is a horizontal snap carousel of small 148×124 envelopes — one per unread
  mail, newest first, the next card peeking in. Home has `overflow-x:hidden`
  so the edge-to-edge carousel can't scroll the page sideways.
- No live "what cats are doing now" info anywhere: the send sheet no longer
  shows each pal's local time, and the unused activity/local-time helpers,
  the 30s clock tick and the `nowWorld*` / `a0–a5` strings were removed.
- The outlined "bird" doodle in the top-right of the upload / info / stamp /
  send screens is removed.

- Stamp screen: the uploaded photo drops into the open envelope (`cp-tuck`,
  ~1s with a small overshoot) and the envelope gives a slight squash
  (`cp-gulp`). A V-shaped front pocket now sits over the photo so its lower
  part looks tucked inside.

- Note screen (04b) is a photo letter, not a chat: no conversation starters,
  a bigger photo (160×196), the note placeholder "Add a little note about
  this moment…" (120 chars), and one wide "Send Cat Mail" button right under
  it (it still continues to the stamp step). Strings in all languages.
- Reply screen: no starter chips either; its send button now says "Reply".

- After sending, the Arrived screen has no button: 3s after it appears it
  moves on to Mailbox on the Sent tab (newest first) by itself
  (`componentDidUpdate` timer; skipped if the user already left the screen).
  Tapping Mailbox in the nav still opens the Received tab.

- Home with no new Cat Mail: an empty pale envelope (flap, dashed stamp
  outline, "No new Cat Mail — something is on its way ✈️") replaces the dashed
  box and blob doodle.

## Demo video

`video/catpal-demo.mp4` (~1 min, 430×900 @2x) walks the whole flow from the
intro. To re-record (with `npm run dev` running on :5180):

```bash
cd video
npm i puppeteer-core@23 && pip3 install --user imageio-ffmpeg
node record.js   # writes frames/ and frames.txt
"$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" -f concat -safe 0 -i frames.txt \
  -vf "fps=30,scale=860:1800,format=yuv420p" -c:v libx264 -crf 20 catpal-demo.mp4
```
