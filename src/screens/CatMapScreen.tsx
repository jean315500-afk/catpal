// CAT MAP tab — the spinning globe (3D, Three.js; 2D without WebGL) with the cats and public letters shared from each country.
// Pan / pinch / zoom; tap a bubble to see that country's posts in a sheet (the nav hides while it's open);
// tap a cat moment to open it as a letter. The feed itself lives in the Feed tab.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { lazy, Suspense, useEffect, useState } from 'react';
import GlobeMap from '../community/GlobeMap';
import { FLIGHT_S } from '../community/CatMap';

/** the 3D globe (Three.js), loaded when the Map is first opened; without WebGL, the 2D globe instead */
const GlobeMap3D = lazy(() => import('../community/GlobeMap3D'));
let webgl: boolean | null = null;
const hasWebGL = () => {
  if (webgl === null) { try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webgl = false; } }
  return webgl;
};

export default function CatMapScreen({ v }: { v: Vals }) {
  return v.sCatMap ? <CatMap v={v} /> : null;
}

/** the latest letter's journey: while it flies (once), the bar fills with the cat running along; then "Sent" and on to
 *  the Mailbox. A letter that has flown before rests: the bar full, nothing moving. */
function FlightCard({ f, started, onDone }: { f: any; started: boolean; onDone: (f: any) => void }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!f.play || !started) return;
    const fly = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FLIGHT_S * 1000 + 350;   // the globe sets off 0.35 s in
    const a = setTimeout(() => setDone(true), fly), b = setTimeout(() => onDone(f), fly + 1800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [started, f.key]);
  const ease = "cubic-bezier(.45,0,.55,1)", run = f.play && started;   // the same easing as the letter on the globe
  return (
    <div aria-label="latest letter journey" aria-live="polite" style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", padding: "14px 16px 12px", borderRadius: "22px", background: "rgba(255,255,255,.96)", boxShadow: "0 10px 30px rgba(0,20,40,.18)", pointerEvents: "none", animation: "cp-rise2 .4s cubic-bezier(.2,.8,.2,1) both" }}>
      {done ? (
        <div style={{ height: "79px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", animation: "cp-fade .3s ease" }}>
          <span aria-hidden="true" style={{ width: "34px", height: "34px", borderRadius: "17px", background: f.mine ? "#FF4B3E" : "#22304A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "17px", animation: "cp-pop .4s cubic-bezier(.2,1.4,.4,1) both" }}>✓</span>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption)", color: "#22304A", textAlign: "center" }}>{I(f.doneText)}</span>
        </div>
      ) : (
        <>
          <span style={{ display: "block", fontWeight: 500, fontSize: "11px", color: "#8E8A84" }}>{I(f.label)}{" · "}{I(f.who)}{" · "}{I(f.when)}</span>
          <span style={{ display: "block", marginTop: "3px", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {I(f.fromFlag)}{" "}{I(f.from)}{"  →  "}{I(f.toFlag)}{" "}{I(f.to)}
          </span>
          <div aria-hidden="true" style={{ position: "relative", marginTop: "18px", height: "6px" }}>
            <div style={{ position: "absolute", inset: "0", borderRadius: "3px", background: "#E7E2D8", overflow: "hidden" }}>
              <div style={{ height: "100%", width: f.play ? "0" : "100%", borderRadius: "3px", background: "#22304A", animation: run ? `cp-progress ${FLIGHT_S}s ${ease} .35s both` : "none" }} />
            </div>
            {f.play ? (
              <div style={{ position: "absolute", bottom: "2px", left: "-14px", width: "56px", height: "26px", animation: run ? `cp-catbar ${FLIGHT_S}s ${ease} .35s both` : "none" }}>
                <img src="./assets/cat-run.gif" alt="" className="cp-cathop" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            ) : null}
          </div>
          <span style={{ display: "block", marginTop: "8px", textAlign: "center", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption-sm)", color: "#22304A" }}>{I(f.km)}</span>
        </>
      )}
    </div>
  );
}

function CatMap({ v }: { v: Vals }) {
  const [started, setStarted] = useState(false);
  const sel = v.cmSel2 || v.cmSel;
  return (
    <div data-screen-label="Cat Map" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflow: "hidden" }}>
      {/* a real sky behind the globe: clouds drifting slowly (two layers moving apart, so they seem to shift) */}
      <div className="cp-clouds" aria-hidden="true"><i className="cp-clouds-far" /><i className="cp-clouds-near" /></div>
      {(() => {
        const props = { groups: v.cmMapGroups || v.cmGroups || [], home: v.cmHome, routes: [], height: "100%", onSelect: v.cmSelect, selected: sel ? sel.cc : null, controlsBottom: sel ? 12 : 104, zoomButtons: !!sel || !v.cmFlight, flight: v.cmFlight ? { a: v.cmFlight.a, b: v.cmFlight.b, play: v.cmFlight.play } : null, onFlightStart: () => setStarted(true) };
        return hasWebGL() ? <Suspense fallback={null}><GlobeMap3D {...props} /></Suspense> : <GlobeMap {...props} />;
      })()}
      {/* title chip */}
      <div style={{ position: "absolute", left: "16px", right: "70px", top: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", pointerEvents: "none" }}>
        {/* sample mode only: a note that what's on the map is a sample */}
        {v.cmIsSample ? (
          <div style={{ padding: "7px 12px", borderRadius: "16px", background: "rgba(255,255,255,.94)", boxShadow: "0 4px 14px rgba(40,30,20,.10)", display: "flex", maxWidth: "100%" }}>
            <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: "#C9785D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.cmSub2)}</span>
          </div>
        ) : null}
        {/* the feed (most-loved cats, this week's Top 10) lives under World */}
        <div className="dc-hover-8" onClick={v.goExplore} role="button" style={{ pointerEvents: "auto", padding: "7px 12px", borderRadius: "16px", background: "#22304A", boxShadow: "0 4px 14px rgba(40,30,20,.14)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", transition: "transform .15s ease" }}>
          {/* a few of the cats in the feed, overlapping, and how many more */}
          {(v.cmFeedFaces || []).length ? (
            <span aria-hidden="true" style={{ display: "flex", alignItems: "center", marginLeft: "-4px" }}>
              {(v.cmFeedFaces as string[]).map((src, i) => (
                <img key={src} src={src} alt="" draggable={false} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "2px solid #22304A", marginLeft: i ? "-9px" : "0", position: "relative", zIndex: 3 - i, background: "#F3EEE4" }} />
              ))}
              {v.cmFeedMore ? <span style={{ minWidth: "28px", height: "28px", padding: "0 5px", boxSizing: "border-box", borderRadius: "14px", marginLeft: "-9px", border: "2px solid #22304A", background: "#FFF7EC", color: "#22304A", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", whiteSpace: "nowrap" }}>{"+" + (v.cmFeedMore > 99 ? "99" : v.cmFeedMore)}</span> : null}
            </span>
          ) : null}
          <span style={{ fontWeight: 700, fontSize: "12px", color: "#fff", whiteSpace: "nowrap" }}>{(v.cmFeedFaces || []).length ? "" : "🐾 "}{I(v.cmFeedLink)}{" ›"}</span>
        </div>
        {/* my letters: how many sent and received */}
        <div aria-label="letters sent and received" style={{ padding: "7px 12px", borderRadius: "16px", background: "rgba(255,255,255,.94)", boxShadow: "0 4px 14px rgba(40,30,20,.10)", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500, fontSize: "12px", color: "#4A443D", whiteSpace: "nowrap" }}>
            {I(v.t?.mtSent)}<b style={{ color: "#22304A" }}>{I(v.sentCount)}</b>
          </span>
          <span style={{ width: "1px", height: "14px", background: "#E4DDD0" }} />
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500, fontSize: "12px", color: "#4A443D", whiteSpace: "nowrap" }}>
            {I(v.t?.mtRecv)}<b style={{ color: "#22304A" }}>{I(v.recvCount)}</b>
          </span>
        </div>
      </div>
      {!sel && v.cmFlight ? (
        <FlightCard key={v.cmFlight.key} f={v.cmFlight} started={started} onDone={v.cmFlightDone} />
      ) : !sel ? null : (
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 5, background: "#fff", borderRadius: "26px 26px 0 0", boxShadow: "0 -8px 30px rgba(40,30,20,.12)", padding: "10px 0 24px", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 18px" }}>
            <span style={{ fontSize: "24px", lineHeight: "1" }}>{I(sel.flag)}</span>
            <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "22px", color: "#22304A", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>{I(sel.name)}</span>
              <span style={{ fontWeight: 500, fontSize: "12px", color: "#8E8A84" }}>{I(sel.countText)}</span>
            </div>
            <div onClick={v.cmClose} role="button" aria-label="close" style={{ width: "34px", height: "34px", borderRadius: "17px", background: "#F3F0EA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "var(--fs-caption-sm)" }}>✕</div>
          </div>
          <div style={{ marginTop: "14px", display: "flex", gap: "12px", overflowX: "auto", padding: "2px 18px 4px", scrollSnapType: "x mandatory", scrollPadding: "0 18px", scrollbarWidth: "none" }}>
            {each(sel.cards, (c: any) => (
              <div className="dc-hover-2" onClick={c.open || undefined} role={c.open ? "button" : undefined} style={{ flex: "none", width: "132px", cursor: "pointer", scrollSnapAlign: "start", transition: "transform .15s ease" }}>
                <div style={{ position: "relative", height: "160px", borderRadius: "18px", overflow: "hidden", background: "#EFE7DB", boxShadow: "0 6px 16px rgba(40,30,20,.12)" }}>
                  <img src={c.photo} alt={c.caption} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {c.mine ? <span style={{ position: "absolute", left: "8px", top: "8px", padding: "2px 8px", borderRadius: "9px", background: "rgba(255,255,255,.92)", fontWeight: 700, fontSize: "10px" }}>{I(v.t?.cmYou)}</span> : null}
                  {c.isLetter ? <div style={{ position: "absolute", right: "8px", top: "8px", width: "26px", height: "35px", background: "url(./assets/stamp-1.png) center / contain no-repeat", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))", transform: "rotate(6deg)" }} /> : null}
                  {c.like ? (
                    <span onClick={(e) => { e.stopPropagation(); c.like(); }} role="button" aria-pressed={c.liked} aria-label="like" style={{ position: "absolute", left: "8px", bottom: "8px", padding: "3px 9px", borderRadius: "11px", background: "rgba(255,255,255,.94)", fontWeight: 700, fontSize: "11.5px", color: c.liked ? "#E5483D" : "#22304A", cursor: "pointer" }}>{c.liked ? "♥" : "♡"}{" "}{I(c.likes)}</span>
                  ) : null}
                </div>
                <span style={{ display: "block", marginTop: "8px", fontWeight: 700, fontSize: "12.5px", lineHeight: "17px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(c.whoFlag)}{" "}{I(c.who)}</span>
                <span style={{ display: "block", fontWeight: 500, fontSize: "11.5px", lineHeight: "16px", color: "#8E8A84", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(c.caption)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
