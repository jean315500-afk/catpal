// CAT PAL LINKS — two short pages, in Home's look (the sky, the red envelope, navy type):
//   "Start with a friend?" — right after the landing story's Start: invite a friend with your personal link (the
//      device's share sheet, else the link to copy), or skip and start as before. Sharing connects nobody; you go on
//      at once either way.
//   A friend's link — who invited you (their cat, their country, once they have them) and "Accept the invite"; then
//      you're cat pals (in each other's CatPals) and on to the first letter. No form: a first-time visitor has seen the
//      story first; their cat's name is asked with their first letter, as always.
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = "#22304A", MUTED = "#5E6A80";
const ENV = { open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png", closed: "./assets/onboarding-preview/envelope-closed.png", frontTop: 551 / 1245, frontH: 374 / 671 };
const btn = { width: "100%", maxWidth: "340px", height: "54px", borderRadius: "27px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" } as const;
const btnText = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff", whiteSpace: "nowrap" } as const;
const link = { marginTop: "8px", padding: "8px 12px", fontWeight: 500, fontSize: "var(--fs-caption)", color: MUTED, textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" } as const;
const page = { position: "absolute", inset: "0", background: "transparent", overflowY: "auto", scrollbarWidth: "none", animation: "cp-fade .3s ease" } as const;
const column = { minHeight: "100%", maxWidth: "400px", margin: "0 auto", boxSizing: "border-box", padding: "60px 22px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", wordBreak: "keep-all" } as const;

/** two polaroids tucked in the open envelope: yours and a friend's (still to come) */
function TwoCats() {
  const W = 220, H = W * 671 / 600;
  return (
    <div aria-hidden="true" style={{ position: "relative", width: W + "px", height: H + "px", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) both" }}>
      <img src={ENV.open} alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", filter: "drop-shadow(0 16px 20px rgba(60,30,30,.18))" }} />
      {[{ l: 34, r: -7, src: "./assets/cats/cat-1.jpg" }, { l: 104, r: 6, src: "" }].map((p, i) => (
        <span key={i} style={{ position: "absolute", left: p.l + "px", top: "26px", width: "82px", padding: "4px 4px 14px", background: "#fff", boxShadow: "0 3px 8px rgba(40,25,20,.2)", transform: `rotate(${p.r}deg)`, zIndex: 2 }}>
          {p.src ? <img src={p.src} alt="" style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
            : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: "1 / 1", boxSizing: "border-box", border: "2px dashed #D9CDBB", background: "#FBF7F0", color: "#B7AC99", fontSize: "26px", fontWeight: 300 }}>+</span>}
        </span>
      ))}
      <img src={ENV.front} alt="" style={{ position: "absolute", left: "0", top: ENV.frontTop * 100 + "%", width: "100%", height: ENV.frontH * 100 + "%", zIndex: 3 }} />
    </div>
  );
}

export default function PalInviteScreen({ v }: { v: Vals }) {
  const P = v.palPage; if (!P) return null;
  const T = P.T || {};

  if (v.sPalStart) {
    const s = P.share;
    return (
      <div data-screen-label="Start with a friend" style={page}>
        <div style={column}>
          <TwoCats />
          <h1 className="cp-h2" style={{ margin: "26px 0 0", color: INK, textWrap: "balance" } as any}>{I(T.palTitle)}</h1>
          <p style={{ margin: "8px 0 0", maxWidth: "300px", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: MUTED, textWrap: "balance" } as any}>{I(T.palDesc)}</p>
          {/* the link, once made: shared (or to share / copy here, where the share sheet couldn't open) */}
          {s.url && !s.sent ? (
            <div style={{ marginTop: "18px", width: "100%", maxWidth: "340px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", padding: "6px 6px 6px 14px", borderRadius: "14px", background: "rgba(255,252,244,.9)", boxShadow: "inset 0 0 0 1px #E5DCCB" }}>
              <input readOnly value={s.url} onFocus={(e) => e.currentTarget.select()} aria-label={T.palCopy} style={{ flex: "1", minWidth: "0", border: "none", outline: "none", background: "transparent", fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "12px", color: MUTED, textOverflow: "ellipsis" }} />
              <span onClick={s.copy} role="button" className="dc-hover-2" style={{ flex: "none", padding: "8px 12px", borderRadius: "10px", background: s.copied ? "rgba(46,116,88,.12)" : "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.1)", fontWeight: 700, fontSize: "12.5px", color: s.copied ? "#2E7458" : INK, cursor: "pointer", whiteSpace: "nowrap" }}>{I(s.copied ? T.palCopied : T.palCopy)}</span>
            </div>
          ) : null}
          {s.sent ? <span style={{ marginTop: "18px", maxWidth: "300px", fontWeight: 500, fontSize: "13px", lineHeight: "19px", color: "#2E7458" }}>{I(T.palSent)}</span> : null}
          {s.err ? <span role="alert" style={{ marginTop: "14px", maxWidth: "300px", fontWeight: 500, fontSize: "13px", lineHeight: "19px", color: "#D9442F" }}>{I(s.err)}</span> : null}
          {s.sent ? (
            <div className="dc-hover-8" onClick={s.done} role="button" style={{ ...btn, marginTop: "22px", background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}><span style={btnText}>{I(T.palStartGo)}</span></div>
          ) : (
            <>
              <div className="dc-hover-8" onClick={s.go} role="button" aria-busy={s.phase === "making"} style={{ ...btn, marginTop: "22px", background: s.phase === "making" ? "#FBF5EA" : "#22304A", boxShadow: s.phase === "making" ? "inset 0 0 0 1.5px #EADFCB" : "0 10px 22px rgba(34,48,74,.2)" }}>
                <span style={{ ...btnText, color: s.phase === "making" ? "#7A5A43" : "#fff" }}>{I(s.phase === "making" ? T.palMaking : s.url && s.canShare ? T.palShare : T.palInvite)}</span>
              </div>
              {/* once the link is made it isn't skipping any more: just on */}
              <span onClick={s.skip} role="button" style={link}>{I(s.url ? T.palStartGo : T.palSkip)}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  if (v.sPalAccept && P.accept) {
    const a = P.accept;
    return (
      <div data-screen-label="Cat pal invite" style={page}>
        <div style={column}>
          {a.phase === "loading" ? (
            <img src={ENV.closed} alt="" aria-hidden="true" style={{ width: "220px", opacity: 0.35, animation: "cp-bob 3.2s ease-in-out infinite" }} />
          ) : a.phase === "ready" || a.phase === "accepted" ? (
            <>
              {/* who's inviting: their cat (a polaroid) on their letter paper, stamped from their country */}
              <div style={{ position: "relative", width: "250px", padding: "18px 18px 16px", background: "#FFFCF4", borderRadius: "3px", boxShadow: "0 1px 2px rgba(60,40,20,.1), 0 14px 30px rgba(60,40,20,.13)", transform: "rotate(-1.5deg)", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) both" }}>
                {a.ready ? <img src={a.stamp} alt="" style={{ position: "absolute", right: "12px", top: "-12px", width: "40px", transform: "rotate(5deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.22))" }} /> : null}
                {a.ready && a.pm ? <img src={a.pm} alt="" style={{ position: "absolute", right: "30px", top: "-6px", width: "70px", mixBlendMode: "multiply", opacity: 0.8, transform: "rotate(-8deg)" }} /> : null}
                <div style={{ margin: "6px auto 0", width: "150px", padding: "6px 6px 20px", background: "#fff", boxShadow: "0 3px 10px rgba(40,25,20,.2)", transform: "rotate(2deg)" }}>
                  {a.photo ? <img src={a.photo} alt="" style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
                    : <img src={ENV.closed} alt="" style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "contain", background: "#FBF7F0", padding: "24px 12px", boxSizing: "border-box" }} />}
                </div>
                {a.name ? <span className="cp-letter-i" style={{ display: "block", marginTop: "10px", fontSize: "26px", lineHeight: "30px", color: "#2F3B57" }}>{I(a.name)}</span> : null}
                {a.country ? <span style={{ display: "block", marginTop: "2px", fontWeight: 500, fontSize: "12.5px", color: MUTED }}><span style={{ marginRight: "5px" }}>{I(a.flag)}</span>{I(a.country)}</span> : null}
              </div>
              <h1 className="cp-h2" style={{ margin: "26px 0 0", color: INK, textWrap: "balance" } as any}>{I(a.phase === "accepted" ? a.acceptedText : a.who)}</h1>
              {a.phase === "accepted" ? (
                <>
                  {!a.ready ? <p style={{ margin: "8px 0 0", maxWidth: "300px", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: MUTED }}>{I(T.palNotYetSub)}</p> : null}
                  {a.ready ? (
                    <div className="dc-hover-8" onClick={a.first} role="button" style={{ ...btn, marginTop: "24px", background: "#22304A", boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}><span style={btnText}>{I(T.palFirst)}</span></div>
                  ) : (
                    <div className="dc-hover-8" onClick={a.home} role="button" style={{ ...btn, marginTop: "24px", background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}><span style={btnText}>{I(T.palStartGo2)}</span></div>
                  )}
                </>
              ) : (
                <>
                  <p style={{ margin: "8px 0 0", maxWidth: "300px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: MUTED }}>{I(T.palNoSignup)}</p>
                  {a.err ? <span role="alert" style={{ marginTop: "12px", fontWeight: 500, fontSize: "13px", color: "#D9442F" }}>{I(a.err)}</span> : null}
                  <div className="dc-hover-8" onClick={a.go} role="button" aria-busy={a.busy} style={{ ...btn, marginTop: "22px", background: a.busy ? "#B9B2A4" : "#22304A", boxShadow: a.busy ? "none" : "0 10px 22px rgba(34,48,74,.2)" }}><span style={btnText}>{I(T.palAcceptGo)}</span></div>
                  <span onClick={a.later} role="button" style={link}>{I(T.palLater)}</span>
                </>
              )}
            </>
          ) : (
            /* yours, gone, or couldn't be read: say so, and on into the app (or again, for a hiccup) */
            <>
              <img src={ENV.closed} alt="" aria-hidden="true" style={{ width: "150px", opacity: 0.55, filter: "grayscale(.5)", transform: "rotate(-5deg)" }} />
              <span style={{ marginTop: "22px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", color: INK }}>{I(a.phase === "mine" ? T.palMine : T.palGoneTitle)}</span>
              {a.phase !== "mine" ? <span style={{ marginTop: "6px", maxWidth: "280px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#4C5562" }}>{I(a.err || T.palGone)}</span> : null}
              {a.phase === "error" ? <span onClick={a.retry} role="button" style={link}>{I(T.ivRetry)}</span> : null}
              <div className="dc-hover-8" onClick={a.home} role="button" style={{ ...btn, marginTop: "20px", background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}><span style={btnText}>{I(T.palStartGo2)}</span></div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
}
