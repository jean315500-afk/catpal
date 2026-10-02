// Records the CatPal flow from the intro screen using CDP screencast frames.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'frames');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--hide-scrollbars', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });

  // Tap indicator so viewers can see where each touch happens.
  await page.evaluateOnNewDocument(() => {
    addEventListener('pointerdown', (e) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(255,72,0,.28);border:2px solid rgba(255,72,0,.7);pointer-events:none;z-index:99999;transition:transform .45s ease,opacity .45s ease;transform:scale(.4)`;
      document.documentElement.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = 'scale(1.3)'; d.style.opacity = '0'; });
      setTimeout(() => d.remove(), 600);
    }, true);
  });

  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const f = path.join(OUT, String(frames.length).padStart(5, '0') + '.jpg');
    fs.writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });

  await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
  await sleep(300);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 });
  const t0 = Date.now();

  // Element helpers: find by visible text / selector, then move + click like a finger.
  const center = async (handle) => {
    const b = await handle.boundingBox();
    if (!b) throw new Error('no box');
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const byText = async (text) => {
    const h = await page.evaluateHandle((t) => {
      const els = [...document.querySelectorAll('span,div,button')].filter((e) => e.children.length === 0 && e.textContent.trim() === t);
      return els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).pop() || null;
    }, text);
    const el = h.asElement();
    if (!el) throw new Error('text not found: ' + text);
    return el;
  };
  const tap = async (el, pause = 1200) => {
    const p = await center(el);
    await page.mouse.move(p.x, p.y, { steps: 8 });
    await page.mouse.click(p.x, p.y);
    await sleep(pause);
  };
  const tapText = (t, pause) => byText(t).then((el) => tap(el, pause));
  const navTap = async (label, pause) => {
    const el = await page.evaluateHandle((l) => [...document.querySelectorAll('span')].find((s) => s.textContent === l && s.previousElementSibling && s.previousElementSibling.style.backgroundImage) || null, label);
    await tap(el.asElement(), pause);
  };
  const step = (name) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', name);

  step('intro'); await sleep(3000);
  step('start'); await tapText('Let’s Start!', 2600);
  step('home scroll'); await page.mouse.move(215, 600); await page.mouse.wheel({ deltaY: 300 }); await sleep(1400); await page.mouse.wheel({ deltaY: -300 }); await sleep(1000);
  step('send cat mail'); await tapText('Send Cat Mail', 1600);
  step('surprise'); await tapText('Surprise Me', 1800);
  step('upload'); await tap(await page.evaluateHandle(() => [...document.querySelectorAll('span')].find((s) => s.textContent.includes('Upload your')).parentElement).then((h) => h.asElement()), 1300);
  step('album');
  const [chooser] = await Promise.all([page.waitForFileChooser(), tapText('Album', 0)]);
  await chooser.accept([path.join(__dirname, 'my-cat.jpg')]);
  await sleep(2000);
  if (await page.$('[data-screen-label*="Info"], [data-screen-label*="info"]') || (await page.evaluate(() => document.body.innerText.includes('introduce your cat')))) {
    step('info'); await tapText('Curious', 900); await tapText('✓', 1800);
  }
  step('starter'); await tapText('Knock, knock.', 1500);
  step('check'); await tapText('✓', 1800);
  step('stamp'); { const s = await page.$$('[aria-label=stamp]'); await tap(s[1], 2200); }
  step('send'); await tapText('Send', 1000);
  step('delivery'); await sleep(9500);
  step('arrived');
  if (await page.$('[data-screen-label="08 Delivery map"]')) { const c = await page.evaluateHandle(() => document.querySelector('[data-screen-label="08 Delivery map"] [style*="cursor:pointer"], [data-screen-label="08 Delivery map"] div[style*="cursor: pointer"]')); if (c.asElement()) await tap(c.asElement(), 0); }
  await sleep(3500);
  step('back home'); await tapText('Back to Home', 2400);
  step('nav home'); await navTap('Home', 3200);
  step('mailbox'); await navTap('Mailbox', 3300);
  step('world map'); await navTap('World Map', 4200);
  step('passport'); await navTap('Passport', 3600);
  step('passport scroll'); await page.mouse.move(215, 600); await page.mouse.wheel({ deltaY: 350 }); await sleep(1600); await page.mouse.wheel({ deltaY: -350 }); await sleep(1500);

  await cdp.send('Page.stopScreencast');
  await sleep(300);
  // Hold the last frame a moment, then write an ffmpeg concat list with real frame durations.
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1.5;
    lines.push(`file '${frames[i].f}'`, `duration ${Math.max(dur, 0.001).toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].f}'`);
  fs.writeFileSync(path.join(__dirname, 'frames.txt'), lines.join('\n'));
  console.log('frames', frames.length, 'seconds', (frames[frames.length - 1].t - frames[0].t).toFixed(1));
  await browser.close();
})().catch(async (e) => { console.error('FAILED', e.message); process.exit(1); });
