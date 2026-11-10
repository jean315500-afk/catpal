// CAT MAP tab — the spinning globe (3D, Three.js; 2D without WebGL) with the cats and public letters shared from each country.
// Pan / pinch / zoom; tap a bubble to see that country's posts in a sheet (the nav hides while it's open);
// tap a cat moment to open it as a letter. The feed itself lives in the Feed tab.
// My cat pals, on the globe where they are: tap one and the way between you shows — abroad, the globe turns and zooms until
// both ends are in view (the way resting on it, the two cats at its ends); in your own country it zooms into it and
// a real close-up map (DetailMap) takes over, the two cats on it. Zoom in past the globe's closest and it does too.
// Two views, one switch at the top (the last one kept): the World — public profiles, two or three birds at a time
// with others' public letters (only their own way showing, gone as they pass), examples until there are any; and My
// letters — you and your cat pals, one way to each, a bird only for a letter on its way. Pick a profile and only its
// ways show (the rest holds still); in My CatPals, a small card: who, letters each way, their letters. Tap the globe
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

/** the World's senders, along the bottom (over the tab bar): collapsed, a frosted strip saying who's sending now —
 *  one at a time, rising in (their face and the one it's going to, "🇫🇷 Léa → 🇯🇵 Momo · 9,700 km"); tapped, it grows
 *  up into the list (each with their way and how far — "View" to open their profile and intro), the strip fading out
 *  as the rows come in; tapped again, or anywhere else, it folds back. Examples are said so. */
const SN_EASE = "cubic-bezier(.32,.72,0,1)", SN_H = 60, SN_EVERY = 3800;
function Senders({ s, onView, startOpen, onShut }: { s: any; onView: (p: any) => void; startOpen?: boolean; onShut?: () => void }) {
  const [open, setOpenRaw] = useState(!!startOpen);
  const setOpen = (o: boolean) => { setOpenRaw(o); if (!o) onShut?.(); };
  const wrap = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null);
  const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // who's shown in the strip (round and round; held while it's open)
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (open || still || s.n < 2) return;
    const id = setInterval(() => setAt((x) => (x + 1) % s.n), SN_EVERY); return () => clearInterval(id);
  }, [open, s.n]);
  // open: as tall as the list (measured), growing up from the strip
  const [h, setH] = useState(SN_H);
  useLayoutEffect(() => {
    const measure = () => setH(open && body.current ? body.current.offsetHeight : SN_H);
    measure(); document.fonts?.ready.then(measure);
  }, [open, s.n]);
  // open: a tap anywhere else folds it back
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away, true); return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);
  const t = (d: number, delay = 0) => (still ? "0s" : d + "s") + " " + SN_EASE + " " + (still ? "0s" : delay + "s");
  const dot = (p: any, size: number) => (
    <span style={{ position: "relative", flex: "none", width: size + "px", height: size + "px", borderRadius: "50%", background: "#fff", boxShadow: "inset 0 0 0 1px #DADDE3", padding: "1.5px", boxSizing: "border-box", display: "flex" }}>
      <img src={p.photo} alt="" draggable={false} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} />
    </span>
  );
  // a row's faces: who it's from, and where it's going (their cat, or — someone real, whose photo isn't theirs to show
  // — the country's flag), the second tucked behind the first
  const pair = (p: any) => (
    <span style={{ flex: "none", position: "relative", width: "54px", height: "38px" }}>
      <span style={{ position: "absolute", left: "20px", top: "0", display: "flex", borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}>
        {p.toPhoto ? dot({ photo: p.toPhoto }, 34) : <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>{p.toFlag}</span>}
      </span>
      <span style={{ position: "absolute", left: "0", top: "2px", display: "flex", borderRadius: "50%", boxShadow: "0 0 0 2px #fff" }}>{dot(p, 34)}</span>
    </span>
  );
  const chev = (up: boolean) => <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ transform: up ? "rotate(180deg)" : "none" }}><path d="M2.5 5l4.5 4.5L11.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const tag = s.tag ? <span style={{ flex: "none", padding: "1px 7px", borderRadius: "8px", background: "#F0EBE1", fontWeight: 700, fontSize: "10px", lineHeight: "15px", color: "#8E8A84" }}>{I(s.tag)}</span> : null;
  const layer = (on: boolean) => ({ position: "absolute", left: "0", right: "0", bottom: "0", opacity: on ? 1 : 0, pointerEvents: on ? "auto" : "none" } as const);
  const cur = s.list[at % s.n] || s.list[0];
  return (
    <div ref={wrap} role="region" aria-label={s.title}
      style={{ pointerEvents: "auto", position: "relative", width: "100%", height: h + "px", borderRadius: open ? "22px" : SN_H / 2 + "px",
        background: "rgba(255,255,255,.86)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: open ? "0 14px 34px rgba(40,30,20,.18)" : "0 8px 24px rgba(40,30,20,.14)",
        color: "#22304A", overflow: "hidden", transition: ["height", "border-radius", "box-shadow"].map((k) => k + " " + t(0.5)).join(", "), animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
      {/* collapsed: the strip — who's sending now */}
      <div onClick={() => setOpen(true)} role="button" aria-expanded={false} aria-label={s.open} aria-hidden={open}
        style={{ ...layer(!open), height: SN_H + "px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", padding: "0 16px 0 10px", cursor: "pointer",
          transform: open ? "scale(.97)" : "none", transformOrigin: "50% 100%", transition: "opacity " + t(open ? 0.18 : 0.3, open ? 0 : 0.16) + ", transform " + t(0.4) }}>
        <span key={"f" + cur.key} style={{ flex: "none", display: "flex", animation: still ? "none" : "cp-tick-in .5s " + SN_EASE + " both" }}>{pair(cur)}</span>
        <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "0" }}>
            <span aria-hidden="true" className="cp-active-dot" style={{ flex: "none", width: "6px", height: "6px", borderRadius: "3px", background: "#2FD36B" }} />
            <span style={{ fontWeight: 600, fontSize: "11px", lineHeight: "15px", color: "#7A8091", whiteSpace: "nowrap" }}>{I(s.title)}</span>{tag}
          </span>
          <span key={"t" + cur.key} style={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: "0", animation: still ? "none" : "cp-tick-in .5s " + SN_EASE + " .04s both" }}>
            <b style={{ minWidth: "0", fontWeight: 700, fontSize: "14px", lineHeight: "19px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(cur.flag)}{" "}{I(cur.name)}{"  →  "}{I(cur.toFlag)}{" "}{I(cur.toName || cur.toCountry)}</b>
            {cur.km ? <span style={{ flex: "none", fontWeight: 500, fontSize: "11.5px", color: "#9AA1B0", whiteSpace: "nowrap" }}>{I(cur.km)}</span> : null}
          </span>
        </span>
        <span style={{ flex: "none", display: "flex", color: "#22304A" }}>{chev(true)}</span>
      </div>
      {/* open: the list, the rows rising in one after another; the strip's place, at the bottom, folds it back */}
      <div ref={body} aria-hidden={!open} style={{ ...layer(open), transition: "opacity " + t(open ? 0.3 : 0.16, open ? 0.1 : 0) }}>
        <div style={{ maxHeight: "min(46vh, 300px)", overflowY: "auto", padding: "8px 0 4px" }}>
          {s.list.map((p: any, i: number) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px 6px 14px", opacity: open ? 1 : 0, transform: open ? "none" : "translateY(8px)",
              transition: "opacity " + t(0.35, open ? 0.12 + Math.min(i, 8) * 0.04 : 0) + ", transform " + t(0.45, open ? 0.12 + Math.min(i, 8) * 0.04 : 0) }}>
              {pair(p)}
              <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                <b style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}{p.km ? <span style={{ marginLeft: "6px", color: "#9AA1B0", fontWeight: 500, fontSize: "11.5px" }}>{I(p.km)}</span> : null}</b>
                <span style={{ fontWeight: 500, fontSize: "11px", lineHeight: "15px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.route)}</span>
              </span>
              <span onClick={() => { setOpen(false); onView(p); }} role="button" tabIndex={open ? 0 : -1} className="dc-hover-8" style={{ flex: "none", height: "30px", padding: "0 13px", borderRadius: "15px", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(34,48,74,.14)", display: "flex", alignItems: "center", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", whiteSpace: "nowrap" }}>{I(s.view)}</span>
            </div>
          ))}
          {s.note ? <span style={{ display: "block", padding: "6px 16px 2px", fontWeight: 500, fontSize: "10.5px", lineHeight: "14px", color: "#9AA1B0" }}>{I(s.note)}</span> : null}
        </div>
        <div onClick={() => setOpen(false)} role="button" aria-expanded={true} aria-label={s.shut}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px 14px", borderTop: "1px solid rgba(34,48,74,.08)", cursor: "pointer" }}>
          <span style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "6px" }}>
            <b style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(s.title)}</b>{tag}
          </span>
          <span style={{ flex: "none", display: "flex" }}>{chev(false)}</span>
        </div>
      </div>
    </div>
  );
}

