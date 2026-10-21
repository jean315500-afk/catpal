// ARRIVED — the letter's receipt, once it has landed: "Your letter has arrived!", where it went (from your
// country and cat to theirs and your new cat pal, each cat's photo, how far, the date) and the letter itself in its red envelope, its
// top peeking out, the envelope stamped and postmarked. It stays until you go on: to the Mailbox's Sent tab (where it's kept), or home.
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { DEEP_IN, LetterInEnvelope } from './ComposeScreen';

const INK = "#22304A", MUTED = "#5E6A80", FAINT = "#8E96A6";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/** one end of the way: the cat (its photo in a round frame, the country's flag on it), the country, the cat's name */
function End({ label, flag, photo, country, who, right }: { label: string; flag: string; photo: string; country: string; who: string; right?: boolean }) {
  return (
    <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", alignItems: right ? "flex-end" : "flex-start", textAlign: right ? "right" : "left", gap: "2px" }}>
      <span style={{ fontFamily: MONO, fontSize: "9.5px", letterSpacing: ".16em", textTransform: "uppercase", color: FAINT }}>{I(label)}</span>
      <span style={{ position: "relative", margin: "4px 0 4px", width: "52px", height: "52px", flex: "none" }}>
        <span style={{ position: "absolute", inset: "0", borderRadius: "50%", overflow: "hidden", background: "#F3EEE4", border: "2.5px solid #fff", boxShadow: "0 3px 10px rgba(34,48,74,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
          {photo ? <img src={photo} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : "🐈"}
        </span>
        <span aria-hidden="true" style={{ position: "absolute", [right ? "left" : "right"]: "-6px", bottom: "-3px", width: "22px", height: "22px", borderRadius: "11px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", lineHeight: "1" }}>{I(flag)}</span>
      </span>
      <span style={{ maxWidth: "100%", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "15px", lineHeight: "20px", letterSpacing: "var(--ls-heading)", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(country)}</span>
      <span style={{ maxWidth: "100%", fontWeight: 500, fontSize: "12px", color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(who)}</span>
    </div>
  );
}

export default function ArrivedScreen({ v }: { v: Vals }) {
  if (!v.sArrived) return null;
  const T = v.arrT || {}, l = v.arrLetter;
  return (
    <div data-screen-label="09 Arrived" style={{ position: "absolute", inset: "0", background: "transparent", overflowY: "auto", scrollbarWidth: "none", animation: "cp-fadeup .3s ease" }}>
      <div style={{ minHeight: "100%", maxWidth: "400px", margin: "0 auto", boxSizing: "border-box", padding: "40px 22px 34px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 className="cp-h2" style={{ margin: "8px 0 0", color: INK, textAlign: "center" }}>{I(T.arrTitle)}</h1>
        {v.arrSub ? <p style={{ margin: "6px 0 0", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: MUTED, textAlign: "center" }}>{I(v.arrSub)}</p> : null}

        {/* where it went: from → to, how far, when */}
        <div style={{ marginTop: "20px", width: "100%", boxSizing: "border-box", padding: "14px 16px 12px", borderRadius: "20px", background: "rgba(255,255,255,.94)", boxShadow: "0 10px 26px rgba(34,48,74,.10)", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) .1s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <End label={T.dmFrom} flag={v.arrFromFlag} photo={v.arrFromPhoto} country={v.arrFrom} who={v.arrFromName} />
            {/* the way: a straight dotted arrow, the distance under it */}
            <div style={{ flex: "none", width: "76px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <svg width="72" height="12" viewBox="0 0 72 12" aria-hidden="true">
                <path d="M3 6H67" fill="none" stroke="#E5483D" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 6" />
                <path d="M63 2 68 6 63 10" fill="none" stroke="#E5483D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {v.destKm ? <span style={{ fontWeight: 700, fontSize: "12px", color: "#C9785D", whiteSpace: "nowrap" }}>{I(v.destKm)}{" km"}</span> : null}
            </div>
            <End label={T.dmTo} flag={v.arrToFlag} photo={v.arrToPhoto} country={v.destCity} who={v.arrToName} right />
          </div>
          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #E2DCD0", textAlign: "center", fontFamily: MONO, fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: FAINT }}>{I(v.arrDate)}</div>
        </div>

        {/* the letter, as it was delivered: in its red envelope, its top peeking out; stamped, and postmarked where it was sent from */}
        {l ? (
          <div style={{ marginTop: "22px", animation: "cp-letterup .6s cubic-bezier(.2,.9,.3,1) .2s both" }}>
            <LetterInEnvelope v={{ cmpPhoto: l.photo, cmpText: l.text, cmpSign: l.sign, cmpFlag: l.flag, cmpCountryName: l.country, cmpStamp: v.stampMotif, cmpPm: v.myPm, cpT: T }} deep={DEEP_IN} />
          </div>
        ) : null}

        {/* on from here */}
        <div style={{ flex: "1 0 18px" }} />
        <div className="dc-hover-8" onClick={v.arrToMailbox} role="button" style={{ marginTop: "22px", width: "100%", height: "54px", borderRadius: "27px", background: INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 10px 22px rgba(34,48,74,.2)", transition: "transform .15s ease" }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-body)", color: "#fff" }}>{I(T.arrCta)}</span>
        </div>
        <span onClick={v.arrToHome} role="button" style={{ marginTop: "8px", padding: "8px 12px", fontWeight: 500, fontSize: "var(--fs-caption)", color: MUTED, textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(T.arrHome)}</span>
      </div>
    </div>
  );
}
