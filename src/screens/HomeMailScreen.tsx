// HOME — one thing to do: send a letter. A slim pill with the red country mailbox at the top (new letters → Mailbox), then a big
// red envelope, open, a letter part way out of it (a hello in the letter serif and your cat's photo taped on); tapping it (or
// the button) slides the letter out and goes on to writing a letter to a random real cat lover. (The world map, the feed and its Top 10 live in the World tab.)
import { useEffect, useRef, useState } from 'react';
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { LikeButton } from './FeedScreen';

export const C = {
  bg: "#F7F2EA", card: "#FFFDF9", ink: "#2E2621", brown: "#7A5A43", muted: "#8E8173", faint: "#B7AA9A",
  blue: "#7D9BB5", sage: "#9DB09A", terra: "#C9785D", line: "#EADFCF",
};
const kicker = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".16em", color: C.terra } as const;
const btn = { height: "50px", borderRadius: "25px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" } as const;
const btnText = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff", whiteSpace: "nowrap" } as const;

const RED = "#E5483D", INK = "#22304A", MUTED = "#8E8A84";
const ctaBtn = { height: "54px", borderRadius: "27px", background: INK, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease, opacity .2s ease", boxShadow: "0 10px 22px rgba(20,15,10,.16)" } as const;

/** the red envelope (the onboarding's): its open back, front pocket and flap; the fold and the pocket's top as
 *  fractions of the open envelope's height */
const ENV = { open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png", w: 600, h: 671, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const SAMPLE_CAT = "./assets/onboarding-preview/photos/2.png";   // a cat photo with its white border cropped off by object-fit
const EW = 256, EH = (EW * ENV.h) / ENV.w;
/** the letter: a little narrower than the envelope, a bit under half of it out of the pocket */
const LETTER = (() => { const w = EW * 0.8, h = w * 0.78, top = EH * ENV.frontTop - h * 0.45; return { w, h, top }; })();

export default function HomeMailScreen({ v }: { v: Vals }) {
  // the letter slides out of the envelope, then on to writing yours
  const [opening, setOpening] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // arriving from the onboarding (App's EnterFromOnboarding): its build-up is over once you leave Home (cleared then,
  // while none of it is on screen, so nothing plays twice)
  useEffect(() => { if (!v.sFeed) document.documentElement.classList.remove('cp-arrive'); }, [v.sFeed]);
  if (!v.sFeed) return null;
  const send = () => {
    if (opening) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { v.startLetter(); return; }
    setOpening(true);
    timers.current.push(window.setTimeout(() => v.startLetter(), 720), window.setTimeout(() => setOpening(false), 1300));
  };
  // your own cat if you've shared one, otherwise the onboarding's cat
  const photo = v.myAvatar || SAMPLE_CAT;
  return (
    <>
    <div data-screen-label="Home" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
      <div style={{ minHeight: "100%", boxSizing: "border-box", padding: "16px 22px 118px", display: "flex", flexDirection: "column" }}>

        {/* the header's room (the language button is the shared one, top right, as on every tab) */}
        <div aria-hidden="true" style={{ height: "42px" }} />

        {/* the red mailbox, small: new letters → Mailbox */}
        <div className="dc-hover-8 cp-arr-pill" onClick={v.goLetters} role="button" aria-label={v.mbTitle} style={{ alignSelf: "center", marginTop: "14px", maxWidth: "100%", boxSizing: "border-box", borderRadius: "40px", background: "rgba(251,245,234,.92)", padding: "8px 16px 8px 10px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "transform .15s ease", boxShadow: "0 4px 14px rgba(80,60,30,.08)", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
          <div style={{ position: "relative", flex: "none", width: "50px", height: "60px", marginTop: "-18px", marginLeft: "2px" }}>
            {/* the red country mailbox on its wooden post (three frames side by side: shut → its door swinging down →
                open on the letters inside, one over the other). Letters have come: it rattles, then the door swings
                open (each time you come home, and when more arrive). None: it stays shut. */}
            <div key={v.mbHasNew ? "open-" + v.mbCount : "shut"} className={"cp-mb-sprite" + (v.mbHasNew ? " is-opening" : "")} aria-hidden="true"
              style={{ backgroundImage: "url(./assets/home/mailbox-frames.webp)" }}><i /><i /><i /></div>
            {v.mbHasNew ? (
              <span style={{ position: "absolute", right: "-8px", top: "2px", minWidth: "20px", height: "20px", padding: "0 5px", boxSizing: "border-box", borderRadius: "10px", background: RED, border: "2px solid #FBF5EA", color: "#fff", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", animation: "cp-pop .4s cubic-bezier(.34,1.56,.64,1) 1.35s both", zIndex: 2 }}>{I(v.mbCount)}</span>
            ) : null}
          </div>
          <span style={{ minWidth: "0", fontWeight: 700, fontSize: "var(--fs-caption)", lineHeight: "18px", color: v.mbHasNew ? RED : v.mbTurn ? "var(--hand-ink)" : "#6F6A63", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.mbTitle)}</span>
          <span aria-hidden="true" style={{ flex: "none", fontSize: "16px", color: "#C6BBA8" }}>›</span>
        </div>

        {/* the envelope, the words, the button */}
        <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 0 6px" }}>
          <div onClick={send} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); send(); } }} role="button" tabIndex={0} aria-label={v.hmEnvelope}
            className={"cp-env-hero" + (opening ? " is-opening" : "")} style={{ position: "relative", width: EW + "px", height: EH + "px", cursor: "pointer", outline: "none", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .05s both" }}>
            <div style={{ position: "absolute", inset: "0", animation: opening ? "cp-env-squash .5s cubic-bezier(.3,1.4,.5,1) both" : "cp-bob 3.2s ease-in-out infinite" }}>
              {/* the open envelope's back, its flap up */}
              <img src={ENV.open} alt="" draggable={false} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: 1, filter: "drop-shadow(0 18px 22px rgba(60,30,30,.18))" }} />
              {/* the letter, part way out of the pocket: a hello in hand, your cat's photo taped on */}
              <div className="cp-env-letter" style={{ position: "absolute", left: "50%", top: LETTER.top + "px", width: LETTER.w + "px", height: LETTER.h + "px", zIndex: 2, backgroundColor: "#FFFCF4", boxSizing: "border-box", padding: "12px 14px",
                borderRadius: "3px",
                boxShadow: "0 1px 2px rgba(60,40,20,.12), 0 6px 14px rgba(60,40,20,.12)", transform: "translateX(-50%) rotate(-1.5deg)", animation: opening ? "cp-env-letter .6s cubic-bezier(.3,1.2,.5,1) both" : undefined }}>
                <span className="cp-letter-i" style={{ display: "block", fontSize: "19px", lineHeight: "26px", color: "#2F3B57", whiteSpace: "nowrap" }}>{I(v.hmLetterToName || v.hmLetterTo)}</span>
                <span className="cp-letter" style={{ display: "block", paddingRight: "76px", minHeight: "80px", fontSize: "15px", lineHeight: "20px", color: "#4A5470", backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 19px, rgba(47,59,87,.14) 19px 20px)" }}>{I(v.hmLetterLine)}</span>
                <div style={{ position: "absolute", right: "8px", top: "32px", width: "60px", background: "#fff", padding: "4px 4px 9px", boxShadow: "0 2px 6px rgba(40,25,20,.2)", transform: "rotate(5deg)" }}>
                  <img src={photo} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
                  <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-7px", width: "34px", height: "13px", transform: "translateX(-50%) rotate(-6deg)", background: "rgba(242,156,122,.55)" }} />
                </div>
              </div>
              {/* the front pocket */}
              <img src={ENV.front} alt="" draggable={false} style={{ position: "absolute", left: "0", top: ENV.frontTop * 100 + "%", width: "100%", height: ENV.frontH * 100 + "%", zIndex: 3 }} />
            </div>
          </div>

          <h1 className="cp-h1 cp-arr-head" style={{ margin: "26px 0 0", color: INK, textAlign: "center", textWrap: "balance", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .12s both" } as any}>{I(v.hmHead)}</h1>
          <p className="cp-arr-sub" style={{ margin: "8px 0 0", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: "#5E6A80", textAlign: "center", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .16s both" }}>{I(v.hmSub)}</p>
          {/* your turn with a cat pal: the button writes back to them (in the envelope's red); a new cat pal is a link below */}
          <div className="dc-hover-8 cp-arr-cta" onClick={send} role="button" style={{ ...ctaBtn, alignSelf: "stretch", maxWidth: "340px", width: "100%", margin: "22px auto 0", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .2s both", ...(v.hmTurn ? { background: "#22304A", boxShadow: "0 10px 22px rgba(34,48,74,.2)" } : {}) }}>
            <span style={btnText}>{I(v.hmCta)}</span>
          </div>
          {v.hmTurn ? <span onClick={v.hmNewPalGo} role="button" style={{ marginTop: "10px", padding: "6px 12px", fontWeight: 500, fontSize: "var(--fs-caption)", color: "#5E6A80", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(v.hmNewPal)}</span> : null}
        </div>
      </div>
    </div>

    {/* random cat pal — result sheet */}
    {v.palPhase === "found" || v.palPhase === "none" ? (
      <>
        <div onClick={v.palClose} style={{ position: "absolute", inset: "0", zIndex: 70, background: "rgba(20,15,10,.32)", animation: "cp-fade .2s ease" }} />
        <div role="dialog" aria-label={v.t?.mtFound} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 71, background: "#fff", borderRadius: "28px 28px 0 0", padding: "12px 20px 28px", animation: "cp-sheet .3s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8", margin: "0 auto 16px" }} />
          {v.palCard ? (
            <>
              <span style={{ display: "block", fontWeight: 700, fontSize: "11px", letterSpacing: ".14em", color: RED }}>{I(v.t?.mtFound?.toUpperCase())}</span>
              <div style={{ marginTop: "12px", display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{ flex: "none", width: "96px", height: "116px", borderRadius: "14px", overflow: "hidden", background: "#F2EEE7", border: "4px solid #fff", boxShadow: "0 6px 16px rgba(40,30,20,.16)", transform: "rotate(-3deg)", animation: "cp-pop .4s cubic-bezier(.34,1.56,.64,1) both" }}>
                  <img src={v.palCard.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>{I(v.palCard.whoFlag)}{" "}{I(v.palCard.who)}</span>
                  <span style={{ fontWeight: 500, fontSize: "12.5px", color: MUTED }}>{I(v.palCard.country)}{v.palCard.catName ? <>{" · 🐈 "}{I(v.palCard.catName)}</> : null}</span>
                  <span className="cp-hand cp-clamp3" style={{ marginTop: "4px", fontSize: "19px", lineHeight: "22px", color: "#3E3A35" }}>{"“"}{I(v.palCard.caption)}{"”"}</span>
                </div>
              </div>
              <div className="dc-hover-8" onClick={v.palWrite} role="button" style={{ ...ctaBtn, marginTop: "20px", background: "#22304A", boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}>
                <span aria-hidden="true" style={{ fontSize: "var(--fs-body)" }}>✉️</span>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" }}>{I(v.t?.mtWrite)}</span>
              </div>
              <span onClick={v.findPal} role="button" style={{ display: "block", marginTop: "12px", textAlign: "center", padding: "6px", fontWeight: 500, fontSize: "var(--fs-caption)", color: MUTED, cursor: "pointer" }}>{"🔀 "}{I(v.t?.mtAnother)}</span>
            </>
          ) : (
            <>
              <span style={{ display: "block", fontWeight: 500, fontSize: "var(--fs-body)", lineHeight: "22px", color: INK, textAlign: "center", padding: "6px 8px 0" }}>{I(v.t?.mtNone)}</span>
              <div className="dc-hover-8" onClick={() => { v.palClose(); v.quickShare(); }} role="button" style={{ ...ctaBtn, marginTop: "18px" }}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" }}>{"📷 "}{I(v.t?.hSendCta)}</span>
              </div>
            </>
          )}
        </div>
      </>
    ) : null}
    </>
  );
}

/** Envelope-opening experience: the flap lifts, the letter rises, then the letter itself. */
export function OpenLetter({ v }: { v: Vals }) {
  const fx = v.openFx, f = v.openCard;
  if (!(v.sFeed || v.sCatMap || v.sExplore) || !fx || !f) return null;
  return (
    <div style={{ position: "absolute", inset: "0", zIndex: 80, background: "rgba(248,244,238,.97)", animation: "cp-fade .2s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      {fx.phase === "opening" ? (
        <div key={fx.key} style={{ position: "absolute", left: "calc(50% - 140px)", top: "calc(50% - 120px)", width: "280px", height: "190px", perspective: "700px", animation: "cp-envin .35s cubic-bezier(.2,.8,.2,1) both" }}>
          {/* back */}
          <div style={{ position: "absolute", inset: "0", borderRadius: "8px", background: "#F1E8DA", boxShadow: "0 12px 30px rgba(90,70,40,.15)" }} />
          {/* letter rising out */}
          <div style={{ position: "absolute", left: "18px", right: "18px", top: "14px", height: "160px", borderRadius: "6px", background: "#FFFDF9", boxShadow: "0 2px 8px rgba(0,0,0,.08)", animation: "cp-rise .7s cubic-bezier(.3,1.1,.5,1) .85s both", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "12px" }}>
            {f.photo ? <img src={f.photo} alt="" style={{ width: "84px", height: "84px", objectFit: "cover", borderRadius: "4px" }} /> : null}
            <span className="cp-serif" style={{ marginTop: "8px", fontStyle: "italic", fontSize: "13px", color: C.ink }}>{I(v.t?.oDear)}</span>
          </div>
          {/* front pocket */}
          <svg viewBox="0 0 280 190" style={{ position: "absolute", inset: "0", overflow: "visible" }} aria-hidden="true">
            <path d="M0 52 L140 128 L280 52 L280 182 Q280 190 272 190 L8 190 Q0 190 0 182 Z" fill="#F8F1E6" />
            <path d="M2 188 L140 112 L278 188" fill="none" stroke="#E4D8C5" strokeWidth="1.2" />
          </svg>
          {/* stamp + postmark on the front */}
          <div style={css(`position:absolute;right:16px;bottom:16px;width:34px;height:46px;background:url(${R(f.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.15))`)} />
          <div style={css(`position:absolute;right:34px;bottom:18px;width:58px;height:42px;background:url(${R(f.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.8;transform:rotate(-10deg)`)} />
          {/* flap opens */}
          <div style={{ position: "absolute", left: "0", right: "0", top: "0", height: "112px", transformOrigin: "50% 0", transformStyle: "preserve-3d", animation: "cp-flap .6s cubic-bezier(.4,0,.2,1) .35s both", zIndex: 2 }}>
            <svg viewBox="0 0 280 112" style={{ position: "absolute", inset: "0", backfaceVisibility: "hidden" }} aria-hidden="true">
              <path d="M0 8 Q0 0 8 0 L272 0 Q280 0 280 8 L140 112 Z" fill="#EFE4D3" stroke="#E2D5C1" strokeWidth="1" />
            </svg>
          </div>
          <span style={{ position: "absolute", left: "-30px", right: "-30px", top: "214px", textAlign: "center", fontWeight: 500, fontSize: "var(--fs-caption-sm)", color: C.muted, animation: "cp-fadeup .4s ease .3s both" }}>
            {I(v.t?.hFrom)}{" "}{I(f.who)}{" · "}{I(f.flag)}{" "}{I(f.country)}
          </span>
        </div>
      ) : (
        <div style={{ padding: "60px 22px 40px", animation: "cp-arrive .45s cubic-bezier(.2,.8,.2,1) both" }}>
          <div className="cp-frost" style={{ position: "relative", borderRadius: "24px", padding: "20px 20px 22px", boxShadow: "0 18px 40px rgba(90,70,40,.10)" }}>
            <div style={css(`position:absolute;right:16px;top:14px;width:42px;height:57px;background:url(${R(f.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.16))`)} />
            <div style={css(`position:absolute;right:40px;top:10px;width:76px;height:56px;background:url(${R(f.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.8;transform:rotate(-10deg)`)} />
            <span style={kicker}>{I(v.t?.hToday)}</span>
            <span style={{ display: "block", marginTop: "6px", fontWeight: 700, fontSize: "var(--fs-body)", color: C.ink }}>{I(v.t?.hFrom)}{" "}{I(f.who)}</span>
            <span style={{ display: "block", fontWeight: 500, fontSize: "12px", color: C.muted }}>{I(f.flag)}{" "}{I(f.country)}{" · "}{I(f.day)}</span>
            <div style={{ marginTop: "16px", background: "#fff", padding: "7px", boxShadow: "0 2px 6px rgba(90,70,40,.14)" }}>
              <img src={f.photo} alt={f.text} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
            </div>
            <span className="cp-serif" style={{ display: "block", marginTop: "16px", fontStyle: "italic", fontSize: "15px", color: C.muted }}>{I(v.t?.oDear)}</span>
            <span className="cp-serif" style={{ display: "block", marginTop: "6px", fontSize: "18px", lineHeight: "27px", color: C.ink, overflowWrap: "anywhere" }}>{I(f.text)}</span>
            {f.catName ? <span style={{ display: "block", marginTop: "8px", fontWeight: 500, fontSize: "12.5px", color: C.muted }}>{"🐈 "}{I(f.catName)}{" · "}{I(f.label)}</span> : null}
            <div style={{ marginTop: "18px", display: "flex", gap: "10px", alignItems: "center" }}>
              <LikeButton c={f} size={44} />
              {f.canLetter ? (
                <div className="dc-hover-8" onClick={() => { v.closeOpen(); f.letter(); }} role="button" style={{ ...btn, flex: "1", height: "48px" }}>
                  <span style={{ fontSize: "var(--fs-body)" }}>✉️</span><span style={btnText}>{I(v.t?.oWriteBack)}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ marginTop: "18px", display: "flex", justifyContent: "center", gap: "26px" }}>
            {f.more ? <span onClick={v.nextToday} role="button" style={{ fontWeight: 500, fontSize: "var(--fs-caption-sm)", color: C.brown, cursor: "pointer" }}>{"✉️ "}{I(v.t?.oAnother)}</span> : null}
            <span onClick={v.closeOpen} role="button" style={{ fontWeight: 500, fontSize: "var(--fs-caption-sm)", color: C.muted, cursor: "pointer" }}>{I(v.t?.oClose)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
