// THE LETTER FROM HOME — one letter, finished step by step on the same sheet of paper:
//   1 your cat's photo (a polaroid taped on) and a hello, written right on the letter (a fine serif, italic accents)
//   2 (first letter only) who's this little one: the polaroid, the cat's name, where it's sent from
//   3 the finished letter over the open red envelope: it tucks itself in, the flap shuts, it's stamped; "Send my
//     letter" goes straight to the map, which shows the loading while a cat pal is found
//   4 nobody to match yet: the sealed envelope waits (nothing is sent); "Try again" looks for a match again
// Sending goes on to the delivery globe (DeliveryMapScreen). State and steps live in CatPalLogic (openCompose…).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { field, label } from './OnboardScreen';

const INK = "#22304A", MUTED = "#5E6A80", LETTER = "#2F3B57", SOFT = "#7A8299";
const ENV = { open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png", w: 600, h: 671, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const EW = 272, EH = (EW * ENV.h) / ENV.w;
/** the letter is as wide as the envelope's opening (a little narrower than the envelope), so it goes in snugly */
const LETTER_W = EW - 18;
/** how far the letter's bottom sits inside the envelope's pocket (step 3) */
const TUCK = 34;
const cta = { height: "54px", borderRadius: "27px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .2s ease, transform .15s ease", boxShadow: "0 10px 22px rgba(20,15,10,.14)" } as const;
const ctaText = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff", whiteSpace: "nowrap" } as const;
const linkBtn = { padding: "8px 10px", fontWeight: 500, fontSize: "var(--fs-caption)", color: MUTED, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" } as const;
const paperBg = { backgroundColor: "#FFFCF4", boxShadow: "0 1px 2px rgba(60,40,20,.10), 0 14px 30px rgba(60,40,20,.13)", borderRadius: "3px" } as const;
/** fine ruled lines under the words, one per line of text */
const ruled = (h: number) => `repeating-linear-gradient(to bottom, transparent 0 ${h - 1}px, rgba(47,59,87,.14) ${h - 1}px ${h}px)`;

/** your cat's photo, taped on: or, before there is one, the place to add it */
function Polaroid({ v, w, caption, onPick }: { v: Vals; w: number; caption?: string; onPick?: () => void }) {
  const has = !!v.cmpPhoto;
  return (
    <div onClick={onPick} role={onPick ? "button" : undefined} aria-label={onPick ? (has ? v.cpT?.cpChangePhoto : v.cpT?.cpAddPhoto) : undefined}
      style={{ position: "relative", width: w + "px", background: "#fff", padding: "7px 7px " + (caption != null ? "8px" : "22px"), boxShadow: "0 3px 10px rgba(40,25,20,.2)", transform: "rotate(2deg)", cursor: onPick ? "pointer" : "default", flex: "none" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-9px", width: "54px", height: "18px", transform: "translateX(-50%) rotate(-5deg)", background: "rgba(242,156,122,.55)", zIndex: 1 }} />
      {has ? (
        <img src={v.cmpPhoto} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1 / 1", boxSizing: "border-box", border: "2px dashed #D9CDBB", borderRadius: "3px", background: "#FBF7F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {/* a plus, and what goes here */}
          <span aria-hidden="true" style={{ position: "relative", width: "30px", height: "30px" }}>
            <i style={{ position: "absolute", left: "0", right: "0", top: "14px", height: "2px", borderRadius: "1px", background: "#9A9384" }} />
            <i style={{ position: "absolute", top: "0", bottom: "0", left: "14px", width: "2px", borderRadius: "1px", background: "#9A9384" }} />
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "var(--fs-caption-sm)", color: "#9A9384" }}>{I(v.cpT?.cpPhotoSlot)}</span>
        </div>
      )}
      {caption != null ? <span className="cp-letter-i" style={{ display: "block", marginTop: "4px", textAlign: "center", fontSize: "22px", lineHeight: "26px", color: caption ? LETTER : "#C9BDAE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{caption || v.cpT?.cpCatNamePh}</span> : null}
      {onPick && has ? <span style={{ position: "absolute", right: "8px", bottom: "4px", fontWeight: 500, fontSize: "11px", color: MUTED }}>{I(v.cpT?.cpChangePhoto)}</span> : null}
    </div>
  );
}

/** the letter: a hello, the polaroid, your words on fine ruled lines, signed by your cat (in the letter serif) */
export function Paper({ v, w, edit }: { v: Vals; w: number; edit?: boolean }) {
  const line = edit ? 27 : 23;
  return (
    <div className="cp-paper-sheet" style={{ ...paperBg, position: "relative", width: w + "px", maxWidth: "100%", boxSizing: "border-box", padding: edit ? "18px 18px 14px" : "14px 14px 12px", transform: "rotate(-1deg)" }}>
      <span className="cp-letter-i" style={{ display: "block", fontSize: edit ? "27px" : "22px", lineHeight: "30px", color: LETTER }}>{I(v.cpT?.cpDear)}</span>
      <div style={{ display: "flex", justifyContent: "center", margin: edit ? "14px 0 12px" : "10px 0 8px" }}>
        <Polaroid v={v} w={Math.round(w * (edit ? 0.56 : 0.58))} onPick={edit ? v.cmpPickPhoto : undefined} />
      </div>
      {edit ? (
        <textarea id="cp-letter-text" value={v.cmpText ?? ""} onChange={v.setCmpText} placeholder={v.cpT?.cpMsgPh} maxLength={v.cmpTextMax} rows={3} className="cp-letter cp-letter-input"
          style={{ display: "block", width: "100%", boxSizing: "border-box", border: "none", outline: "none", resize: "none", padding: "0 2px", margin: "0", background: "transparent", backgroundImage: ruled(line), backgroundAttachment: "local",
            fontSize: "18.5px", lineHeight: line + "px", color: LETTER, minHeight: line * 3 + "px" }} />
      ) : (
        <span className="cp-letter" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", height: line * 3 + "px", padding: "0 2px", backgroundImage: ruled(line), fontSize: "16px", lineHeight: line + "px", color: LETTER, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{I(v.cmpText)}</span>
      )}
      {/* signed by your cat; and (finished) where it's sent from */}
      <div style={{ marginTop: "4px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
        {!edit ? <span style={{ minWidth: "0", fontWeight: 500, fontSize: "11.5px", color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(v.cmpFlag)}{" "}{I(v.cmpCountryName)}</span> : <span />}
        <span className="cp-letter-i" style={{ flex: "none", maxWidth: "70%", fontSize: edit ? "22px" : "19px", lineHeight: "26px", color: SOFT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{"— "}{I(v.cmpSign)}</span>
      </div>
    </div>
  );
}

/** the stamp, and over it the sending country's postmark (each animates in, by its class) */
function Postage({ v, top, right, cls }: { v: Vals; top: number; right: number; cls: string }) {
  return (
    <div aria-hidden="true" className={cls} style={{ position: "absolute", top: top + "px", right: right + "px", width: "120px", height: "72px", zIndex: 5, pointerEvents: "none" }}>
      <div className="cp-post-stamp" style={{ position: "absolute", right: "0", top: "0", width: "50px", height: "66px", background: `url(${v.cmpStamp}) center / contain no-repeat`, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.22))" }} />
      {v.cmpPm ? <div className="cp-post-mark" style={css(`position:absolute;right:26px;top:6px;width:86px;height:62px;background:url(${R(v.cmpPm)}) center / contain no-repeat;mix-blend-mode:multiply`)} /> : null}
    </div>
  );
}

/** the letter resting in the open red envelope, tucked `deep` px further into its pocket than in the preview (so only
 *  its top shows), the stamp and postmark on the envelope's front, low on the right (the Arrived page: the letter as delivered) */
export function LetterInEnvelope({ v, deep = 0 }: { v: Vals; deep?: number }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* the part of it below the pocket's bottom (tucked this deep) is inside the envelope: clipped away */}
      <div style={{ position: "relative", zIndex: 2, clipPath: `inset(0 0 ${Math.max(0, deep - (EH * ENV.frontH - TUCK) + 8)}px 0)` }}><Paper v={v} w={LETTER_W} /></div>
      <div style={{ position: "relative", width: EW + "px", height: EH + "px", marginTop: -(EH * ENV.frontTop + TUCK + deep) + "px" }}>
        <img src={ENV.open} alt="" draggable={false} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: 1, filter: "drop-shadow(0 18px 22px rgba(60,30,30,.18))" }} />
        <img src={ENV.front} alt="" draggable={false} style={{ position: "absolute", left: "0", top: ENV.frontTop * 100 + "%", width: "100%", height: ENV.frontH * 100 + "%", zIndex: 3 }} />
        <Postage v={v} top={EH - 92} right={18} cls="cp-post-in" />
      </div>
    </div>
  );
}
/** how far down into the pocket the delivered letter sits (most of it in, its top showing) */
export const DEEP_IN = Math.round(EH * ENV.frontH - TUCK + 20);

export default function ComposeScreen({ v }: { v: Vals }) {
  // the letter tucks itself into the envelope, the flap shuts, the stamp and postmark go on, as soon as the preview
  // opens (a beat after it appears); going back to edit takes it out again
  const [sealing, setSealing] = useState(false);
  const step = v.cmpStep;
  useEffect(() => {
    if (step === 4) { setSealing(true); return; }
    if (step === 3) { const t = setTimeout(() => setSealing(true), 450); return () => clearTimeout(t); }
    setSealing(false);
  }, [step]);
  // the envelope, letter and all, sits in the middle of the room between the title and the button; as the letter goes
  // in, the whole of it rises by half the letter's height above the envelope, so the shut envelope ends up in the middle
  const letterEl = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  useLayoutEffect(() => { if (step === 3 && letterEl.current) setLift(Math.max(0, (letterEl.current.offsetHeight - (EH * ENV.frontTop + TUCK)) / 2)); }, [step, v.sCompose, v.cmpText, v.cmpPhoto]);
  if (!v.sCompose) return null;
  // sending goes straight to the map, which shows the loading (the letter waiting over your country, the cat running)
  const send = () => { if (v.cmpBusy) return; setSealing(true); v.cmpSend(); };
  const titles: Record<number, [string, string]> = { 1: [v.cpT?.cpS1Title, v.cpT?.cpS1Sub], 2: [v.cpT?.cpS2Title, v.cpT?.cpS2Sub], 3: [v.cpT?.cpS3Title, v.cpT?.cpS3Sub], 4: [v.cpT?.cpWaitTitle, v.cpT?.cpWaitSub] };
  const [title, sub] = titles[step] || titles[1];
  const sealed = sealing || step === 4;
  return (
    <div data-screen-label="Letter" style={{ position: "absolute", inset: "0", background: "transparent", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
      <div style={{ minHeight: "100%", boxSizing: "border-box", padding: "14px 22px 34px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* back, and how far along the letter is */}
        <div style={{ alignSelf: "stretch", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div className="dc-hover-12" onClick={v.cmpBack} role="button" aria-label={v.cpT?.cpBack} style={{ position: "absolute", left: "-6px", top: "2px", width: "40px", height: "40px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: v.cmpBusy ? "default" : "pointer", opacity: v.cmpBusy ? 0.4 : 1 }}>
            <div style={{ width: "10px", height: "10px", borderLeft: "2px solid " + INK, borderBottom: "2px solid " + INK, transform: "rotate(45deg)", marginLeft: "4px" }} />
          </div>
          <div aria-hidden="true" style={{ display: "flex", gap: "6px" }}>
            {each([1, 2, 3], (n: number) => <span style={{ width: n === Math.min(step, 3) ? "18px" : "6px", height: "6px", borderRadius: "3px", background: n <= Math.min(step, 3) ? INK : "rgba(34,48,74,.22)", transition: "width .3s ease, background .3s ease" }} />)}
          </div>
        </div>

        <div key={step} style={{ flex: "1 0 auto", width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", alignItems: "center", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
          <h1 className="cp-h2" style={{ margin: "10px 0 0", color: INK, textAlign: "center", textWrap: "balance" } as any}>{I(title)}</h1>
          <p style={{ margin: "6px 0 0", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: MUTED, textAlign: "center", textWrap: "balance" } as any}>{I(sub)}</p>

          {step === 1 ? (
            <>
              <div style={{ marginTop: "20px", width: "100%", display: "flex", justifyContent: "center", animation: "cp-letterup .6s cubic-bezier(.2,.9,.3,1) both" }}><Paper v={v} w={330} edit /></div>
              {/* a little help saying hello: tap one and its example is written on the letter (after what's there), ready to go on */}
              <div style={{ marginTop: "16px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) .25s both" }}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "13px", color: "#7A8091", textAlign: "center" }}>{I(v.cpT?.cpGuide)}</span>
                <div className="cp-tips">
                  {each(v.cmpTips, (chip: any) => (
                    <span className="dc-hover-2" onClick={() => { chip.add(); setTimeout(() => { const el = document.getElementById("cp-letter-text") as HTMLTextAreaElement | null; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); el.scrollTop = el.scrollHeight; } }, 0); }}
                      role="button" style={{ flex: "none", padding: "8px 12px", borderRadius: "999px", background: "rgba(255,252,244,.72)", border: "1px solid #D9D5CC", boxShadow: "0 1px 2px rgba(60,40,20,.04)", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "13.5px", lineHeight: "16px", color: INK, cursor: "pointer", whiteSpace: "nowrap", transition: "transform .15s ease, background .15s ease, border-color .15s ease" }}>{I(chip.label)}</span>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div style={{ marginTop: "22px" }}><Polaroid v={v} w={168} caption={v.cmpCatName} /></div>
              <label style={{ marginTop: "24px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={label}>{I(v.cpT?.cpCatName)}</span>
                <input value={v.cmpCatName ?? ""} onChange={v.setCmpCat} placeholder={v.cpT?.cpCatNamePh} maxLength={24} autoComplete="off" style={{ ...field, background: "rgba(255,255,255,.88)" }} />
              </label>
              <label style={{ marginTop: "14px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={label}>{I(v.cpT?.cpFrom)}</span>
                <select value={v.cmpCountry ?? ""} onChange={v.setCmpCountry} style={{ ...field, background: "rgba(255,255,255,.88)", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
                  <option value="" disabled>{v.cpT?.cpPickCountry}</option>
                  {each(v.countryOpts, (o: any) => <option value={o.cc}>{o.label}</option>)}
                </select>
              </label>
            </>
          ) : null}

          {step === 4 ? (
            /* sealed, waiting for a cat pal: just the closed envelope, stamped and postmarked (in the middle) */
            <div style={{ flex: "1", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
            <div style={{ position: "relative", width: "260px", animation: "cp-bob 3.2s ease-in-out infinite" }}>
              <img src="./assets/onboarding-preview/envelope-closed.png" alt="" draggable={false} style={{ display: "block", width: "100%", filter: "drop-shadow(0 18px 22px rgba(60,30,30,.18))" }} />
              <Postage v={v} top={14} right={16} cls="cp-post-in" />
            </div>
            </div>
          ) : null}
          {step === 3 ? (
            /* the letter over the open envelope, its bottom in the pocket; then it tucks itself in and the flap shuts */
            <div style={{ flex: "1", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 0" }}>
            <div className={"cp-seal" + (sealed ? " is-sealed" : "")} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
              transform: sealed ? `translateY(${-lift}px)` : "none", transition: "transform .85s cubic-bezier(.5,0,.3,1)" }}>
              {/* --seal-in: how much of the letter is left showing below the envelope's pocket once it's all the way in (clipped away) */}
              <div ref={letterEl} className="cp-seal-letter" style={{ position: "relative", zIndex: 2, ["--seal-in" as string]: `${Math.round(24 + EH * ENV.frontH - TUCK)}px` }}><Paper v={v} w={LETTER_W} /></div>
              <div style={{ position: "relative", width: EW + "px", height: EH + "px", marginTop: -(EH * ENV.frontTop + TUCK) + "px" }}>
                <img src={ENV.open} alt="" draggable={false} className="cp-seal-back" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: 1, filter: "drop-shadow(0 18px 22px rgba(60,30,30,.18))" }} />
                <img src={ENV.front} alt="" draggable={false} style={{ position: "absolute", left: "0", top: ENV.frontTop * 100 + "%", width: "100%", height: ENV.frontH * 100 + "%", zIndex: 3 }} />
                <img src={ENV.open} alt="" draggable={false} className="cp-seal-flap" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: 4, clipPath: `inset(0 0 ${(1 - ENV.fold) * 100}% 0)`, transformOrigin: `50% ${ENV.fold * 100}%` }} />
                {/* once it's shut: the stamp goes on, then the sending country's postmark over it */}
                <Postage v={v} top={EH * ENV.fold + 16} right={20} cls="cp-seal-post" />
              </div>
            </div>
            </div>
          ) : null}

          {v.cmpErr ? <span role="alert" style={{ marginTop: "14px", fontWeight: 500, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#D9442F", textAlign: "center" }}>{I(v.cmpErr)}</span> : null}

          {/* the one thing to do on this step */}
          {step === 1 || step === 2 ? (
            <div className="dc-hover-8" onClick={v.cmpNext} role="button" aria-disabled={!v.cmpCanNext} style={{ ...cta, marginTop: "22px", width: "100%", background: v.cmpCanNext ? INK : "#B9B2A4", boxShadow: v.cmpCanNext ? cta.boxShadow : "none" }}>
              <span style={ctaText}>{I(v.cpT?.cpContinue)}</span>
            </div>
          ) : null}
          {step === 3 ? (
            <>
              <div className="dc-hover-8" onClick={send} role="button" aria-busy={v.cmpBusy} style={{ ...cta, marginTop: "18px", width: "100%", background: v.cmpBusy ? "#FBF5EA" : "#E5483D", boxShadow: v.cmpBusy ? "inset 0 0 0 1.5px #EADFCB" : "0 10px 22px rgba(229,72,61,.28)", cursor: v.cmpBusy ? "default" : "pointer", position: "relative", overflow: "hidden" }}>
                {v.cmpBusy ? <span className="cp-catrun" aria-hidden="true"><img src="./assets/cat-run.gif" alt="" /></span> : null}
                <span style={{ ...ctaText, position: "relative", color: v.cmpBusy ? "#7A5A43" : "#fff" }}>{I(v.cmpBusy ? v.cpT?.cpSending : v.cpT?.cpSend)}</span>
              </div>
              {!v.cmpBusy ? (
                <div style={{ marginTop: "6px", display: "flex", gap: "6px", justifyContent: "center" }}>
                  <span onClick={v.cmpEditLetter} role="button" style={linkBtn}>{I(v.cpT?.cpEditLetter)}</span>
                  <span onClick={v.cmpEditCat} role="button" style={linkBtn}>{I(v.cpT?.cpEditCat)}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {step === 4 ? (
            <>
              <div className="dc-hover-8" onClick={v.cmpBusy ? undefined : v.cmpSend} role="button" aria-busy={v.cmpBusy} style={{ ...cta, marginTop: "18px", width: "100%", background: v.cmpBusy ? "#B9B2A4" : INK }}><span style={ctaText}>{I(v.cmpBusy ? v.cpT?.cpSending : v.cpT?.cpTryAgain)}</span></div>
              <span onClick={v.cmpClose} role="button" style={{ ...linkBtn, marginTop: "6px" }}>{I(v.cpT?.cpBackHome)}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
