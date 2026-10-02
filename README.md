# CatPal

Standalone copy of the Claude Design project "Cat Pal mobile prototype"
(`Cat Pal v6.dc.html` and the files it references). Files are kept exactly as
exported — do not edit `support.js` or `image-slot.js` (generated runtime).

## Run locally

The page fetches sibling files (`globe.html`, `.image-slots.state.json`), so it
must be served over HTTP, not opened as `file://`.

```bash
cd catpal
python3 -m http.server 5180 --bind 127.0.0.1
```

Open <http://127.0.0.1:5180/Cat%20Pal%20v6.dc.html>.

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

## Demo video

`video/catpal-demo.mp4` (~1 min, 430×900 @2x) walks the whole flow from the
intro. To re-record (server running on :5180):

```bash
cd video
npm i puppeteer-core@23 && pip3 install --user imageio-ffmpeg
node record.js   # writes frames/ and frames.txt
"$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" -f concat -safe 0 -i frames.txt \
  -vf "fps=30,scale=860:1800,format=yuv420p" -c:v libx264 -crf 20 catpal-demo.mp4
```

React, Babel, d3, topojson, the world atlas and the Pretendard/Inter fonts load
from public CDNs, so an internet connection is required.
