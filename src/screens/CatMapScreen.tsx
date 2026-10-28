// CAT MAP tab — the spinning globe (3D, Three.js; 2D without WebGL) with the cats and public letters shared from each country.
// Pan / pinch / zoom; tap a bubble to see that country's posts in a sheet (the nav hides while it's open);
// tap a cat moment to open it as a letter. The feed itself lives in the Feed tab.
// My cat pals, on the globe where they are: tap one and the way between you shows — abroad, the globe turns and zooms until
// both ends are in view (the way resting on it, the two cats at its ends); in your own country it zooms into it and
// a real close-up map (DetailMap) takes over, the two cats on it. Zoom in past the globe's closest and it does too.
// Two views, one switch at the top (the last one kept): the World — public profiles, two or three birds at a time
// with others' public letters (only their own way showing, gone as they pass), examples until there are any; and My
// letters — you and your cat pals, one way to each, a bird only for a letter on its way. Pick a profile and only its
// ways show (the rest holds still); in My letters, a small card: who, letters each way, their letters. Tap the globe
// itself to let go. Calm until you pick; then only what's yours to see.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

/** the World's senders, at the top (in place of the examples note): collapsed, a frosted white strip — two faces and a
 *  count, "Sending letters" (who's here right now: a red dot on their face; examples are said so once it's open, and
 *  on the globe); tapped, it grows into the list (each of them with their way and how far —
 *  their face and the one it's going to, overlapping — "View" to
 *  open their profile and intro), the strip fading out as the rows come in; tapped again, or anywhere else, it folds back.
 *  Examples are said so. */
