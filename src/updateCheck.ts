// A new version of CatPal on the site while an old one is still open (a phone keeps a tab, or the home-screen app, as
// it was until it's closed for good): looked for when the app comes back to the front (at most once a minute) — the
// site's page says which build it runs. A newer one: a small "Refresh" card at the top (never reloaded by itself, so
// nothing being written is lost). Only in the built app (not while developing).
const mine = () => (document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null)?.src.split('/assets/')[1] || '';
let last = 0, shown = false;
async function look() {
  if (shown || !mine() || Date.now() - last < 60e3) return;
  last = Date.now();
  try {
    const html = await (await fetch('/?v=' + last, { cache: 'no-store' })).text();
    const live = /<script[^>]+type="module"[^>]+src="[^"]*\/assets\/([^"]+\.js)"/.exec(html)?.[1];
    if (live && live !== mine()) show();
  } catch { /* offline: next time */ }
}
function show() {
  shown = true;
  const ko = /^ko/i.test(document.documentElement.lang || navigator.language || '');
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:200;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:22px;background:#22304A;color:#fff;font:600 13.5px/1.2 var(--font-body,system-ui);box-shadow:0 8px 22px rgba(20,25,40,.25);white-space:nowrap';
  el.textContent = ko ? '새 버전이 있어요' : 'A new version is here';
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = ko ? '새로고침' : 'Refresh';
  b.style.cssText = 'border:0;border-radius:16px;padding:7px 14px;background:#fff;color:#22304A;font:700 13px/1 inherit;cursor:pointer';
  b.onclick = () => location.reload();
  el.appendChild(b);
  document.body.appendChild(el);
}
export function watchForUpdates() {
  if (import.meta.env.DEV) return;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') look(); });
  addEventListener('focus', look);
  setInterval(look, 10 * 60e3);
}
