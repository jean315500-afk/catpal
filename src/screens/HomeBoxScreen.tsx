// HOME, once a first letter has gone — the red mailbox, big, in the sky: the letters kept in it poking
// out of its open door (none: shut; one; more), a red badge for the ones not read yet (they give a little hop now and
// then), standing on the globe at the page's foot (turning slowly; tapped, on to the Map) — the mailbox itself opens
// the Mailbox. At the bottom right, a round button to write one. Reduced motion: all of it still; the words say how things stand.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = "#22304A", MUTED = "#5E6A80";
/** the mailbox's three pictures, side by side (184 × 220 each): shut · a letter or two · a pile */
const FRAMES = "./assets/home/mailbox-frames.webp", MB_W = 196, MB_H = Math.round((MB_W * 220) / 184);
const reduce = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** the Map's own globe, turning slowly under it all (WebGL only: without it, no globe here) */
const GlobeMap3D = lazy(() => import('../community/GlobeMap3D'));
let webgl: boolean | null = null;
const hasWebGL = () => { if (webgl === null) { try { const c = document.createElement("canvas"); webgl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { webgl = false; } } return webgl; };
/** the globe at the page's foot: its middle on the page's bottom edge, its radius 0.58 of the page's width (at most
 *  520 px of it) — the mailbox stands on its top. Its box: taller than wide (so the globe keeps that size) */
const globeOf = (w: number) => { const h = Math.max(500, Math.round(w * 1.3)), fit = 0.58 * Math.min(1, 520 / Math.max(1, w)); return { h, fit, r: Math.round(w * fit) }; };
/** where the post is in the mailbox's picture (across), and how far it's set into the ground */
const POST_X = 0.62, SINK = 8;
/** how far each frame's post stops short of the frame's foot (of its height): it's set down by that, so it stands right on the world */
const FOOT = [0.061, 0, 0.042];

export default function HomeBoxScreen({ v }: { v: Vals }) {
  const b = v.sHomeBox ? v.hmBox : null;
  const still = reduce();
  // the page's width (the globe's size goes by it)
  const pageEl = useRef<HTMLDivElement>(null);
  const [pageW, setPageW] = useState(0), [pageH, setPageH] = useState(0);
  useLayoutEffect(() => {
    const el = pageEl.current; if (!el) return;
    const m = () => { setPageW(el.clientWidth); setPageH(el.clientHeight); }; m();
    const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, [!!b]);
  // the globe tapped: it rises and grows as the page fades, and the Map comes in
  const [toMap, setToMap] = useState(false);
  useEffect(() => { if (!toMap) return; const id = setTimeout(() => { setToMap(false); v.tabs?.find((x: any) => x.id === "world")?.tap(); }, still ? 0 : 520); return () => clearTimeout(id); }, [toMap]);
  // (Plus: letters land at once) a new one landing while you're here: the Fast Bird swoops it in — the letters and the
  // count catch up as it does
  const seen = useRef<{ stored: number; unread: number } | null>(null);
  const [swoop, setSwoop] = useState<{ stored: number; unread: number } | null>(null);
  useEffect(() => {
    if (!b) return;
    const was = seen.current; seen.current = { stored: b.stored, unread: b.unread };
    if (!b.plus || still || !was || b.unread <= was.unread) return;
    setSwoop(was); const id = setTimeout(() => setSwoop(null), 1150); return () => clearTimeout(id);
  }, [b?.unread]);
  if (!b) return null;
  const T = b.T || {};
  const stored = swoop ? swoop.stored : b.stored, unread = swoop ? swoop.unread : b.unread;
  const frame = stored <= 0 ? 0 : stored === 1 ? 1 : 2;
  const globe = globeOf(pageW || 375), onGlobe = hasWebGL();
  // "you've got letters" and the mailbox, as one, a little over the page's middle; the world, the page's foot behind
  // them, rising (or sinking) to meet the mailbox's post — it never moves the mailbox. A short page: the mailbox
  // shrinks a little rather than run into the header or the nav
  const NAV_TOP = 18 + 64, TITLE = 34, GAP = 28, HEAD = 56, H = pageH || 760;
  // (the "Send a letter" button sits just over the nav: the mailbox keeps clear of it)
  // (28 px clear over the nav; the mailbox's floor stays where it was, so nothing else moves — still clear of the button)
  const BTN = 52, BTN_BOTTOM = NAV_TOP + 28, FLOOR = NAV_TOP + 18 + BTN + 28;
  const room = H - HEAD - FLOOR;
  const k = Math.max(0.7, Math.min(1, (room * 0.92 - TITLE - GAP) / MB_H));
  const mbW = Math.round(MB_W * k), mbH = Math.round(MB_H * k), group = TITLE + GAP + mbH;
  const groupTop = Math.max(HEAD, Math.round(H * 0.43 - group / 2));
  const mbBottom = Math.max(FLOOR, H - (groupTop + group)), glift = Math.round(mbBottom - (globe.r - SINK));
  const foot = Math.round(mbH * (FOOT[frame] || 0));
  const titleBottom = mbBottom - foot + mbH + GAP;
  // the news, over the mailbox: how many new letters (not read yet) — or that they've all been read
  const news = unread > 1 ? (T.hbCheckMany || "").replace("{n}", String(unread)) : unread === 1 ? T.hbCheckOne : T.hbAllRead;
  // the mailbox — all of it opens the Mailbox (on the globe: standing on its top; no globe: in the page's middle)
  const mailboxEl = (
          <div style={onGlobe ? { position: "absolute", left: "50%", bottom: mbBottom - foot + "px", width: mbW + "px", height: mbH + "px", transform: `translateX(-${POST_X * 100}%)` } : { position: "relative", width: MB_W + "px", height: MB_H + "px", marginTop: "60px" }}>
            {/* (on the globe) a soft shadow where its post goes into the ground */}
            {onGlobe ? <span aria-hidden="true" style={{ position: "absolute", left: POST_X * 100 + "%", bottom: foot - 4 + "px", width: "70px", height: "14px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(40,30,20,.32), rgba(40,30,20,0))", zIndex: 0 }} /> : null}
            {/* (Plus) the Fast Bird, swooping a new letter in */}
            {swoop ? (
              <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "0", width: "64px", marginLeft: "-32px", zIndex: 3, pointerEvents: "none", animation: "cp-fast-swoop 1.1s cubic-bezier(.3,.1,.3,1) both" }}>
                <img src="./assets/map/bird-letter-slow.webp" alt="" draggable={false} style={{ display: "block", width: "100%", transform: "scaleX(-1)", filter: "drop-shadow(0 2px 3px rgba(40,30,20,.18))" }} />
                <span style={{ position: "absolute", right: "-14px", top: "-6px", fontSize: "14px", color: "#E0A040", animation: "cp-fast-spark .5s ease-in-out infinite alternate" }}>✦</span>
              </div>
            ) : null}
            {/* the mailbox: all of it opens the Mailbox */}
            <div onClick={b.open} role="button" tabIndex={0} aria-label={T.hbOpen + (unread ? " · " + (T.hbBadge || "").replace("{n}", String(unread)) : "")} className="dc-hover-2"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); b.open(); } }}
              // (not read yet) the whole mailbox gives a little sway now and then, rocking on its post
              style={{ position: "absolute", inset: "0", zIndex: 1, cursor: "pointer", pointerEvents: "auto", transformOrigin: POST_X * 100 + "% 100%", animation: unread && !still ? "cp-hb-sway 4.2s ease-in-out infinite" : undefined }}>
              <div style={{ position: "absolute", inset: "0", backgroundImage: `url(${FRAMES})`, backgroundSize: "300% 100%", backgroundPosition: frame * 50 + "% 0", filter: "drop-shadow(0 14px 18px rgba(60,30,20,.16))" }} />
            </div>
          </div>
  );
  const title = (
    <h1 aria-live="polite" style={{ margin: "0", padding: "0 24px", textAlign: "center", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "26px", lineHeight: TITLE + "px", letterSpacing: "var(--ls-heading)", color: "#22314D" }}>{I(news)}</h1>
  );
  // writing a letter: one clear button just over the nav, in the middle — navy, white words: "Send a letter"
  // ("Continue letter": the letter you were writing, its photo and words kept; "Reply": your turn to write back)
  const fabLabel = b.cta || v.hmCta;
  const writeFab = (
    <div style={{ position: "absolute", left: "0", right: "0", bottom: BTN_BOTTOM + "px", zIndex: 30, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
    <div className="dc-hover-8" onClick={v.startLetter} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.startLetter(); } }}
      style={{ pointerEvents: "auto", height: BTN + "px", padding: "0 30px", borderRadius: BTN / 2 + "px", boxSizing: "border-box",
        background: "#22314D", boxShadow: "0 8px 20px rgba(34,49,77,.24)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", whiteSpace: "nowrap",
        opacity: toMap ? 0 : 1, transition: still ? "none" : "opacity .3s ease, transform .15s ease" }}>
      <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>{I(fabLabel)}</span>
    </div>
    </div>
  );
  return (
    <div ref={pageEl} data-screen-label="Home" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
      {/* the world, turning slowly at the foot of the page — tapped, on to the Map */}
      {hasWebGL() ? (
        <div aria-hidden={false} style={{ position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: "0", right: "0", bottom: -Math.round(globe.h * 0.3) + glift + "px", height: globe.h + "px", zIndex: 0, pointerEvents: "none", transformOrigin: "50% 70%",
          transform: toMap ? "translateY(-110px) scale(1.35)" : "none", opacity: toMap ? 0.6 : 1, transition: still ? "none" : "transform .52s cubic-bezier(.4,0,.2,1), opacity .52s ease", animation: "cp-fade .8s ease both" }}>
          <Suspense fallback={null}>
            <GlobeMap3D groups={[]} height="100%" zoomButtons={false} fit={globe.fit} lower={0.2} />
          </Suspense>
          <div onClick={() => setToMap(true)} role="button" tabIndex={0} aria-label={v.tabs?.find((x: any) => x.id === "world")?.label}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setToMap(true); } }}
            // (the globe's own circle)
            style={{ position: "absolute", left: "50%", top: "70%", width: globe.r * 2 + "px", height: globe.r * 2 + "px", transform: "translate(-50%, -50%)", borderRadius: "50%", pointerEvents: "auto", cursor: "pointer" }} />
        </div>
        </div>
      ) : null}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100%", boxSizing: "border-box", padding: "16px 22px 118px", display: "flex", flexDirection: "column", pointerEvents: "none",
        opacity: toMap ? 0 : 1, transition: still ? "none" : "opacity .4s ease" }}>
        {onGlobe ? mailboxEl : null}
        {onGlobe ? <div style={{ position: "absolute", left: "0", right: "0", bottom: titleBottom + "px", zIndex: 2, pointerEvents: "none" }}>{title}</div> : null}
        {/* the header's room (the language button is the shared one, top right) */}
        <div aria-hidden="true" style={{ height: "42px", flex: "none" }} />
        {/* (sample letters only) a small grey tag, so they're never taken for real ones */}
        {b.sample ? <span title={b.sample} style={{ position: "absolute", left: "18px", top: "22px", padding: "3px 9px", borderRadius: "999px", background: "rgba(255,255,255,.7)", fontWeight: 600, fontSize: "11px", color: MUTED }}>{I(T.hbSampleTag)}</span> : null}
        <div style={{ flex: "1", minHeight: onGlobe ? "0" : "380px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {onGlobe ? null : <><div style={{ marginBottom: GAP + "px" }}>{title}</div>{mailboxEl}</>}
        </div>
      </div>
      {writeFab}
    </div>
  );
}