const SN_TINT = ["#B98CFF", "#F2716A", "#FFE066", "#BDF26B", "#7FD4FF", "#FFB070"];
const SN_EASE = "cubic-bezier(.32,.72,0,1)";
function Senders({ s, onView }: { s: any; onView: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null), pill = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null);
  // the box's size, measured: the strip's own width collapsed, the whole row open — so it can grow between the two
  const [box, setBox] = useState<{ w: number; h: number; full: number; wide: number } | null>(null);
  useLayoutEffect(() => {
    const host = wrap.current?.parentElement; if (!host) return;
    const measure = () => {
      const full = host.clientWidth;
      // open: about the strip's own width (it grows down, hardly sideways) — never the whole row
      const strip = pill.current ? Math.min(full, pill.current.offsetWidth) : full, wide = Math.min(full, Math.max(strip, 284));
      if (open && body.current) setBox({ w: wide, h: body.current.offsetHeight, full, wide });
      else setBox({ w: strip, h: pill.current ? pill.current.offsetHeight : 52, full, wide });
    };
    measure();
    document.fonts?.ready.then(measure);   // (measured again once the fonts are in: the strip's own width changes)
    const ro = new ResizeObserver(measure); ro.observe(host); return () => ro.disconnect();
  }, [open, s.n, s.title]);
  // open: a tap anywhere else folds it back
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away, true); return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);
  const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t = (d: number, delay = 0) => (still ? "0s" : d + "s") + " " + SN_EASE + " " + (still ? "0s" : delay + "s");
  const dot = (p: any, i: number, size: number) => (
    <span style={{ position: "relative", flex: "none", width: size + "px", height: size + "px", borderRadius: "50%", background: SN_TINT[i % SN_TINT.length], padding: "3px", boxSizing: "border-box", display: "flex" }}>
      <img src={p.photo} alt="" draggable={false} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} />
      {/* here right now: the red dot (as on the globe's markers) */}
      {p.active ? <span aria-label="active" style={{ position: "absolute", zIndex: 3, right: "-1px", top: "-1px", width: "11px", height: "11px", borderRadius: "50%", background: "#FF4B3E", border: "2px solid #fff", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} /> : null}
    </span>
  );
  // a row's faces: who it's from, and where it's going (their cat, or — someone real, whose photo isn't theirs to show
  // — the country's flag), the second tucked behind the first
  const pair = (p: any, i: number) => (
    <span style={{ flex: "none", position: "relative", width: "54px", height: "38px" }}>
      <span style={{ position: "absolute", left: "20px", top: "0", display: "flex", borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}>
        {p.toPhoto ? dot({ photo: p.toPhoto }, i + 3, 34) : <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>{p.toFlag}</span>}
      </span>
      <span style={{ position: "absolute", left: "0", top: "2px", display: "flex", borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}>{dot(p, i, 34)}</span>
    </span>
  );
  const chev = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 5l4.5 4.5L11.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const tag = s.tag ? <span style={{ flex: "none", padding: "1px 7px", borderRadius: "8px", background: "#F0EBE1", fontWeight: 700, fontSize: "10px", lineHeight: "15px", color: "#8E8A84" }}>{I(s.tag)}</span> : null;
  const layer = (on: boolean) => ({ position: "absolute", left: "0", top: "0", opacity: on ? 1 : 0, pointerEvents: on ? "auto" : "none", visibility: on || box ? "visible" : "hidden" } as const);
  return (
    <div ref={wrap} role="region" aria-label={s.title}
      style={{ pointerEvents: "auto", position: "relative", width: box ? box.w + "px" : "auto", height: box ? box.h + "px" : "52px", maxWidth: "100%", borderRadius: open ? "22px" : "26px",
        background: "rgba(255,255,255,.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: open ? "0 14px 34px rgba(40,30,20,.16)" : "0 8px 22px rgba(40,30,20,.12)",
        color: "#22304A", overflow: "hidden", transition: ["width", "height", "border-radius", "box-shadow"].map((k) => k + " " + t(0.5)).join(", "), animation: "cp-fade .35s ease" }}>
      {/* collapsed: the strip (its natural width, measured) */}
      <div ref={pill} onClick={() => setOpen(true)} role="button" aria-expanded={false} aria-label={s.open} aria-hidden={open}
        style={{ ...layer(!open), width: "max-content", maxWidth: box ? box.full + "px" : "none", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", padding: "7px 14px 7px 7px", cursor: "pointer",
          transform: open ? "scale(.96)" : "none", transformOrigin: "left top", transition: "opacity " + t(open ? 0.18 : 0.3, open ? 0 : 0.16) + ", transform " + t(0.4) }}>
        <span style={{ flex: "none", display: "flex" }}>
          {s.list.slice(0, 2).map((p: any, i: number) => <span key={p.key} style={{ marginLeft: i ? "-12px" : "0", display: "flex", borderRadius: "50%", boxShadow: i ? "-2px 0 0 #fff" : "none" }}>{dot(p, i, 38)}</span>)}
          {s.n > 2 ? <span style={{ marginLeft: "-12px", width: "38px", height: "38px", borderRadius: "50%", background: "#EEF0F4", boxShadow: "-2px 0 0 #fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "13px" }}>+{s.n - 2}</span> : null}
        </span>
        <span style={{ minWidth: "0", display: "flex", alignItems: "center", gap: "7px" }}>
          <b style={{ fontWeight: 700, fontSize: "15px", lineHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(s.title)}</b>
        </span>
        <span style={{ flex: "none", marginLeft: "2px", display: "flex", color: "#22304A" }}>{chev}</span>
      </div>
      {/* open: the list, the rows rising in one after another */}
      <div ref={body} aria-hidden={!open} style={{ ...layer(open), width: box ? box.wide + "px" : "100%", transition: "opacity " + t(open ? 0.3 : 0.16, open ? 0.1 : 0) }}>
        <div onClick={() => setOpen(false)} role="button" aria-expanded={true} aria-label={s.shut}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 14px 11px 16px", borderBottom: "1px solid rgba(34,48,74,.08)", cursor: "pointer" }}>
          <span style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "6px" }}>
            <b style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(s.title)}</b>{tag}
          </span>
          <span style={{ flex: "none", display: "flex", transform: open ? "rotate(180deg)" : "none", transition: "transform " + t(0.45, 0.05) }}>{chev}</span>
        </div>
        <div style={{ maxHeight: "min(46vh, 300px)", overflowY: "auto", padding: "6px 0 8px" }}>
          {s.list.map((p: any, i: number) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px 6px 14px", opacity: open ? 1 : 0, transform: open ? "none" : "translateY(8px)",
              transition: "opacity " + t(0.35, open ? 0.12 + Math.min(i, 8) * 0.04 : 0) + ", transform " + t(0.45, open ? 0.12 + Math.min(i, 8) * 0.04 : 0) }}>
              {pair(p, i)}
              <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                <b style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}{p.km ? <span style={{ marginLeft: "6px", color: "#9AA1B0", fontWeight: 500, fontSize: "11.5px" }}>{I(p.km)}</span> : null}</b>
                <span style={{ fontWeight: 500, fontSize: "11px", lineHeight: "15px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.route)}</span>
              </span>
              <span onClick={() => { setOpen(false); onView(p); }} role="button" tabIndex={open ? 0 : -1} className="dc-hover-8" style={{ flex: "none", height: "30px", padding: "0 13px", borderRadius: "15px", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(34,48,74,.14)", display: "flex", alignItems: "center", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", whiteSpace: "nowrap" }}>{I(s.view)}</span>
            </div>
          ))}
          {s.note ? <span style={{ display: "block", padding: "6px 16px 2px", fontWeight: 500, fontSize: "10.5px", lineHeight: "14px", color: "#9AA1B0" }}>{I(s.note)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function CatMap({ v }: { v: Vals }) {
  const [started, setStarted] = useState(false);
  const route = v.cmRoute, T = v.cmT || {};
  const mineView = v.cmView === "mine", mine = v.cmMine || {};
  const sel = route || mineView ? null : v.cmSel2 || v.cmSel;
  // the same country at both ends: the globe zooms into it first, then the close-up map comes in over it
  const [detail, setDetail] = useState(false);
  // zoomed past the globe's closest (no way picked): the close-up map, opened where the globe's middle was
  const [explore, setExplore] = useState<{ lon: number; lat: number } | null>(null);
  useEffect(() => { if (route) setExplore(null); }, [route?.key]);
  // a place tapped (one marker, or several close together): who's there, in a sheet — cat pals to pick, and the other
  // cat lovers' moments from there. Only moments there (no cat pal): straight to them, as before.
  const [place, setPlace] = useState<{ title: string; n: number; pals: any[]; others: any[]; ccs: string[]; mine?: boolean } | null>(null);
  // example profiles tapped (not real people): who they are, said so — nothing to write to
  const [exList, setExList] = useState<any[] | null>(null);
  /** My letters: a cat pal tapped (or, several close together, the list of them to pick from); you alone: nothing */
  const openMine = (ccs: string[]) => {
    const pals = (mine.pals || []).filter((p: any) => ccs.includes(p.cc));
    if (pals.length === 1) { mine.pick(pals[0].id); return; }
    if (pals.length) setPlace({ title: [...new Set(pals.map((p: any) => p.country))].join(" · "), n: pals.length, pals, others: [], ccs, mine: true });
  };
  const openPlaces = (ccs: string[]) => {
    const all = (v.cmPlaces || []).filter((p: any) => ccs.includes(p.cc)), ps = all.filter((p: any) => !p.example);
    if (!ps.length) { if (all.length) setExList(all); return; }
    if (ps.length === 1 && !ps[0].pals.length) { v.cmSelect?.(ps[0].cc); return; }
    setPlace({ title: ps.map((p: any) => p.country).join(" · "), n: ps.reduce((a: number, p: any) => a + p.count, 0), pals: ps.flatMap((p: any) => p.pals), others: ps.filter((p: any) => p.others), ccs });
  };
  /** on the close-up map: the cats of one bubble (you're on the card, not in the list) */
  const openCats = (keys: string[]) => {
    const pals = (v.cmPals || []).filter((p: any) => keys.includes(p.id));
    if (!pals.length) return;
    setPlace({ title: [...new Set(pals.map((p: any) => p.country))].join(" · "), n: pals.length, pals, others: [], ccs: [...new Set<string>(pals.map((p: any) => p.cc))] });
  };
  // a sender's "View" (the strip at the top): their profile and intro, in a sheet (an example's said so)
  const [prof, setProf] = useState<any | null>(null);
  useEffect(() => { setPlace(null); setExList(null); setProf(null); }, [route?.key, v.cmView]);
  // what's picked, on the globe: only its ways show (the World: the place tapped; My letters: the cat pal)
  const at = (cc?: string | null) => { const g = cc ? (v.cmPlaces || []).find((x: any) => x.cc === cc) : null; return g ? { lon: g.lon, lat: g.lat } : null; };
  const focus = mineView ? (mine.sel && mine.sel.placed ? { lon: mine.sel.lon, lat: mine.sel.lat } : null) : at(prof ? prof.cc : place ? place.ccs[0] : exList ? exList[0].cc : sel ? sel.cc : null);
  const letGo = () => { if (mineView) mine.unpick?.(); else { setPlace(null); setExList(null); setProf(null); v.cmClose?.(); v.cmJourney?.close?.(); } };
  // the sheet is up: the tab bar steps aside (as for the other sheets here)
  const placeOpen = !!place || !!exList || !!prof;
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
        } : mineView ? {
          // My letters: you and your cat pals, one way to each; a bird only for a letter on its way (the latest one's own
          // flight); a cat pal picked: only its way, clearly
          groups: mine.places || [], home: v.cmHome, routes: mine.routes || [], height: "100%", onCluster: openMine, onSelect: (cc: string) => openMine([cc]),
          selected: null, controlsBottom: mine.sel || mine.empty || v.cmFlight ? 200 : 104, zoomButtons: true,
          flight: v.cmFlight ? { a: v.cmFlight.a, b: v.cmFlight.b, play: v.cmFlight.play } : null, flightBird: true, onFlightStart: () => setStarted(true),
          pins: [], focus, onBlankTap: letGo,
        } : {
          // the World: public profiles (people are where their country is — the app keeps no finer place; close ones share
          // a marker until you zoom in), two or three birds at a time, slowly; a place tapped: only its ways, the rest still
          groups: v.cmPlaces || [], home: null, routes: [], height: "100%", onSelect: (cc: string) => openPlaces([cc]), onCluster: openPlaces,
          selected: place ? place.ccs[0] : sel ? sel.cc : null, controlsBottom: sel || place ? 12 : 104, zoomButtons: true, flight: null,
          pins: [], journeys: v.cmJourneys || [], journeyS: 36, maxBirds: 3, exampleTag: T.exTag, focus, onBlankTap: letGo };
        return hasWebGL() ? <Suspense fallback={null}><GlobeMap3D {...props} onZoomPast={(at) => { if (!route) setExplore(at); }} /></Suspense> : <GlobeMap {...props} />;
      })()}
      {/* the top: the one switch [World | My letters], and the sample note or who's
          sending letters (examples, said so)
          (not while a way is picked: its own back button is there) */}
      <div style={{ display: route || explore ? "none" : "flex", position: "absolute", left: "16px", right: "16px", top: "16px", zIndex: 6, flexDirection: "column", alignItems: "flex-start", gap: "8px", pointerEvents: "none" }}>
        <div role="tablist" aria-label={T.cmViewWorld + " / " + T.cmViewMine} style={{ pointerEvents: "auto", padding: "3px", borderRadius: "18px", background: "rgba(255,255,255,.94)", boxShadow: "0 4px 14px rgba(40,30,20,.12)", display: "flex", gap: "2px" }}>
          {([["world", T.cmViewWorld], ["mine", T.cmViewMine]] as [string, string][]).map(([id, label]) => {
            const on = (v.cmView || "world") === id;
            return (
              <span key={id} onClick={() => { if (!on) v.cmSetView(id); }} role="tab" aria-selected={on} className="dc-hover-2"
                style={{ padding: "6px 14px", borderRadius: "15px", background: on ? "#22304A" : "transparent", color: on ? "#fff" : "#4A443D", fontWeight: 700, fontSize: "12.5px", lineHeight: "16px", whiteSpace: "nowrap", cursor: on ? "default" : "pointer", transition: "background .2s ease, color .2s ease" }}>{I(label)}</span>
            );
          })}
        </div>
        {v.cmIsSample ? <span style={{ padding: "3px 9px", borderRadius: "10px", background: "rgba(255,255,255,.82)", fontWeight: 500, fontSize: "11px", lineHeight: "15px", color: "#C9785D" }}>{I(v.cmSub2)}</span>
          : !mineView && v.cmSenders ? <Senders s={v.cmSenders} onView={(p) => { v.cmJourney?.close?.(); v.cmClose?.(); setPlace(null); setExList(null); setProf(p); }} />
          : !mineView && v.cmJourneyEx ? <span style={{ padding: "3px 9px", borderRadius: "10px", background: "rgba(255,255,255,.82)", fontWeight: 500, fontSize: "11px", lineHeight: "15px", color: "#8E8A84" }}>🕊️ {I(v.cmJourneyEx)}</span> : null}
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
      {place && !route ? (
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
              <div key={p.id} onClick={() => { const m = place.mine; setPlace(null); if (m) mine.pick(p.id); else v.cmPick(p.id, "pals"); }} role="button" aria-label={p.name + ", " + p.country} className="dc-hover-2"
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
      {/* example profiles tapped: who they are — examples, not real people */}
      {exList && !route && !mineView ? (
        <div role="dialog" aria-label={T.exProfiles} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 6, maxHeight: "52%", display: "flex", flexDirection: "column", background: "#FBF7EE", borderRadius: "26px 26px 0 0", boxShadow: "0 -8px 30px rgba(40,30,20,.12)", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ flex: "none", padding: "10px 18px 6px" }}>
            <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", color: "#22304A", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>{I(T.exProfiles)}</span>
              <span onClick={() => setExList(null)} role="button" aria-label={T.cmClose} style={{ flex: "none", width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", color: "#5E6A80" }}>✕</span>
            </div>
            <span style={{ display: "block", marginTop: "4px", fontWeight: 500, fontSize: "12px", lineHeight: "17px", color: "#8E8A84" }}>{I(T.exProfileNote)}</span>
          </div>
          <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "6px 14px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {exList.map((p: any) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)" }}>
                <Face src={p.example.photo} flag={p.flag} size={42} />
                <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <b style={{ fontSize: "14.5px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.example.name)}</b>
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(p.country)}</span>
                </span>
                <span style={{ flex: "none", padding: "2px 8px", borderRadius: "9px", background: "#F0EBE1", fontWeight: 700, fontSize: "10.5px", color: "#8E8A84" }}>{I(T.exTag)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* a sender's profile (from the strip at the top): who, where, their intro — an example's said so; a real person's
          is only what they've made public (their cat, the letter they shared), and more cats from there */}
      {prof && !route && !mineView ? (
        <div role="dialog" aria-label={prof.name} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 7, maxHeight: "60%", display: "flex", flexDirection: "column", background: "#FBF7EE", borderRadius: "26px 26px 0 0", boxShadow: "0 -8px 30px rgba(40,30,20,.14)", animation: "cp-sheet .32s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8", margin: "10px auto 0", flex: "none" }} />
          <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "14px 18px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <Face src={prof.photo} flag={prof.flag} size={64} />
              <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "0" }}>
                  <b style={{ fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", color: "#22304A", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(prof.name)}</b>
                  {prof.example ? <span style={{ flex: "none", padding: "2px 8px", borderRadius: "9px", background: "#F0EBE1", fontWeight: 700, fontSize: "10.5px", color: "#8E8A84" }}>{I(v.cmSenders?.tag || T.exTag)}</span> : null}
                </span>
                <span style={{ fontWeight: 500, fontSize: "12.5px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(prof.route)}</span>
              </span>
              <span onClick={() => setProf(null)} role="button" aria-label={T.cmClose} style={{ flex: "none", alignSelf: "flex-start", width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#5E6A80" }}>✕</span>
            </div>
            {prof.bio || prof.shared ? (
              <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "18px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)", animation: "cp-fadeup .4s .08s ease both" }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: "11.5px", color: "#8E8A84" }}>{I(prof.bio ? v.cmSenders?.about : v.cmSenders?.sharedLabel)}{prof.cat ? " · 🐈 " + prof.cat : ""}</span>
                <span style={{ display: "block", marginTop: "6px", fontWeight: 500, fontSize: "14.5px", lineHeight: "22px", color: "#22304A", whiteSpace: "pre-wrap" }}>{I(prof.bio || prof.shared)}</span>
              </div>
            ) : null}
            {prof.example ? <span style={{ display: "block", marginTop: "12px", fontWeight: 500, fontSize: "11.5px", lineHeight: "16px", color: "#9AA1B0" }}>{I(v.cmSenders?.exNote)}</span>
              : prof.moreHere ? (
                <div onClick={() => { const cc = prof.cc; setProf(null); openPlaces([cc]); }} role="button" className="dc-hover-8" style={{ marginTop: "14px", height: "46px", borderRadius: "23px", boxShadow: "inset 0 0 0 1.5px #22304A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", color: "#22304A", cursor: "pointer" }}>{I(prof.moreHere)}</div>
              ) : null}
          </div>
        </div>
      ) : null}
      {/* a bird tapped: what it carries, as far as you may know (never the letter itself) */}
      {!route && !mineView && !explore && !place && !exList && !prof && !sel && v.cmJourney ? (
        <div role="dialog" aria-label={v.cmJourney.title} style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", zIndex: 6, padding: "12px 14px 12px 16px", borderRadius: "20px", background: "rgba(255,255,255,.97)", boxShadow: "0 10px 30px rgba(0,20,40,.18)", display: "flex", alignItems: "flex-start", gap: "10px", animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
          <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" style={{ flex: "none", width: "40px", marginTop: "2px", transform: "scaleX(-1)" }} />
          <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 700, fontSize: "11.5px", color: v.cmJourney.mine ? "#E5483D" : "#8E8A84" }}>{I(v.cmJourney.title)}{v.cmJourney.sample ? " · " + v.cmJourney.sample : ""}</span>
            <span style={{ fontWeight: 700, fontSize: "var(--fs-caption)", lineHeight: "19px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.cmJourney.route)}</span>
            <span style={{ fontWeight: 500, fontSize: "12px", color: "#5E6A80" }}>{I(v.cmJourney.status)}{v.cmJourney.when ? " · " + v.cmJourney.when : ""}</span>
            <span style={{ marginTop: "2px", fontWeight: 400, fontSize: "11px", lineHeight: "15px", color: "#9AA1B0" }}>{I(v.cmJourney.note)}</span>
          </span>
          <span onClick={v.cmJourney.close} role="button" aria-label={T.cmClose} style={{ flex: "none", width: "28px", height: "28px", borderRadius: "14px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#5E6A80" }}>✕</span>
        </div>
      ) : null}
      {/* My letters: the cat pal picked — who, letters each way (the real ones), their letters; or, nothing yet, where the
          journey will be and the first letter */}
      {mineView && !route && !explore && !place && (mine.sel || mine.empty) ? (
        <div role="dialog" aria-label={mine.sel ? mine.sel.name : mine.empty.text} style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", zIndex: 6, padding: "12px 12px 12px 16px", borderRadius: "20px", background: "rgba(255,255,255,.97)", boxShadow: "0 10px 30px rgba(0,20,40,.16)", display: "flex", alignItems: "center", gap: "12px", animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
          {mine.sel ? (
            <>
              <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
                <b style={{ fontSize: "14.5px", lineHeight: "19px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(mine.sel.name)}{" · "}<span style={{ fontWeight: 500, color: "#5E6A80" }}>{I(mine.sel.place)}</span></b>
                <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(mine.sel.stat)}</span>
              </span>
              {mine.sel.open ? <span onClick={mine.sel.open} role="button" className="dc-hover-8" style={{ flex: "none", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#22304A", color: "#fff", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", cursor: "pointer" }}>{I(mine.sel.view)}</span> : null}
              <span onClick={mine.unpick} role="button" aria-label={T.cmClose} style={{ flex: "none", width: "28px", height: "28px", borderRadius: "14px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#5E6A80" }}>✕</span>
            </>
          ) : (
            <>
              <span style={{ flex: "1", minWidth: "0", fontWeight: 500, fontSize: "13px", lineHeight: "18px", color: "#22304A" }}>{I(mine.empty.text)}</span>
              <span onClick={mine.empty.go} role="button" className="dc-hover-8" style={{ flex: "none", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#22304A", color: "#fff", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", cursor: "pointer" }}>{I(mine.empty.cta)}</span>
            </>
          )}
        </div>
      ) : null}
      {route || explore || place || exList || prof || (mineView ? mine.sel || mine.empty : v.cmJourney) ? null : mineView && v.cmFlight ? (
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
