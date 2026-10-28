// DELIVERY MAP — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import LetterFlight from './LetterFlight';

/** the Map's 3D globe (the same earth, the letter on its dotted curve); without WebGL, the dotted globe (LetterFlight) */
const GlobeMap3D = lazy(() => import('../community/GlobeMap3D'));
let webgl: boolean | null = null;
const hasWebGL = () => {
  if (webgl === null) { try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webgl = false; } }
  return webgl;
};
const ll = (p: [number, number]) => ({ lon: p[0], lat: p[1] });
/** the card over the globe that asks something (no one free; only someone at home): one button, small links under it */
const dlg = { position: "absolute", left: "22px", right: "22px", bottom: "34px", maxWidth: "380px", margin: "0 auto", boxSizing: "border-box", padding: "20px 20px 14px", borderRadius: "24px", background: "rgba(255,255,255,.95)", boxShadow: "0 12px 30px rgba(34,48,74,.14)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) both" } as const;
const dlgBtn = { marginTop: "16px", width: "100%", height: "50px", borderRadius: "25px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 10px 22px rgba(34,48,74,.2)", transition: "transform .15s ease" } as const;
const dlgBtnText = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" } as const;
const dlgLink = { padding: "8px 10px", fontWeight: 500, fontSize: "var(--fs-caption)", color: "#5E6A80", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" } as const;

/** "To", as a slot machine: it spins through countries while a cat pal is being found; once there's a destination it
 *  slows down over a few more and stops on it (a little pop), then tells the card (`onLand`) */
function SpinTo({ pool, final, onLand }: { pool: string[]; final: string; onLand: () => void }) {
  const list = useMemo(() => [...pool].sort(() => Math.random() - 0.5), [pool.join("|")]);
  const [i, setI] = useState(0), [landed, setLanded] = useState(false);
  const fin = useRef(final); fin.current = final;
  useEffect(() => {
    if (!list.length || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (final) { setLanded(true); onLand(); }
      return;
    }
    let t = 0, slow = 0, dead = false;
    const tick = () => {
      if (dead) return;
      if (fin.current) slow++;
      if (slow > 7) { setLanded(true); onLand(); return; }
      setI((x) => x + 1);
      t = window.setTimeout(tick, fin.current ? 90 + slow * slow * 9 : 85);   // steady while it looks, then easing to a stop
    };
    t = window.setTimeout(tick, 85);
    return () => { dead = true; clearTimeout(t); };
  }, [list, !!final]);
  const style = { fontWeight: 700, fontSize: "15px", lineHeight: "19px", color: "#22304A", maxWidth: "100%" } as const;   // a long name wraps rather than being cut
  if (landed && final) return <span aria-live="polite" style={{ ...style, display: "inline-block", animation: "cp-pop .4s cubic-bezier(.34,1.56,.64,1) both" }}>{I(final)}</span>;
  return <span aria-hidden="true" style={{ ...style, color: "#5E6A80", opacity: 0.85 }}>{I(list.length ? list[i % list.length] : final)}</span>;
}

export default function DeliveryMapScreen({ v }: { v: Vals }) {
  // the distance shows once the "To" has stopped on their country (for each letter)
  const [landedKey, setLandedKey] = useState<number | null>(null);
  const landed = landedKey === v.flightKey || (!!v.dmKnown && !!v.dRouteTo);
  return (
    <>
    {v.sDeliveryMap ? (
      <>
        <div data-screen-label="08 Delivery map" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .4s ease", overflow: "hidden" }}>
          {/* the Map's sky, and its globe: your letter waits over your country, then flies its curve to theirs */}
          <div className="cp-clouds" aria-hidden="true"><i className="cp-clouds-far" /><i className="cp-clouds-near" /></div>
          {v.flightFrom ? (hasWebGL() ? (
            <div style={{ position: "absolute", left: "0", right: "0", top: "92px", bottom: "178px" }}>
              <Suspense fallback={null}>
                <GlobeMap3D key={v.flightKey} groups={[]} height="100%" zoomButtons={false} home={ll(v.flightFrom)}
                  flight={v.flightTo ? { a: ll(v.flightFrom), b: ll(v.flightTo), play: true } : null} hover={v.flightTo ? null : ll(v.flightFrom)} />
              </Suspense>
            </div>
          ) : <LetterFlight key={v.flightKey} from={v.flightFrom} to={v.flightTo || null} fromLabel={v.flightFromLabel} toLabel={v.flightToLabel} />) : null}
          {" "}
          {!v.dmNoPal && !v.dmHomeAsk ? <span style={{ position: "absolute", left: "20px", right: "20px", top: "52px", textAlign: "center", fontWeight: 700, fontSize: "var(--fs-h2)", color: "#22304A", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", lineHeight: "var(--lh-heading)" }}>
            {I(v.dmTitle)}
          </span> : null}
          {/* no one to send to yet: nothing was sent. The globe stays over your country, the letter waiting on it: look
              again, or keep it for later (as it is) — or, if you like, send it to a friend by link */}
          {v.dmNoPal ? (
            <div role="dialog" aria-label={v.dmNoPalT?.npTitle} style={dlg}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", letterSpacing: "var(--ls-heading)", color: "#22304A" }}>{I(v.dmNoPalT?.npTitle)}</span>
              <span style={{ marginTop: "6px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#4C5562", maxWidth: "290px" }}>{I(v.dmNoPalT?.npDesc)}</span>
              <div className="dc-hover-8" onClick={v.npRetry} role="button" style={dlgBtn}>
                <span style={dlgBtnText}>{I(v.dmNoPalT?.npRetry)}</span>
              </div>
              <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 6px" }}>
                <span onClick={v.npSave} role="button" style={dlgLink}>{I(v.dmNoPalT?.npSave)}</span>
                <span onClick={v.npInvite} role="button" style={dlgLink}>{I(v.dmNoPalT?.npInvite)}</span>
              </div>
            </div>
          ) : null}
          {/* no one abroad just now, only someone in your own country: asked before anything is sent */}
          {v.dmHomeAsk ? (
            <div role="dialog" aria-label={v.dmHomeAsk.title} style={dlg}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", letterSpacing: "var(--ls-heading)", color: "#22304A", textWrap: "balance" } as any}>{I(v.dmHomeAsk.title)}</span>
              <span style={{ marginTop: "6px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#4C5562", maxWidth: "290px" }}>{I(v.dmHomeAsk.desc)}</span>
              <div className="dc-hover-8" onClick={v.dmHomeAsk.send} role="button" style={dlgBtn}>
                <span style={dlgBtnText}>{I(v.dmHomeAsk.go)}</span>
              </div>
              <span onClick={v.dmHomeAsk.save} role="button" style={{ ...dlgLink, marginTop: "6px" }}>{I(v.dmHomeAsk.later)}</span>
            </div>
          ) : null}
          {/* where it's going: from your country to theirs, how far, and how far along — the running cat (tap to go on once it has landed) */}
          {!v.dmNoPal && !v.dmHomeAsk ? <div className="dc-hover-6" onClick={v.tapDeliveryCard} role="button" aria-label={v.dRouteFrom + " → " + v.dRouteTo}
            style={{ position: "absolute", left: "22px", right: "22px", bottom: "34px", maxWidth: "380px", margin: "0 auto", boxSizing: "border-box", padding: "16px 20px 18px", borderRadius: "24px", background: "rgba(255,255,255,.95)", boxShadow: "0 12px 30px rgba(34,48,74,.14)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", cursor: "pointer", transition: "transform .2s ease", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .2s both" }}>
            <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontWeight: 500, fontSize: "12px", color: "#8E8A84" }}>{I(v.dmFrom)}</span>
              {v.dmKnown ? (
                <>
                  <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: "19px", color: "#22304A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.dmKnown.from)}</span>
                  <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: "#5E6A80", whiteSpace: "nowrap" }}>{I(v.dRouteFrom)}</span>
                </>
              ) : <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: "19px", color: "#22304A" }}>{I(v.dRouteFrom)}</span>}
            </div>
            {/* the whole way, in km, over the arrow */}
            <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              {v.destKm && landed ? <span style={{ fontWeight: 700, fontSize: "12px", color: "#C9785D", whiteSpace: "nowrap", animation: "cp-fade .3s ease" }}>{I(v.destKm)}{" km"}</span> : null}
              <span aria-hidden="true" style={{ width: "54px", height: "0", borderTop: "2px dashed #F29C7A", position: "relative" }}>
                <span style={{ position: "absolute", right: "-2px", top: "-7px", width: "8px", height: "8px", borderTop: "2px solid #F29C7A", borderRight: "2px solid #F29C7A", transform: "rotate(45deg)" }} />
              </span>
            </div>
            <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", textAlign: "right" }}>
              <span style={{ fontWeight: 500, fontSize: "12px", color: "#8E8A84" }}>{I(v.dmTo)}</span>
              {v.dmKnown ? (
                /* chosen: who and where, from the start */
                <>
                  <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: "19px", color: "#22304A", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.dmKnown.name)}</span>
                  <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: "#5E6A80", whiteSpace: "nowrap" }}>{I(v.dmKnown.place)}</span>
                </>
              ) : <SpinTo key={v.flightKey} pool={v.dmSpinPool || []} final={v.dRouteTo || ""} onLand={() => setLandedKey(v.flightKey)} />}
            </div>
            {/* how far along it is (the whole flight, ~7 s): the cat runs along the bar as it fills; while a cat pal is
                still being found, the cat runs back and forth along an empty bar (it starts over when the flight does) */}
            <div key={v.dmWaiting ? "wait" : "fly"} aria-hidden="true" style={{ position: "relative", flexBasis: "100%", marginTop: "18px", height: "6px" }}>
              <div style={{ position: "absolute", inset: "0", borderRadius: "3px", background: "#E7E2D8", overflow: "hidden" }}>
                {v.dmWaiting ? <div className="cp-dm-seek" /> : <div style={{ height: "100%", borderRadius: "3px", background: "#22304A", animation: "cp-progress 7s cubic-bezier(.4,0,.35,1) both" }} />}
              </div>
              <div style={{ position: "absolute", bottom: "2px", width: "56px", height: "26px", animation: v.dmWaiting ? "cp-catbar 1.9s ease-in-out infinite alternate" : "cp-catbar 7s cubic-bezier(.4,0,.35,1) both" }}>
                <img src="./assets/cat-run.gif" alt="" className="cp-cathop" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>
          </div> : null}
        </div>
      </>
    ) : null}
    </>
  );
}
