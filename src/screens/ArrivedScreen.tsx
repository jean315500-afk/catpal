// ARRIVED — the letter's receipt, once it has landed: "Your letter has arrived in Japan!" (delivered to whom), where it went (from your
// country and cat to theirs and your new cat pal, each cat's photo, how far, the date) and the letter itself in its red envelope, its
// top peeking out, the envelope stamped and postmarked. It stays until you go on: "Notify me of replies" (on only once
// really registered — see community/notify), or the Mailbox's Sent tab (where it's kept).
import { useEffect, useState } from 'react';
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { DEEP_IN, LetterInEnvelope } from './ComposeScreen';
import { drawPostcard } from '../community/postcard';

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

/** the postcard, made on the device: what goes out (shown first), then the device's share sheet — or saved, where
 *  there's no sharing a picture (a computer) */
function PostcardSheet({ pc, onClose }: { pc: any; onClose: () => void }) {
  const [img, setImg] = useState<{ blob: Blob; url: string } | null>(null), [err, setErr] = useState("");
  useEffect(() => {
    let url = "", dead = false;
    drawPostcard(pc).then((blob) => { if (dead) return; url = URL.createObjectURL(blob); setImg({ blob, url }); }).catch((e) => setErr(String(e?.message || e)));
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [pc.photo, pc.say]);
  const file = img ? new File([img.blob], "catpal-postcard.png", { type: "image/png" }) : null;
  const canShare = !!file && typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [file] });
  const share = async () => { try { await navigator.share({ files: [file!], text: pc.shareText + " " + location.origin }); } catch (_) { /* closed, or not allowed: nothing to do */ } };
  const save = () => { if (!img) return; const a = document.createElement("a"); a.href = img.url; a.download = "catpal-postcard.png"; document.body.appendChild(a); a.click(); a.remove(); };
  const btn = { width: "100%", height: "50px", borderRadius: "25px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" } as const;
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: "0", zIndex: 70, background: "rgba(20,15,10,.32)", animation: "cp-fade .2s ease" }} />
      <div role="dialog" aria-label={pc.title} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 71, maxHeight: "92%", overflowY: "auto", padding: "12px 22px 26px", borderRadius: "26px 26px 0 0", background: "#FBF7EE", boxShadow: "0 -8px 30px rgba(40,30,20,.14)", display: "flex", flexDirection: "column", alignItems: "center", animation: "cp-sheet .3s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", marginBottom: "12px" }} />
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", color: INK }}>{I(pc.title)}</span>
        <div style={{ marginTop: "12px", width: "min(280px, 100%)", aspectRatio: "4 / 5", borderRadius: "4px", background: "#FFFCF4", boxShadow: "0 1px 2px rgba(60,40,20,.12), 0 14px 30px rgba(60,40,20,.16)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {img ? <img src={img.url} alt={pc.say} style={{ width: "100%", height: "100%", display: "block" }} />
            : <span style={{ fontWeight: 500, fontSize: "13px", color: MUTED }}>{I(err || pc.T.pcMaking)}</span>}
        </div>
        <span style={{ marginTop: "12px", maxWidth: "300px", fontWeight: 400, fontSize: "12px", lineHeight: "17px", color: "#7A8091", textAlign: "center" }}>{I(pc.T.pcNote)}</span>
        {canShare ? (
          <div className="dc-hover-8" onClick={share} role="button" style={{ ...btn, marginTop: "16px", background: "#22304A", boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}><span style={{ fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" }}>{I(pc.T.pcShare)}</span></div>
        ) : null}
        <div className="dc-hover-8" onClick={save} role="button" aria-disabled={!img}
          style={{ ...btn, marginTop: canShare ? "8px" : "16px", ...(canShare ? { background: "transparent", boxShadow: "inset 0 0 0 1.5px " + INK } : { background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }), opacity: img ? 1 : 0.5 }}>
          <span style={{ fontWeight: 700, fontSize: "var(--fs-button)", color: canShare ? INK : "#fff" }}>{I(pc.T.pcSave)}</span>
        </div>
        <span onClick={onClose} role="button" style={{ marginTop: "6px", padding: "8px 12px", fontWeight: 500, fontSize: "var(--fs-caption)", color: MUTED, textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(pc.T.pcClose)}</span>
      </div>
    </>
  );
}

/** the bell (the app's line icons: round caps, 2px) */
function Bell({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
const cta = { marginTop: "0", width: "100%", maxWidth: "356px", height: "54px", borderRadius: "27px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" } as const;
const ctaText = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-body)", color: "#fff" } as const;

/** a new country's postmark, as a little gift: a moment after you arrive it pops up — the passport page, the postmark
 *  pressed onto it, a few sparkles — "A new stamp in your passport!"; then it settles into the page (the stamp block) */
function StampGift({ r, pc, onShare, onClose, ok }: { r: any; pc: any; onShare: () => void; onClose: () => void; ok: string }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: "0", zIndex: 60, background: "rgba(20,15,10,.34)", animation: "cp-fade .25s ease" }} />
      <div role="dialog" aria-label={r.text} style={{ position: "absolute", left: "50%", top: "50%", zIndex: 61, width: "min(300px, calc(100% - 44px))", transform: "translate(-50%, -50%)" }}>
        <div className="cp-gift" style={{ position: "relative", padding: "26px 22px 18px", borderRadius: "22px", background: "#FFFCF4", boxShadow: "0 24px 60px rgba(20,15,10,.28)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {/* sparkles */}
          {[[-6, 14, 18, 0], [86, 6, 14, 0.25], [8, 92, 12, 0.5], [92, 84, 16, 0.15]].map(([x, y, sz, d], i) => (
            <span key={i} aria-hidden="true" className="cp-twinkle" style={{ position: "absolute", left: x + "%", top: y + "px", fontSize: sz + "px", color: "#E7B53C", animationDelay: d + "s" }}>✦</span>
          ))}
          <span aria-hidden="true" style={{ position: "relative", width: "132px", height: "132px", borderRadius: "10px", background: "#F4F1EA url(./assets/passport-visa.webp) 70% 40% / 560px auto", boxShadow: "inset 0 0 0 1px rgba(90,110,150,.18), 0 6px 16px rgba(34,48,74,.12)", overflow: "hidden", transform: "rotate(-3deg)" }}>
            <img src={r.pm} alt="" className="cp-press" style={{ position: "absolute", left: "10px", top: "18px", width: "112px", mixBlendMode: "multiply", animationDelay: ".55s" }} />
          </span>
          <span style={{ marginTop: "18px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "19px", lineHeight: "24px", letterSpacing: "var(--ls-heading)", color: INK, textWrap: "balance" } as any}>{I(r.text)}</span>
          {r.sub ? <span style={{ marginTop: "4px", fontWeight: 500, fontSize: "13px", lineHeight: "18px", color: MUTED }}>{I(r.sub)}</span> : null}
          <div className="dc-hover-8" onClick={onClose} role="button" style={{ marginTop: "18px", width: "100%", height: "48px", borderRadius: "24px", background: INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 18px rgba(34,48,74,.2)" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>{I(ok)}</span>
          </div>
          {pc ? <span onClick={onShare} role="button" style={{ marginTop: "8px", padding: "6px 10px", fontWeight: 500, fontSize: "13px", color: MUTED, textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(pc.cta)}</span> : null}
        </div>
      </div>
    </>
  );
}

export default function ArrivedScreen({ v }: { v: Vals }) {
  const [card, setCard] = useState(false);
  // a new country's postmark: the gift pops up a moment after arriving (once), then the page keeps it
  const [gift, setGift] = useState<"wait" | "open" | "done">("wait");
  const firstMark = !!v.sArrived && !!v.arrReward?.first;
  useEffect(() => { if (!v.sArrived) { setCard(false); setGift("wait"); } }, [v.sArrived]);
  useEffect(() => {
    if (!firstMark || gift !== "wait") return;
    const t = setTimeout(() => setGift("open"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 1600);
    return () => clearTimeout(t);
  }, [firstMark, gift]);
  if (!v.sArrived) return null;
  const T = v.arrT || {}, l = v.arrLetter;
  return (
    <>
    <div data-screen-label="09 Arrived" style={{ position: "absolute", inset: "0", background: "transparent", overflowY: "auto", scrollbarWidth: "none", animation: "cp-fadeup .3s ease" }}>
      <div style={{ minHeight: "100%", maxWidth: "400px", margin: "0 auto", boxSizing: "border-box", padding: "40px 22px 34px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {v.arrSample ? <span style={{ marginBottom: "4px", fontWeight: 500, fontSize: "12px", color: "#C9785D", textAlign: "center" }}>{I(v.arrSample)}</span> : null}
        <h1 className="cp-h2" style={{ margin: "8px 0 0", color: INK, textAlign: "center", textWrap: "balance" } as any}>{I(v.arrTitleText || T.arrTitle)}</h1>
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

        {/* a reply that went: the country's postmark, stamped into the passport the first time (a short press, then on) —
            the first time, after its gift has been opened */}
        {v.arrReward && (!v.arrReward.first || gift === "done") ? (
          <div style={{ marginTop: "22px", display: "flex", flexDirection: "column", gap: "10px", padding: "10px 16px 10px 10px", borderRadius: "16px", background: "rgba(255,255,255,.8)", boxShadow: "0 6px 18px rgba(34,48,74,.08)", maxWidth: "340px", width: "100%", boxSizing: "border-box", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) .4s both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {v.arrReward.first ? (
              <span aria-hidden="true" style={{ position: "relative", flex: "none", width: "64px", height: "64px", borderRadius: "6px", background: "#F4F1EA url(./assets/passport-visa.webp) 70% 40% / 300px auto", boxShadow: "inset 0 0 0 1px rgba(90,110,150,.18)", overflow: "hidden" }}>
                <img src={v.arrReward.pm} alt="" className="cp-press" style={{ position: "absolute", left: "4px", top: "10px", width: "56px", mixBlendMode: "multiply" }} />
              </span>
            ) : <span aria-hidden="true" style={{ flex: "none", fontSize: "22px" }}>{I(v.arrReward.flag)}</span>}
            <span style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--fs-caption)", lineHeight: "19px", color: INK }}>{I(v.arrReward.text)}</span>
              {v.arrReward.sub ? <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: MUTED }}>{I(v.arrReward.sub)}</span> : null}
            </span>
            </div>
            {/* the first exchange with this country: a postcard of it, to share (second to the page's own button) */}
            {v.arrPostcard ? (
              <div className="dc-hover-8" onClick={() => setCard(true)} role="button" style={{ marginLeft: "6px", height: "40px", borderRadius: "20px", boxShadow: "inset 0 0 0 1.5px " + INK, background: "rgba(255,252,244,.7)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
                <span style={{ fontWeight: 700, fontSize: "14px", color: INK }}>{I(v.arrPostcard.cta)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* on from here: replies — notify me (bell), the Mailbox under it; once notifications are really on, the Mailbox */}
        <div style={{ flex: "1 0 24px" }} />
        {v.arrNotify?.state === "on" ? (
          <>
            <div className="dc-hover-8" onClick={v.arrToMailbox} role="button" style={{ ...cta, background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}>
              <span style={ctaText}>{I(v.arrNotify.view)}</span>
            </div>
            <span style={{ marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 500, fontSize: "var(--fs-caption)", color: "#2E7458" }}><Bell size={14} color="#2E7458" />{I(v.arrNotify.on)}</span>
          </>
        ) : (
          <>
            {v.arrNotify?.note ? <span role="status" style={{ marginBottom: "10px", maxWidth: "320px", fontWeight: 500, fontSize: "12.5px", lineHeight: "18px", color: MUTED, textAlign: "center" }}>{I(v.arrNotify.note)}</span> : null}
            {v.arrNotify && (v.arrNotify.state === "off" || v.arrNotify.state === "failed") ? (
              <div className="dc-hover-8" onClick={v.arrNotify.go} role="button" style={{ ...cta, background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}>
                <Bell size={18} color="#fff" />
                <span style={ctaText}>{I(v.arrNotify.label)}</span>
              </div>
            ) : (
              /* notifications can't be had here: the Mailbox is the way on */
              <div className="dc-hover-8" onClick={v.arrToMailbox} role="button" style={{ ...cta, background: INK, boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}>
                <span style={ctaText}>{I(v.arrNotify?.view)}</span>
              </div>
            )}
            {v.arrNotify && (v.arrNotify.state === "off" || v.arrNotify.state === "failed") ? (
              <span onClick={v.arrToMailbox} role="button" style={{ marginTop: "8px", padding: "8px 12px", fontWeight: 500, fontSize: "var(--fs-caption)", color: MUTED, textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(v.arrNotify.view)}</span>
            ) : null}
          </>
        )}
      </div>
    </div>
    {gift === "open" && v.arrReward ? <StampGift r={v.arrReward} pc={v.arrPostcard} ok={v.arrGiftOk} onClose={() => setGift("done")} onShare={() => { setGift("done"); setCard(true); }} /> : null}
    {card && v.arrPostcard ? <PostcardSheet pc={v.arrPostcard} onClose={() => setCard(false)} /> : null}
    </>
  );
}