/** "my letters", along the bottom (over the tab bar) — whichever map is showing: folded, the one thing that matters
 *  most now (new letters; one coming to me; one of mine on its way; else the latest; none: the first letter) — tapped,
 *  it goes there (the Mailbox, the way on the map, the letter, writing one); unfolded (the chevron), every letter, coming
 *  to me / going out — who, which way, how it stands (one still coming: only when it lands, nothing of what it says). */
const NW_H = 60;
function LetterNews({ n, onAct }: { n: any; onAct: (r: any) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away, true); return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);
  const icon = (k: string) => k === "bird" ? <img src="./assets/map/bird-letter-still.webp" alt="" style={{ width: "26px", transform: "scaleX(-1)" }} />
    : k === "pen" ? <span style={{ fontSize: "17px" }}>✎</span>
    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22304A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.8 6.8l8.2 6.1 8.2-6.1" /></svg>;
  const face = (r: any) => r.photo
    ? <img src={r.photo} alt="" draggable={false} style={{ flex: "none", width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
    : <span aria-hidden="true" style={{ flex: "none", width: "36px", height: "36px", borderRadius: "50%", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{r.flag}</span>;
  const row = (r: any) => (
    <div key={r.key} onClick={() => { setOpen(false); onAct(r); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(false); onAct(r); } }} className="dc-hover-2"
      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 14px", minHeight: "48px", boxSizing: "border-box", cursor: "pointer" }}>
      {face(r)}
      <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
        <b style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {/* (the flag once: on the face, when there's no photo) */}
          {r.dir === "in" ? <>{r.photo ? <>{I(r.flag)}{" "}</> : null}{I(r.name)} <span style={{ color: "#3F7FD6" }}>→</span> {I(n.me)}</> : <>{I(n.me)} <span style={{ color: "#E5483D" }}>→</span> {r.photo ? <>{I(r.flag)}{" "}</> : null}{I(r.name)}</>}
        </b>
      </span>
      <span style={{ flex: "none", padding: "2px 9px", borderRadius: "999px", fontWeight: 700, fontSize: "11px", lineHeight: "16px", whiteSpace: "nowrap",
        background: r.tone === "new" ? "#E5483D" : r.tone === "way" ? "#FFF1DC" : "#EEF0F4", color: r.tone === "new" ? "#fff" : r.tone === "way" ? "#8A5A2B" : "#4C5562" }}>{I(r.status)}</span>
    </div>
  );
  const section = (label: string, rows: any[], none: string) => (
    <div style={{ padding: "6px 0" }}>
      <span style={{ display: "block", padding: "4px 14px 2px", fontWeight: 700, fontSize: "11.5px", letterSpacing: ".02em", color: "#7A8091" }}>{I(label)}</span>
      {rows.length ? rows.map(row) : <span style={{ display: "block", padding: "6px 14px 8px", fontWeight: 500, fontSize: "12.5px", color: "#9AA1B0" }}>{I(none)}</span>}
    </div>
  );
  const chev = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ transform: open ? "none" : "rotate(180deg)" }}><path d="M2.5 5l4.5 4.5L11.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const t = n.top, tIn = t.dir === "in";
  return (
    <div style={{ position: "relative", width: "100%" }}>
    {/* (a letter on its way) how long till it lands — on the box's top left */}
    {t.eta && !open ? (
      <span style={{ position: "absolute", left: "18px", top: "0", transform: "translateY(-55%)", zIndex: 1, pointerEvents: "none", display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", background: "#fff",
        boxShadow: "0 2px 8px rgba(40,30,20,.14), inset 0 0 0 1.5px " + (tIn ? "rgba(76,143,224,.55)" : "rgba(255,75,62,.5)"), fontWeight: 700, fontSize: "11px", lineHeight: "15px", color: tIn ? "#2F6FC4" : "#D9382C", whiteSpace: "nowrap", animation: "cp-fade .3s ease" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{I(t.eta)}
      </span>
    ) : null}
    <div ref={wrap} role="region" aria-label={n.title}
      style={{ pointerEvents: "auto", width: "100%", borderRadius: open ? "22px" : NW_H / 2 + "px", background: "rgba(255,255,255,.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        boxShadow: open ? "0 14px 34px rgba(40,30,20,.18)" : "0 8px 24px rgba(40,30,20,.14)", color: "#22304A", overflow: "hidden", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
      {open ? (
        <div style={{ maxHeight: "min(48vh, 340px)", overflowY: "auto", paddingTop: "4px", borderBottom: "1px solid rgba(34,48,74,.08)", animation: "cp-fade .25s ease" }}>
          {section(n.recvLabel, n.recv, n.recvNone)}
          {section(n.sentLabel, n.sent, n.sentNone)}
        </div>
      ) : null}
      {/* folded: the one thing that matters most (tapped: there); the chevron: everything */}
      <div style={{ height: NW_H + "px", display: "flex", alignItems: "center" }}>
        <div onClick={() => onAct(n.top)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAct(n.top); } }}
          style={{ flex: "1", minWidth: "0", height: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "0 6px 0 12px", cursor: "pointer" }}>
          <span aria-hidden="true" style={{ flex: "none", width: "38px", height: "38px", borderRadius: "50%", background: "#FBF6EC", boxShadow: "inset 0 0 0 1px #ECE4D4", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon(n.top.icon)}</span>
          <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={{ fontWeight: 600, fontSize: "11px", lineHeight: "15px", color: "#7A8091" }}>{I(n.title)}</span>
            <b style={{ fontWeight: 700, fontSize: "14px", lineHeight: "19px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(n.top.text)}</b>
          </span>
        </div>
        <span onClick={() => setOpen((o) => !o)} role="button" tabIndex={0} aria-expanded={open} aria-label={open ? n.less : n.more} className="dc-hover-2"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}
          style={{ flex: "none", width: "48px", height: "48px", marginRight: "6px", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#22304A" }}>{chev}</span>
      </div>
    </div>
    </div>
  );
}

/** letters on the way, the world over — its own panel, opened from the chip at the top ("Letters on the way · 6"):
 *  each one's two ends (who from, who to), its way, when it lands; tapped, its way on the map. The same count as the chip. */
function TransitList({ t, onShow, onClose }: { t: any; onShow: (r: any) => void; onClose: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.("[data-transit-chip]")) onClose(); };
    document.addEventListener("pointerdown", away, true); return () => document.removeEventListener("pointerdown", away, true);
  }, []);
  const face = (photo: string, flag: string) => photo
    ? <img src={photo} alt="" draggable={false} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #fff", boxSizing: "border-box" }} />
    : <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#EEF0F4", border: "2px solid #fff", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{flag}</span>;
  return (
    <div ref={wrap} role="dialog" aria-label={t.title} style={{ pointerEvents: "auto", width: "100%", borderRadius: "22px", background: "rgba(255,255,255,.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "0 14px 34px rgba(40,30,20,.18)", overflow: "hidden", animation: "cp-rise2 .35s cubic-bezier(.2,.8,.2,1) both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 10px 8px 16px", borderBottom: "1px solid rgba(34,48,74,.08)" }}>
        <b style={{ flex: "1", minWidth: "0", fontWeight: 700, fontSize: "15px", color: "#22304A" }}>{I(t.title)}</b>
        <span onClick={onClose} role="button" tabIndex={0} aria-label={t.close} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
          style={{ flex: "none", width: "36px", height: "36px", borderRadius: "18px", background: "#F3F0EA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", color: "#22304A" }}>✕</span>
      </div>
      <div style={{ maxHeight: "min(40vh, 300px)", overflowY: "auto", padding: "4px 0 8px" }}>
        {t.list.map((r: any) => (
          <div key={r.key} onClick={() => onShow(r)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onShow(r); } }} className="dc-hover-2"
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 14px", minHeight: "48px", boxSizing: "border-box", cursor: "pointer" }}>
            <span style={{ flex: "none", position: "relative", width: "54px", height: "34px" }}>
              <span style={{ position: "absolute", left: "20px", top: "0" }}>{face("", r.toFlag)}</span>
              <span style={{ position: "absolute", left: "0", top: "0" }}>{face(r.photo, r.flag)}</span>
            </span>
            <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
              <b style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(r.name)} → {I(r.toName)}</b>
              <span style={{ fontWeight: 500, fontSize: "11.5px", lineHeight: "15px", color: "#7A8091", whiteSpace: "nowrap" }}>{I(r.flag)} → {I(r.toFlag)}</span>
            </span>
            <span style={{ flex: "none", padding: "2px 9px", borderRadius: "999px", background: "#FFF1DC", color: "#8A5A2B", fontWeight: 700, fontSize: "11px", lineHeight: "16px", whiteSpace: "nowrap" }}>{I(r.left)}</span>
          </div>
        ))}
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
  /** My CatPals: a cat pal tapped (or, several close together, the list of them to pick from); you alone: nothing */
  const openMine = (ccs: string[]) => {
    const pals = (mine.pals || []).filter((p: any) => ccs.includes(p.cc));
    if (pals.length === 1) { mine.pick(pals[0].id); return; }
    if (pals.length) setPlace({ title: [...new Set(pals.map((p: any) => p.country))].join(" · "), n: pals.length, pals, others: [], ccs, mine: true });
  };
  const openPlaces = (ccs: string[]) => {
    const all = (v.cmPlaces || []).filter((p: any) => ccs.includes(p.cc)), ps = all.filter((p: any) => !p.example);
    // your cat pals there (picked out on the World): one alone, straight to your way with them; with others, listed first
    const pals = (v.cmPals || []).filter((p: any) => ccs.includes(p.cc));
    if (pals.length === 1 && !ps.length && !all.length) { v.cmPick(pals[0].id, "pals"); return; }
    if (!ps.length && !pals.length) { if (all.length) setExList(all); return; }
    if (ps.length === 1 && !ps[0].pals.length && !pals.length) { v.cmSelect?.(ps[0].cc); return; }
    setPlace({ title: [...new Set([...pals, ...ps].map((p: any) => p.country))].join(" · "), n: pals.length + ps.reduce((a: number, p: any) => a + p.count, 0), pals: [...pals, ...ps.flatMap((p: any) => p.pals)], others: ps.filter((p: any) => p.others), ccs });
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
  // what's picked, on the globe: only its ways show (the World: the place tapped; My CatPals: the cat pal)
  const at = (cc?: string | null) => { const g = cc ? (v.cmPlaces || []).find((x: any) => x.cc === cc) : null; return g ? { lon: g.lon, lat: g.lat } : null; };
  const focus = mineView ? (mine.sel && mine.sel.placed ? { lon: mine.sel.lon, lat: mine.sel.lat } : null) : at(prof ? prof.cc : place ? place.ccs[0] : exList ? exList[0].cc : sel ? sel.cc : null);
  const letGo = () => { if (mineView) mine.unpick?.(); else { setPlace(null); setExList(null); setProf(null); v.cmClose?.(); v.cmJourney?.close?.(); } };
  // the sheet is up: the tab bar steps aside (as for the other sheets here)
  const placeOpen = !!place || !!exList || !!prof;
  useEffect(() => { v.cmPlaceShown?.(placeOpen); return () => { if (placeOpen) v.cmPlaceShown?.(false); }; }, [placeOpen]);
  // nothing picked: the globe big and low, a horizon under the sky (picked: back to the middle, where its sheet leaves room)
  const calm = !route && !explore && !placeOpen && !sel && !(mineView && mine.sel);
  // the World's activity (who's sending now): from its small way in at the top, over the bottom
  const [activity, setActivity] = useState(false);
  useEffect(() => { setActivity(false); }, [v.cmView]);
  const bar = activity && calm && !mineView && !v.cmJourney && !!v.cmTransit?.n;
  // my letters, along the bottom — whichever map is showing (not over something picked or open there)
  const news = v.mapNews, newsOn = calm && !!news && !v.cmFirstCta && !v.cmJourney && !v.cmTrip && !(mineView && (mine.empty || v.cmFlight));
  const newsAct = (r: any) => {
    if (!r) return;
    if (r.act === "mail") news.toMail();
    else if (r.act === "route" && r.pal) { if (mineView) mine.pick?.(r.pal); else v.cmPick(r.pal, "pals"); }
    else if (r.act === "open") r.open?.();
    else if (r.act === "write") news.write();
  };
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
          // My CatPals: you and your cat pals, one way to each (a soft trail), a bird for each letter on its way (the latest
          // one's own flight once); a cat pal picked: only its way, clearly
          groups: mine.places || [], home: v.cmHome, routes: mine.routes || [], height: "100%", onCluster: openMine, onSelect: (cc: string) => openMine([cc]),
          selected: null, controlsBottom: mine.sel ? 340 : v.cmTrip ? 250 : mine.empty || v.cmFlight ? 200 : newsOn ? 172 : 104, zoomButtons: true, fit: calm ? 0.52 : 0.44, lower: calm ? 0.1 : 0,
          flight: v.cmFlight ? { a: v.cmFlight.a, b: v.cmFlight.b, play: v.cmFlight.play } : null, flightBird: true, onFlightStart: () => setStarted(true),
          // where letters went and came: soft trails; on their way now: a bird each (at most three; not the one the
          // latest letter's own flight is showing)
          routeTone: "trail" as const, journeys: (mine.flying || []).filter((j: any) => !v.cmFlight || j.key !== v.cmFlight.key), journeyS: 30, maxBirds: 3,
          pins: [], focus, onBlankTap: letGo,
        } : {
          // the World: public profiles (people are where their country is — the app keeps no finer place; close ones share
          // a marker until you zoom in), two or three birds at a time, slowly; a place tapped: only its ways, the rest still
          // your cat pals among them, picked out (a warm ring), with where you are and your ways to them, clear; your
          // letters on their way fly first (a little bigger, a soft red glow)
          groups: [...(v.cmPlaces || []), ...(mine.worldPals || [])], home: mine.worldPals?.length ? v.cmHome : null, routes: mine.routes || [], routeTone: "clear" as const,
          height: "100%", onSelect: (cc: string) => openPlaces([cc]), onCluster: openPlaces,
          selected: place ? place.ccs[0] : sel ? sel.cc : null, controlsBottom: sel || place ? 12 : bar ? 360 : v.cmTrip ? 250 : newsOn || v.cmFirstCta ? 172 : 104, zoomButtons: true, flight: null,
          fadeIdle: true, pins: [], journeys: [...(mine.flying || []), ...(v.cmJourneys || [])], journeyS: 36, maxBirds: 3, exampleTag: T.exTag, focus, onBlankTap: letGo,
          // the liveliest few as photos, the rest a soft glow (all photos once zoomed in)
          fit: calm ? 0.58 : 0.44, lower: calm ? 0.14 : 0, photoPins: 6 };
        return hasWebGL() ? <Suspense fallback={null}><GlobeMap3D {...props} onZoomPast={(at) => { if (!route) setExplore(at); }} /></Suspense> : <GlobeMap {...props} />;
      })()}
      {/* the top: the one switch [World | My CatPals], and the World at a glance (how many cats, in how many countries,
          how many here now — examples said so) or the sample note
          (not while a way is picked: its own back button is there) */}
      <div style={{ display: route || explore ? "none" : "flex", position: "absolute", left: "16px", right: "16px", top: "16px", zIndex: 6, flexDirection: "column", alignItems: "flex-start", gap: "8px", pointerEvents: "none" }}>
        {v.cmHasMail ? <div role="tablist" aria-label={T.cmViewWorld + " / " + T.cmViewMine} style={{ pointerEvents: "auto", padding: "3px", borderRadius: "18px", background: "rgba(255,255,255,.94)", boxShadow: "0 4px 14px rgba(40,30,20,.12)", display: "flex", gap: "2px" }}>
          {([["world", T.cmViewWorld], ["mine", T.cmViewMine]] as [string, string][]).map(([id, label]) => {
            const on = (v.cmView || "world") === id;
            return (
              <span key={id} onClick={() => { if (!on) v.cmSetView(id); }} role="tab" aria-selected={on} className="dc-hover-2"
                style={{ padding: "6px 14px", borderRadius: "15px", background: on ? "#22304A" : "transparent", color: on ? "#fff" : "#4A443D", fontWeight: 700, fontSize: "12.5px", lineHeight: "16px", whiteSpace: "nowrap", cursor: on ? "default" : "pointer", transition: "background .2s ease, color .2s ease" }}>{I(label)}</span>
            );
          })}
        </div> : null}
        {/* the World at a glance: "11 cats · 11 countries" (one "Example" badge, when it's examples), and one chip —
            who's online (the real ones only; none known: no number, no dot) and the way into the World's activity */}
        {/* Mine: my letters at a glance (CatPals · countries, then each way); All: who's live now, and the letters on the way */}
        {(mineView ? v.cmMyStat : v.cmLive) ? (
            <div style={{ opacity: calm ? 1 : 0, transition: "opacity .3s ease", pointerEvents: calm ? "auto" : "none" }}><div style={{ marginTop: "8px", paddingLeft: "4px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", animation: "cp-fadeup .5s ease both" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {!mineView ? <span aria-hidden="true" className="cp-active-dot" style={{ width: "9px", height: "9px", borderRadius: "5px", background: "#2FD36B", border: "2px solid #fff" }} /> : null}
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "22px", lineHeight: "29px", letterSpacing: "var(--ls-heading)", color: "#22304A", textShadow: "0 1px 14px rgba(255,255,255,.9)" }}>{I(mineView ? v.cmMyStat.text : v.cmLive.text)}</span>
                {(mineView ? v.cmMyStat.tag : v.cmLive.tag) ? <span style={{ padding: "2px 8px", borderRadius: "9px", background: "rgba(240,235,225,.92)", fontWeight: 700, fontSize: "10.5px", lineHeight: "15px", color: "#8E8A84" }}>{I(mineView ? v.cmMyStat.tag : v.cmLive.tag)}</span> : null}
              </span>
              {/* each way: → sent (red, as their ways are drawn), ← received (blue) */}
              {mineView && v.cmMyStat?.sub ? (
                <span style={{ marginTop: "-4px", display: "flex", alignItems: "center", gap: "10px", fontWeight: 600, fontSize: "13px", lineHeight: "18px", color: "#4C5562", textShadow: "0 1px 10px rgba(255,255,255,.9)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><b aria-hidden="true" style={{ color: "#E5483D", fontSize: "15px" }}>→</b>{I(v.cmMyStat.sent)}</span>
                  <span aria-hidden="true" style={{ color: "#B6BBC6" }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><b aria-hidden="true" style={{ color: "#3F7FD6", fontSize: "15px" }}>←</b>{I(v.cmMyStat.got)}</span>
                </span>
              ) : null}
              {/* letters on the way, the world over (the same count as its list); none: said so */}
              {!mineView && v.cmTransit ? (v.cmTransit.n ? (
                <span data-transit-chip onClick={() => setActivity((a) => !a)} role="button" tabIndex={0} aria-expanded={activity} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActivity((a) => !a); } }} className="dc-hover-2"
                  style={{ display: "flex", alignItems: "center", gap: "6px", minHeight: "32px", padding: "0 12px", borderRadius: "16px", background: "rgba(255,255,255,.82)", boxShadow: "0 2px 8px rgba(40,30,20,.08)", fontWeight: 600, fontSize: "12px", color: "#22304A", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {I(v.cmTransit.chip)}<span aria-hidden="true" style={{ color: "#9AA1B0" }}>›</span>
                </span>
              ) : !v.cmHasMail ? null : (
                <span style={{ display: "flex", alignItems: "center", minHeight: "28px", padding: "0 12px", borderRadius: "14px", background: "rgba(255,255,255,.7)", fontWeight: 500, fontSize: "12px", color: "#7A8091", whiteSpace: "nowrap" }}>{I(v.cmTransit.chip)}</span>
              )) : null}
            </div></div>
          ) : null}
        {!mineView && !v.cmIsSample && !v.cmStat && v.cmJourneyEx ? <span style={{ padding: "3px 9px", borderRadius: "10px", background: "rgba(255,255,255,.82)", fontWeight: 500, fontSize: "11px", lineHeight: "15px", color: "#8E8A84" }}>🕊️ {I(v.cmJourneyEx)}</span> : null}
      </div>
      {/* the bottom, over the tab bar: the World's activity, opened from its way in (who's sending now) … */}
      {bar ? (
        <div style={{ position: "absolute", left: "16px", right: "16px", bottom: (newsOn ? 172 : 100) + "px", zIndex: 7, display: "flex", flexDirection: "column", justifyContent: "flex-end", pointerEvents: "none" }}>
          <div style={{ maxWidth: "440px", width: "100%", margin: "0 auto" }}>
            <TransitList t={v.cmTransit} onClose={() => setActivity(false)} onShow={(r) => { setActivity(false); v.cmTransit.show(r); }} />
          </div>
        </div>
      ) : null}
      {/* a letter's bird tapped (mine going, or one coming to me): how its trip goes — when it lands (the big one),
          how far along it is, how long it is in all and how far */}
      {v.cmTrip && !route && !explore && !place && !exList && !prof ? (
        <div role="dialog" aria-label={v.cmTrip.title} style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", zIndex: 7, maxWidth: "440px", margin: "0 auto", padding: "14px 14px 12px 16px", borderRadius: "22px", background: "rgba(255,255,255,.97)", boxShadow: "0 12px 32px rgba(40,30,20,.16)", animation: "cp-rise2 .35s cubic-bezier(.2,.8,.2,1) both" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" style={{ flex: "none", width: "38px", marginTop: "2px", transform: v.cmTrip.toMe ? "none" : "scaleX(-1)" }} />
            <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontWeight: 700, fontSize: "11.5px", color: v.cmTrip.toMe ? "#3F7FD6" : "#E5483D" }}>{I(v.cmTrip.title)}</span>
              <span style={{ fontWeight: 600, fontSize: "12.5px", color: "#5E6A80", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.cmTrip.route)}</span>
              <b style={{ marginTop: "2px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "19px", lineHeight: "24px", letterSpacing: "var(--ls-heading)", color: "#22304A" }}>{I(v.cmTrip.left)}</b>
            </span>
            <span onClick={v.cmTrip.close} role="button" tabIndex={0} aria-label={T.cmClose} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.cmTrip.close(); } }}
              style={{ flex: "none", width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", color: "#22304A" }}>✕</span>
          </div>
          {/* how far along it is */}
          <div aria-hidden="true" style={{ marginTop: "10px", height: "5px", borderRadius: "3px", background: "#EEE8DD", overflow: "hidden" }}>
            <div style={{ width: Math.round(v.cmTrip.progress * 100) + "%", height: "100%", borderRadius: "3px", background: v.cmTrip.toMe ? "#3F7FD6" : "#E5483D" }} />
          </div>
          <div style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(v.cmTrip.total)}</span>
            {mineView ? <span onClick={v.cmTrip.pal} role="button" tabIndex={0} className="dc-hover-2" style={{ flex: "none", padding: "6px 12px", borderRadius: "14px", boxShadow: "inset 0 0 0 1px rgba(34,48,74,.16)", fontWeight: 600, fontSize: "12.5px", color: "#22304A", cursor: "pointer" }}>{I(v.cmTrip.palLabel)}</span> : null}
          </div>
        </div>
      ) : null}
      {/* no letters yet: the way to the first one */}
      {calm && v.cmFirstCta && !bar && !v.cmJourney ? (
        <div style={{ position: "absolute", left: "16px", right: "16px", bottom: "104px", zIndex: 6, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div className="dc-hover-8" onClick={v.cmFirstCta.go} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.cmFirstCta.go(); } }}
            style={{ pointerEvents: "auto", height: "52px", padding: "0 30px", borderRadius: "26px", background: "#22304A", boxShadow: "0 10px 22px rgba(34,48,74,.22)", display: "flex", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff", whiteSpace: "nowrap" }}>{I(v.cmFirstCta.label)}</span>
          </div>
        </div>
      ) : null}
      {/* … and otherwise, my letters */}
      {newsOn ? (
        <div style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", zIndex: 6, display: "flex", flexDirection: "column", justifyContent: "flex-end", pointerEvents: "none" }}>
          <div style={{ maxWidth: "440px", width: "100%", margin: "0 auto" }}>
            <LetterNews n={news} onAct={newsAct} />
          </div>
        </div>
      ) : null}
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
                  {p.active ? <span aria-label="active" className="cp-active-dot" style={{ position: "absolute", right: "0", top: "0", width: "11px", height: "11px", borderRadius: "6px", background: "#2FD36B", border: "2px solid #fff", boxSizing: "border-box" }} /> : null}
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
              <div key={p.id} onClick={() => { setExList(null); setProf({ key: p.id, name: p.example.name, photo: p.example.photo, flag: p.flag, cc: p.cc, route: p.flag + " " + p.country, example: true, active: p.active }); }} role="button" tabIndex={0} className="dc-hover-2"
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)", cursor: "pointer" }}>
                <Face src={p.example.photo} flag={p.flag} size={42} />
                <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <b style={{ fontSize: "14.5px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.example.name)}</b>
                  {/* (still said to be an example, by its country) */}
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(p.country)} · <span style={{ color: "#A39E95" }}>{I(T.exTag)}</span></span>
                </span>
                {/* "Send a letter": choosing who it goes to is CatPal Plus — its plans; (Plus) their page (an example takes no letters) */}
                <span onClick={(e) => { e.stopPropagation(); if (v.cmPlus) { setExList(null); setProf({ key: p.id, name: p.example.name, photo: p.example.photo, flag: p.flag, cc: p.cc, route: p.flag + " " + p.country, example: true, active: p.active }); } else v.cmPlusOpen(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!v.cmPlus) v.cmPlusOpen(); } }} role="button" tabIndex={0} className="dc-hover-8"
                  style={{ flex: "none", height: "34px", padding: "0 14px", borderRadius: "17px", background: "#22304A", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "12.5px", color: "#fff", whiteSpace: "nowrap", cursor: "pointer" }}>{I(T.cmSendLetter)}</span>
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
                {prof.active ? <span style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600, fontSize: "11.5px", color: "#1E9E50" }}><span aria-hidden="true" style={{ width: "7px", height: "7px", borderRadius: "4px", background: "#2FD36B" }} />{I(v.cmPfT?.live)}</span> : null}
              </span>
              <span onClick={() => setProf(null)} role="button" aria-label={T.cmClose} style={{ flex: "none", alignSelf: "flex-start", width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#5E6A80" }}>✕</span>
            </div>
            {prof.bio || prof.shared ? (
              <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "18px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)", animation: "cp-fadeup .4s .08s ease both" }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: "11.5px", color: "#8E8A84" }}>{I(prof.bio ? v.cmSenders?.about : prof.moment ? v.cmPfT?.moment : v.cmSenders?.sharedLabel)}{prof.cat ? " · 🐈 " + prof.cat : ""}</span>
                <span style={{ display: "block", marginTop: "6px", fontWeight: 500, fontSize: "14.5px", lineHeight: "22px", color: "#22304A", whiteSpace: "pre-wrap" }}>{I(prof.bio || prof.shared)}</span>
              </div>
            ) : null}
            {/* writing to them: (Plus) right here; otherwise Plus — or a random CatPal (an example: only that) */}
            {prof.moment ? (
              <div onClick={() => { const m = prof.moment; setProf(null); v.cmWriteTo(m); }} role="button" tabIndex={0} className="dc-hover-8" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const m = prof.moment; setProf(null); v.cmWriteTo(m); } }}
                style={{ marginTop: "16px", height: "50px", borderRadius: "25px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", boxShadow: "0 8px 18px rgba(34,48,74,.18)" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>{v.cmPlus ? "" : "🔒 "}{I((v.cmPfT?.write || "").replace("{name}", prof.name))}</span>
              </div>
            ) : null}
            {prof.moment && !v.cmPlus ? <span style={{ display: "block", marginTop: "6px", textAlign: "center", fontWeight: 500, fontSize: "11.5px", color: "#8A6A4E" }}>{I(v.cmPfT?.plusNote)}</span> : null}
            {!v.cmPlus || prof.example ? (
              <span onClick={() => { setProf(null); v.cmRandom(); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProf(null); v.cmRandom(); } }}
                style={{ display: "block", marginTop: "12px", textAlign: "center", fontWeight: 600, fontSize: "13.5px", color: "#22304A", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(v.cmPfT?.random)}</span>
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
      {/* My CatPals: the cat pal picked (its way clear on the globe) — who, where, letters each way (the real ones), and
          their letters; or, nothing yet, where the journeys will be and the first letter */}
      {mineView && !route && !explore && !place && mine.sel ? (
        <div role="dialog" aria-label={mine.sel.name} style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", zIndex: 6, padding: "14px 14px 14px 16px", borderRadius: "24px", background: "rgba(255,255,255,.97)", boxShadow: "0 12px 32px rgba(0,20,40,.16)", animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Face src={mine.sel.photo} flag={mine.sel.flag} size={50} ring="#FF8F6B" />
            <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
              <b style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px", lineHeight: "22px", letterSpacing: "var(--ls-heading)", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(mine.sel.name)}</b>
              <span style={{ fontWeight: 500, fontSize: "12.5px", lineHeight: "17px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(mine.sel.country)}{mine.sel.km ? " · " + mine.sel.km : ""}</span>
            </span>
            <span onClick={mine.unpick} role="button" aria-label={T.cmClose} style={{ flex: "none", alignSelf: "flex-start", width: "28px", height: "28px", borderRadius: "14px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: "#5E6A80" }}>✕</span>
          </div>
          {/* letters each way (sent red, received blue — as on the way), and one on its way now */}
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            {([[mine.sel.sentLabel, mine.sel.sentN, "#E5483D", "→"], [mine.sel.gotLabel, mine.sel.gotN, "#3F7FD6", "←"]] as [string, number, string, string][]).map(([label, n, c, arrow]) => (
              <span key={label} style={{ flex: "1", display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px", padding: "8px 0", borderRadius: "14px", background: "#F7F4EE" }}>
                <span style={{ fontWeight: 600, fontSize: "12px", color: "#7A8091" }}><span style={{ color: c, fontWeight: 700 }}>{arrow}</span>{" "}{I(label)}</span>
                <b style={{ fontWeight: 700, fontSize: "17px", color: "#22304A" }}>{n}</b>
              </span>
            ))}
          </div>
          {mine.sel.flying ? (
            <span style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 600, fontSize: "12px", color: "#A0682E" }}>
              <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" style={{ width: "22px", transform: "scaleX(-1)" }} />{I(mine.sel.flying)}
            </span>
          ) : null}
          <div onClick={mine.sel.open || undefined} role="button" aria-disabled={!mine.sel.open} className="dc-hover-8"
            style={{ marginTop: "12px", height: "46px", borderRadius: "23px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", cursor: mine.sel.open ? "pointer" : "default", opacity: mine.sel.open ? 1 : 0.4, boxShadow: "0 8px 18px rgba(34,48,74,.18)", transition: "transform .15s ease" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="1.6" /><path d="m4.4 7.2 7.6 5.6 7.6-5.6" /></svg>
            <span style={{ fontWeight: 700, fontSize: "14.5px", color: "#fff", whiteSpace: "nowrap" }}>{I(mine.sel.view)}</span>
          </div>
          {!mine.sel.open && mine.sel.sampleNote ? <span style={{ display: "block", marginTop: "6px", textAlign: "center", fontWeight: 500, fontSize: "11px", color: "#C9785D" }}>{I(mine.sel.sampleNote)}</span> : null}
        </div>
      ) : mineView && !route && !explore && !place && mine.empty ? (
        <div role="dialog" aria-label={mine.empty.text} style={{ position: "absolute", left: "16px", right: "16px", bottom: "100px", zIndex: 6, padding: "12px 12px 12px 16px", borderRadius: "20px", background: "rgba(255,255,255,.97)", boxShadow: "0 10px 30px rgba(0,20,40,.16)", display: "flex", alignItems: "center", gap: "12px", animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
          <span style={{ flex: "1", minWidth: "0", fontWeight: 500, fontSize: "13px", lineHeight: "18px", color: "#22304A" }}>{I(mine.empty.text)}</span>
          <span onClick={mine.empty.go} role="button" className="dc-hover-8" style={{ flex: "none", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#22304A", color: "#fff", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", cursor: "pointer" }}>{I(mine.empty.cta)}</span>
        </div>
      ) : null}
      {route || explore || place || exList || prof || v.cmTrip || (mineView ? mine.sel || mine.empty : v.cmJourney) ? null : mineView && v.cmFlight ? (
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
              <div className="dc-hover-2" onClick={c.moment && !c.mine ? () => { v.cmClose?.(); setProf({ key: c.id, name: c.who, photo: c.photo, flag: c.whoFlag, cc: c.cc, route: c.whoFlag + " " + (c.country || ""), shared: c.caption, moment: c.moment }); } : c.open || undefined} role={c.open ? "button" : undefined} style={{ flex: "none", width: "132px", cursor: "pointer", scrollSnapAlign: "start", transition: "transform .15s ease" }}>
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
