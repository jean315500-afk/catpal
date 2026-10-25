// CAT MAP tab — the spinning globe (3D, Three.js; 2D without WebGL) with the cats and public letters shared from each country.
// Pan / pinch / zoom; tap a bubble to see that country's posts in a sheet (the nav hides while it's open);
// tap a cat moment to open it as a letter. The feed itself lives in the Feed tab.
// My cat pals, on the globe where they are: tap one and the way between you shows — abroad, the globe turns and zooms until
// both ends are in view (the way resting on it, the two cats at its ends); in your own country it zooms into it and
// a real close-up map (DetailMap) takes over, the two cats on it. Zoom in past the globe's closest and it does too.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { lazy, Suspense, useEffect, useState } from 'react';
import GlobeMap from '../community/GlobeMap';
const DetailMap = lazy(() => import('../community/DetailMap'));
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

/** the latest letter's journey: while it flies (once), the bar fills with the cat running along; then "Sent" for a
 *  moment, and it rests (the bar full) — you stay on the Map. A letter that has flown before just rests. */
function FlightCard({ f, started, onDone }: { f: any; started: boolean; onDone: (f: any) => void }) {
  const [phase, setPhase] = useState<"fly" | "done" | "rest">(f.play ? "fly" : "rest");
  useEffect(() => {
    if (!f.play || !started) return;
    const fly = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FLIGHT_S * 1000 + 350;   // the globe sets off 0.35 s in
    const a = setTimeout(() => { setPhase("done"); onDone(f); }, fly), b = setTimeout(() => setPhase("rest"), fly + 2400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [started, f.key]);
  const done = phase === "done", resting = phase === "rest";
  const ease = "cubic-bezier(.45,0,.55,1)", run = phase === "fly" && started;   // the same easing as the letter on the globe
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
              <div style={{ height: "100%", width: resting ? "100%" : "0", borderRadius: "3px", background: "#22304A", animation: run ? `cp-progress ${FLIGHT_S}s ${ease} .35s both` : "none" }} />
            </div>
            {!resting ? (
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

/** the round photo of a cat, with its country's flag on it (the pal strip, the way's card) */
function Face({ src, flag, size, ring }: { src: string; flag: string; size: number; ring?: string }) {
  return (
    <span style={{ position: "relative", flex: "none", width: size + "px", height: size + "px" }}>
      <span style={{ position: "absolute", inset: "0", borderRadius: "50%", overflow: "hidden", border: "2.5px solid " + (ring || "#fff"), boxSizing: "border-box", boxShadow: "0 3px 8px rgba(34,48,74,.18)", background: "#F3EEE4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42 + "px" }}>
        {src ? <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : "🐈"}
      </span>
      <span aria-hidden="true" style={{ position: "absolute", right: "-4px", bottom: "-2px", width: "18px", height: "18px", borderRadius: "9px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", lineHeight: "1" }}>{flag}</span>
    </span>
  );
}

function CatMap({ v }: { v: Vals }) {
  const [started, setStarted] = useState(false);
  const route = v.cmRoute, T = v.cmT || {};
  const sel = route ? null : v.cmSel2 || v.cmSel;
  // the same country at both ends: the globe zooms into it first, then the close-up map comes in over it
  const [detail, setDetail] = useState(false);
  // zoomed past the globe's closest (no way picked): the close-up map, opened where the globe's middle was
  const [explore, setExplore] = useState<{ lon: number; lat: number } | null>(null);
  useEffect(() => { if (route) setExplore(null); }, [route?.key]);
  // a place tapped (one marker, or several close together): who's there, in a sheet — cat pals to pick, and the other
  // cat lovers' moments from there. Only moments there (no cat pal): straight to them, as before.
  const [place, setPlace] = useState<{ title: string; n: number; pals: any[]; others: any[]; ccs: string[] } | null>(null);
  const openPlaces = (ccs: string[]) => {
    const ps = (v.cmPlaces || []).filter((p: any) => ccs.includes(p.cc));
    if (!ps.length) return;
    if (ps.length === 1 && !ps[0].pals.length) { v.cmSelect?.(ps[0].cc); return; }
    setPlace({ title: ps.map((p: any) => p.country).join(" · "), n: ps.reduce((a: number, p: any) => a + p.count, 0), pals: ps.flatMap((p: any) => p.pals), others: ps.filter((p: any) => p.others), ccs });
  };
  /** on the close-up map: the cats of one bubble (you're on the card, not in the list) */
  const openCats = (keys: string[]) => {
    const pals = (v.cmPals || []).filter((p: any) => keys.includes(p.id));
    if (!pals.length) return;
    setPlace({ title: [...new Set(pals.map((p: any) => p.country))].join(" · "), n: pals.length, pals, others: [], ccs: [...new Set<string>(pals.map((p: any) => p.cc))] });
  };
  useEffect(() => { setPlace(null); }, [route?.key, v.cmList?.id]);
  // the sheet is up: the tab bar steps aside (as for the other sheets here)
  const placeOpen = !!place;
  useEffect(() => { v.cmPlaceShown?.(placeOpen); return () => { if (placeOpen) v.cmPlaceShown?.(false); }; }, [placeOpen]);
  useEffect(() => {
    if (!route || !route.same || !route.placed) { setDetail(false); return; }
    const t = setTimeout(() => setDetail(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 680);
    return () => clearTimeout(t);
  }, [route?.key, route?.same]);
  return (
    <div data-screen-label="Cat Map" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflow: "hidden" }}>
      {/* a real sky behind the globe: clouds drifting slowly (two layers moving apart, so they seem to shift) */}
      <div className="cp-clouds" aria-hidden="true"><i className="cp-clouds-far" /><i className="cp-clouds-near" /></div>
      {(() => {
        // a way picked: only it (resting, drawn), its two cats at its ends, the globe turned to it — nothing else
        // (no place for them on the map: no way and no marker made up — the card and their letters only)
        const props = route ? {
          groups: [], home: null, routes: [], height: "100%", controlsBottom: 230, zoomButtons: route.placed && !route.same,
          flight: route.placed && !route.same ? { a: route.a, b: route.b, play: false } : null, aimAt: route.placed ? { a: route.a, b: route.b } : null,
          pins: !route.placed || route.same ? [] : [{ key: "me", ...route.a, photo: route.me.photo, name: route.me.name, mine: true }, { key: "them", ...route.b, photo: route.them.photo, name: route.them.name, ring: route.tint, active: route.them.active }],
        } : { groups: v.cmPlaces || [], home: v.cmHome, routes: [], height: "100%", onSelect: (cc: string) => openPlaces([cc]), onCluster: openPlaces,
          selected: place ? place.ccs[0] : sel ? sel.cc : null, controlsBottom: sel || place ? 12 : 104, zoomButtons: !!sel || !v.cmFlight, flight: v.cmFlight ? { a: v.cmFlight.a, b: v.cmFlight.b, play: v.cmFlight.play } : null, onFlightStart: () => setStarted(true),
          // people are where their country is (the app keeps no finer place): one marker per place — never pushed aside onto
          // a neighbour or the sea; close ones share a marker until you zoom in
          pins: [] };
        return hasWebGL() ? <Suspense fallback={null}><GlobeMap3D {...props} onZoomPast={(at) => { if (!route) setExplore(at); }} /></Suspense> : <GlobeMap {...props} />;
      })()}
      {/* title chip (not while a way is picked: its own back button is there) */}
      <div style={{ display: route || explore ? "none" : "flex", position: "absolute", left: "16px", right: "70px", top: "16px", flexDirection: "column", alignItems: "flex-start", gap: "8px", pointerEvents: "none" }}>
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
        {/* letters sent, letters received, cat pals: each opens its list under the map (the one open is in its colour) */}
        <div role="tablist" aria-label="letters and cat pals" style={{ pointerEvents: "auto", padding: "4px 6px", borderRadius: "16px", background: "rgba(255,255,255,.94)", boxShadow: "0 4px 14px rgba(40,30,20,.10)", display: "flex", alignItems: "center", gap: "2px" }}>
          {([["sent", v.cmT?.mtSent, v.sentCount, "#E5483D"], ["received", v.cmT?.mtRecv, v.recvCount, "#3F7FD6"], ["pals", v.cmT?.cmPalsTab, v.cmPalCount, "#A05245"]] as [string, string, number, string][]).map(([id, label, n, tint], i) => {
            const on = v.cmList?.id === id;
            return (
              <span key={id} style={{ display: "flex", alignItems: "center" }}>
                {i ? <span aria-hidden="true" style={{ width: "1px", height: "14px", background: "#E4DDD0", margin: "0 2px" }} /> : null}
                <span onClick={() => v.cmOpenList(id)} role="tab" aria-selected={on} className="dc-hover-2"
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 7px", borderRadius: "11px", background: on ? tint + "14" : "transparent", fontWeight: 500, fontSize: "12px", color: on ? tint : "#4A443D", whiteSpace: "nowrap", cursor: "pointer", transition: "background .15s ease, color .15s ease" }}>
                  {I(label)}<b style={{ color: on ? tint : "#22304A" }}>{I(n ?? 0)}</b>
                </span>
              </span>
            );
          })}
        </div>
      </div>
      {/* the country, close up (your own country at both ends): over the globe once it has zoomed in */}
      {/* the close-up map: your own country at both ends of the way picked (after the globe has zoomed in), or the globe
          zoomed past its closest — a real map to drag and zoom, the cats on it */}
      {(route && route.same && route.placed) || (!route && explore) ? (
        <div style={{ position: "absolute", inset: "0", zIndex: 4, opacity: route ? (detail ? 1 : 0) : 1, transition: "opacity .45s ease", pointerEvents: route && !detail ? "none" : "auto", animation: route ? "none" : "cp-fade .45s ease" }}>
          {(route ? detail : !!explore) ? (
            <Suspense fallback={null}>
              <DetailMap lang={v.cmLang} bottom={route ? 250 : 110}
                route={route ? { a: route.a, b: route.b } : null} start={explore}
                cats={route
                  ? [{ key: "me", ...route.a, photo: route.me.photo, name: route.me.name, place: route.me.country, mine: true }, { key: "them", ...route.b, photo: route.them.photo, name: route.them.name, place: route.them.country, ring: route.tint, active: route.them.active }]
                  : [...(v.cmMe ? [{ key: "me", ...v.cmMe, mine: true }] : []), ...(v.cmPals || []).map((p: any) => ({ key: p.id, lon: p.lon, lat: p.lat, photo: p.photo, name: p.name, place: p.country, active: p.active, onTap: () => v.cmPick(p.id, "pals") }))]}
                onBack={() => { if (route) v.cmUnpick(); else setExplore(null); }} onCluster={route ? undefined : openCats} />
            </Suspense>
          ) : null}
        </div>
      ) : null}
      {/* back to the globe from the close-up map */}
      {!route && explore ? (
        <div className="dc-hover-8" onClick={() => setExplore(null)} role="button" style={{ position: "absolute", left: "16px", top: "16px", zIndex: 6, height: "36px", padding: "0 14px 0 10px", borderRadius: "18px", background: "#fff", boxShadow: "0 4px 14px rgba(40,30,20,.14)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <span aria-hidden="true" style={{ width: "8px", height: "8px", borderLeft: "2px solid #22304A", borderBottom: "2px solid #22304A", transform: "rotate(45deg)", marginLeft: "4px" }} />
          <span style={{ fontWeight: 700, fontSize: "12.5px", color: "#22304A", whiteSpace: "nowrap" }}>{I(T.cmBackGlobe)}</span>
        </div>
      ) : null}
      {/* a list from the summary (Sent / Received / CatPals): one row per cat pal; pick one for them on the map */}
      {v.cmList && !route ? (
        <div role="dialog" aria-label={v.cmList.title} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 6, maxHeight: "52%", display: "flex", flexDirection: "column", background: "#FBF7EE", borderRadius: "26px 26px 0 0", boxShadow: "0 -8px 30px rgba(40,30,20,.14)", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ flex: "none", padding: "10px 18px 8px" }}>
            <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-hand)", fontSize: "24px", lineHeight: "26px", color: v.cmList.tint }}>{I(v.cmList.title)}</span>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#8E8A84" }}>{I(v.cmList.items.length)}</span>
              </span>
              <span onClick={v.cmCloseList} role="button" aria-label={T.cmClose} style={{ width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#22304A" }}>✕</span>
            </div>
          </div>
          <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "2px 14px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {v.cmList.items.length ? each(v.cmList.items, (p: any) => {
              const on = v.cmList.sel === p.id;
              return (
                <div key={p.id} onClick={() => v.cmPick(p.id, v.cmList.id)} role="button" aria-label={p.name + ", " + p.country} className="dc-hover-2"
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", background: "#fff", boxShadow: on ? "inset 0 0 0 1.5px " + v.cmList.tint : "0 1px 2px rgba(60,40,20,.08)", cursor: "pointer", transition: "transform .15s ease" }}>
                  <Face src={p.photo} flag={p.flag} size={42} ring={on ? v.cmList.tint : undefined} />
                  <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <b style={{ fontSize: "14.5px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}</b>
                      {p.unread ? <span aria-label={T.cmUnread} style={{ flex: "none", width: "8px", height: "8px", borderRadius: "4px", background: "#E5483D" }} /> : null}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.country)}{" · "}<span style={{ color: v.cmList.tint }}>{I(p.count)}</span></span>
                  </span>
                  <span style={{ flex: "none", fontWeight: 500, fontSize: "11px", color: "#9AA1B0", whiteSpace: "nowrap" }}>{I(p.at)}</span>
                </div>
              );
            }) : <span style={{ padding: "18px 6px", textAlign: "center", fontWeight: 500, fontSize: "13px", color: "#7A8091" }}>{I(v.cmList.empty)}</span>}
          </div>
        </div>
      ) : null}
      {route ? (
        <>
          {/* back to the whole globe */}
          <div className="dc-hover-8" onClick={v.cmUnpick} role="button" style={{ position: "absolute", left: "16px", top: "16px", zIndex: 6, height: "36px", padding: "0 14px 0 10px", borderRadius: "18px", background: "#fff", boxShadow: "0 4px 14px rgba(40,30,20,.14)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <span aria-hidden="true" style={{ width: "8px", height: "8px", borderLeft: "2px solid #22304A", borderBottom: "2px solid #22304A", transform: "rotate(45deg)", marginLeft: "4px" }} />
            <span style={{ fontWeight: 700, fontSize: "12.5px", color: "#22304A", whiteSpace: "nowrap" }}>{I(T.cmBackGlobe)}</span>
          </div>
          {/* the way: you → them, how far, how many letters; reply right here */}
          <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 6, background: "#fff", borderRadius: "26px 26px 0 0", boxShadow: "0 -8px 30px rgba(40,30,20,.12)", padding: "10px 18px 22px", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8", margin: "0 auto 12px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Face src={route.me.photo} flag={route.me.flag} size={40} ring="#FF4B3E" />
                <span style={{ minWidth: "0", display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: "13.5px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(route.me.name)}</b>
                  <span style={{ fontSize: "11.5px", color: "#8E8A84", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(route.me.country)}</span>
                </span>
              </div>
              <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                {route.km ? <span style={{ fontWeight: 700, fontSize: "11px", color: "#C9785D", whiteSpace: "nowrap" }}>{I(route.km)}</span> : null}
                <svg width="46" height="10" viewBox="0 0 46 10" aria-hidden="true"><path d="M2 5H41" fill="none" stroke="#E5483D" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 5" /><path d="M38 1.5 42 5 38 8.5" fill="none" stroke="#E5483D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", textAlign: "right" }}>
                <span style={{ minWidth: "0", display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: "13.5px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(route.them.name)}</b>
                  <span style={{ fontSize: "11.5px", color: "#8E8A84", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(route.them.country)}</span>
                </span>
                <Face src={route.them.photo} flag={route.them.flag} size={40} ring={route.tint} />
              </div>
            </div>
            {/* the letters as picked (sent to them / from them / all), and when; where it isn't on the map, said so */}
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", fontWeight: 500, fontSize: "12px", color: "#5E6A80" }}>
              <span style={{ color: route.tint, fontWeight: 700 }}>{I(route.stat)}</span>
              {!route.placed ? <><span aria-hidden="true">·</span><span>{I(T.cmNoPlace)}</span></> : null}
            </div>
            {/* their letters, or a new one to them */}
            <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
              <div className="dc-hover-8" onClick={route.them.open || undefined} role="button" aria-disabled={!route.them.open} style={{ flex: "1", height: "50px", borderRadius: "25px", boxShadow: "inset 0 0 0 1.5px #22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: route.them.open ? "pointer" : "default", opacity: route.them.open ? 1 : 0.45, transition: "transform .15s ease" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#22304A", whiteSpace: "nowrap" }}>{I(T.cmViewLetters)}</span>
              </div>
              <div className="dc-hover-8" onClick={route.them.write} role="button" style={{ flex: "1.2", height: "50px", borderRadius: "25px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", cursor: "pointer", boxShadow: "0 10px 22px rgba(34,48,74,.2)", transition: "transform .15s ease" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="1.6" /><path d="m4.4 7.2 7.6 5.6 7.6-5.6" /></svg>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff", whiteSpace: "nowrap" }}>{I(T.cmWriteLetter)}</span>
              </div>
            </div>
            {v.cmIsSample ? <span style={{ display: "block", marginTop: "8px", textAlign: "center", fontWeight: 500, fontSize: "11.5px", color: "#C9785D" }}>{I(T.cmSampleLetters)}</span> : null}
          </div>
        </>
      ) : null}
      {/* a place tapped: who's there */}
      {place && !route && !v.cmList ? (
        <div role="dialog" aria-label={place.title} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 6, maxHeight: "52%", display: "flex", flexDirection: "column", background: "#FBF7EE", borderRadius: "26px 26px 0 0", boxShadow: "0 -8px 30px rgba(40,30,20,.14)", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ flex: "none", padding: "10px 18px 8px" }}>
            <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: "8px", minWidth: "0" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", color: "#22304A", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(place.title)}</span>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#8E8A84" }}>{I(place.n)}</span>
              </span>
              <span onClick={() => setPlace(null)} role="button" aria-label={T.cmClose} style={{ flex: "none", width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#22304A" }}>✕</span>
            </div>
          </div>
          <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "2px 14px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {place.pals.length ? <span style={{ padding: "2px 4px 0", fontWeight: 700, fontSize: "11.5px", color: "#A05245" }}>{I(T.cmPlacePals)}</span> : null}
            {each(place.pals, (p: any) => (
              <div key={p.id} onClick={() => { setPlace(null); v.cmPick(p.id, "pals"); }} role="button" aria-label={p.name + ", " + p.country} className="dc-hover-2"
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)", cursor: "pointer", transition: "transform .15s ease" }}>
                <span style={{ position: "relative", flex: "none", display: "flex" }}>
                  <Face src={p.photo} flag={p.flag} size={42} />
                  {p.active ? <span aria-label="active" className="cp-active-dot" style={{ position: "absolute", right: "0", top: "0", width: "11px", height: "11px", borderRadius: "6px", background: "#FF4B3E", border: "2px solid #fff", boxSizing: "border-box" }} /> : null}
                </span>
                <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <b style={{ fontSize: "14.5px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}</b>
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.country)}{" · "}{I(p.nText)}</span>
                </span>
                <span style={{ flex: "none", fontWeight: 500, fontSize: "11px", color: "#9AA1B0", whiteSpace: "nowrap" }}>{I(p.when)}</span>
              </div>
            ))}
            {each(place.others, (g: any) => (
              <div key={"o-" + g.cc} onClick={() => { setPlace(null); v.cmSelect?.(g.cc); }} role="button" className="dc-hover-2"
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)", cursor: "pointer" }}>
                <Face src={g.otherPhoto || g.photo} flag={g.flag} size={42} />
                <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <b style={{ fontSize: "14px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(g.momentsLabel)}</b>
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(g.othersText)}</span>
                </span>
                <span aria-hidden="true" style={{ flex: "none", fontSize: "16px", color: "#9AA1B0" }}>›</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {route || v.cmList || explore || place ? null : !sel && v.cmFlight ? (
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
