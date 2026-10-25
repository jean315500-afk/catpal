// THE LETTER FROM HOME — one letter, finished step by step on the same sheet of paper:
//   1 a cat's photo (a polaroid taped on) and a little story, written right on the letter (a fine serif, italic accents);
//     once there's a photo, "Need ideas?" (the hello tips, when asked for) and a light "My cat / A cat I met" — a cat
//     you met needs no profile, only a photo and a story
//   2 (first letter only) who's this little one: the polaroid, the cat's name, where it's sent from — or, for a cat you
//     met, the name you sign with
//   3 the finished letter over the open red envelope, to read once more; "Send my letter" tucks it in, shuts the flap,
//     stamps it, then goes to the map (loading while a cat pal is found — or, with no one yet, "Invite a friend")
//   4 sent as a link (from the Map): the sealed envelope, the link to share or copy (not delivered until the friend writes back)
// Sending goes on to the delivery globe (DeliveryMapScreen). State and steps live in CatPalLogic (openCompose…).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
export function Paper({ v, w, edit, underPhoto }: { v: Vals; w: number; edit?: boolean; underPhoto?: ReactNode }) {
  const line = edit ? 27 : 23;
  return (
    <div className="cp-paper-sheet" style={{ ...paperBg, position: "relative", width: w + "px", maxWidth: "100%", boxSizing: "border-box", padding: edit ? "18px 18px 14px" : "14px 14px 12px", transform: "rotate(-1deg)" }}>
      <span className="cp-letter-i" style={{ display: "block", fontSize: edit ? "27px" : "22px", lineHeight: "30px", color: LETTER }}>{I(v.cpT?.cpDear)}</span>
      <div style={{ display: "flex", justifyContent: "center", margin: edit ? "14px 0 12px" : "10px 0 8px" }}>
        <Polaroid v={v} w={Math.round(w * (edit ? 0.56 : 0.58))} onPick={edit ? v.cmpPickPhoto : undefined} />
      </div>
      {/* (writing) right under the photo: whose cat it is */}
      {edit && underPhoto ? <div style={{ margin: "-2px 0 12px" }}>{underPhoto}</div> : null}
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
  // the preview shows the letter over the open envelope, to read it once more; "Send my letter" tucks it in, shuts the
  // flap, puts on the stamp and the postmark — then it goes (to the map). Going back to edit takes it out again.
  const [sealing, setSealing] = useState(false);
  // the hello tip just tapped (it shows as picked for a moment)
  const [picked, setPicked] = useState<number | null>(null);
  // "Need ideas?": the hello tips, only when asked for (closed again on another step)
  const [ideas, setIdeas] = useState(false);
  const pickT = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(pickT.current), []);
  const sealT = useRef<number | undefined>(undefined);
  const step = v.cmpStep;
  useEffect(() => { setSealing(step === 4); setIdeas(false); }, [step]);
  // back here (from the map, or later from Home): sealed only if it still is (a link being made, or made)
  useEffect(() => { if (v.sCompose) setSealing(step === 4 || (step === 3 && !!v.cmpBusy)); }, [v.sCompose]);
  // not sent (an error, back on the preview): it opens again, to try again
  useEffect(() => { if (step === 3 && v.cmpErr && !v.cmpBusy) setSealing(false); }, [v.cmpErr, v.cmpBusy]);
  useEffect(() => () => clearTimeout(sealT.current), []);
  // the envelope, letter and all, sits in the middle of the room between the title and the button; as the letter goes
  // in, the whole of it rises by half the letter's height above the envelope, so the shut envelope ends up in the middle
  const letterEl = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  useLayoutEffect(() => { if (step === 3 && letterEl.current) setLift(Math.max(0, (letterEl.current.offsetHeight - (EH * ENV.frontTop + TUCK)) / 2)); }, [step, v.sCompose, v.cmpText, v.cmpPhoto]);
  if (!v.sCompose) return null;
  // sending: sealed first (~2.4 s: in, shut, stamped, postmarked), then off to the map, which shows the loading
  const send = () => {
    if (v.cmpBusy || sealing) return;
    setSealing(true);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    sealT.current = window.setTimeout(() => v.cmpSend(), reduce ? 0 : 2400);
  };
  const T = v.cpT || {};
  const titles: Record<number, [string, string]> = { 1: [T.cpS1Title, T.cpS1Sub], 2: v.cmpMet ? [T.cpS2MetTitle, T.cpS2MetSub] : [T.cpS2Title, T.cpS2Sub], 3: [T.cpS3Title, T.cpS3Sub], 4: [T.ivReadyTitle, T.ivReadySub] };
  const [title0, sub0] = titles[step] || titles[1];
  // a reply: "Write back to …" (its first step), and their letter kept in view
  const re = v.cmpReply, s3 = step === 3 ? v.cmpS3 : null;
  const title = re && step === 1 ? re.title : s3 ? s3.title : title0, sub = re && step === 1 ? re.sub : s3 ? s3.sub : sub0;
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
              {/* (writing back: just your sheet, "Dear …," at its top) */}
              <div style={{ marginTop: "20px", position: "relative", zIndex: 2, width: "100%", display: "flex", justifyContent: "center", animation: "cp-letterup .6s cubic-bezier(.2,.9,.3,1) both" }}><Paper v={v} w={330} edit underPhoto={v.cmpPhoto ? (
                <>
                  <div role="radiogroup" aria-label={T.cpKindAsk} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", flexWrap: "wrap", animation: "cp-rise2 .4s cubic-bezier(.2,.8,.2,1) both" }}>
                    {each(v.cmpKinds, (k: any) => (
                      <span key={k.id} onClick={k.tap} role="radio" aria-checked={k.on} className="dc-hover-2"
                        style={{ padding: "6px 11px", borderRadius: "999px", border: "1px solid " + (k.on ? INK : "#D9D5CC"), background: k.on ? "#fff" : "rgba(255,252,244,.6)", fontWeight: k.on ? 700 : 500, fontSize: "12.5px", lineHeight: "15px", color: INK, cursor: "pointer", whiteSpace: "nowrap", transition: "border-color .15s ease, background .15s ease" }}>{I(k.label)}</span>
                    ))}
                  </div>
                </>
              ) : null} /></div>
              {/* once there's a photo: ideas if wanted (one quiet button; the tips open under it, and only the one you pick
                  is written on the letter — after what's there, never over it). Whose cat it is sits right under the photo */}
              {v.cmpPhoto ? (
                <div style={{ marginTop: "14px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) .1s both" }}>
                  <span onClick={() => setIdeas((o) => !o)} role="button" aria-expanded={ideas} className="dc-hover-2"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "999px", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "13.5px", lineHeight: "16px", color: INK, cursor: "pointer",
                      background: ideas ? "#fff" : "rgba(255,252,244,.72)", border: "1px solid " + (ideas ? INK : "#D9D5CC"), boxShadow: "0 1px 2px rgba(60,40,20,.06)", transition: "background .15s ease, border-color .15s ease" }}>
                    {I(T.cpIdeas)}
                    <span aria-hidden="true" style={{ display: "inline-block", lineHeight: "1", transform: ideas ? "rotate(180deg) translateY(-3px)" : "translateY(-3px)", transition: "transform .2s ease" }}>⌄</span>
                  </span>
                  {ideas ? (
                    <div className="cp-tips" style={{ animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
                      {each(v.cmpTips, (chip: any, i: number) => (
                        <span className={"dc-hover-2 cp-tip" + (picked === i ? " is-picked" : "")} onClick={() => { chip.add(); setPicked(i); clearTimeout(pickT.current); pickT.current = window.setTimeout(() => setPicked(null), 1600); setTimeout(() => { const el = document.getElementById("cp-letter-text") as HTMLTextAreaElement | null; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); el.scrollTop = el.scrollHeight; } }, 0); }}
                          role="button" style={{ flex: "none", padding: "8px 12px", borderRadius: "999px", background: "rgba(255,252,244,.72)", border: "1px solid #D9D5CC", boxShadow: "0 1px 2px rgba(60,40,20,.04)", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "13.5px", lineHeight: "16px", color: INK, cursor: "pointer", whiteSpace: "nowrap", transition: "transform .12s ease, background .15s ease, border-color .15s ease" }}>{picked === i ? <span aria-hidden="true" style={{ marginRight: "5px", color: "#2E7458", fontWeight: 700 }}>✓</span> : null}{I(chip.label)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div style={{ marginTop: "22px" }}><Polaroid v={v} w={168} caption={v.cmpMet ? undefined : v.cmpCatName} /></div>
              {v.cmpMet ? (
                <label style={{ marginTop: "24px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={label}>{I(T.cpPenName)}</span>
                  <input value={v.cmpPenName ?? ""} onChange={v.setCmpPen} placeholder={T.cpPenNamePh} maxLength={24} autoComplete="nickname" style={{ ...field, background: "rgba(255,255,255,.88)" }} />
                </label>
              ) : (
                <label style={{ marginTop: "24px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={label}>{I(v.cpT?.cpCatName)}</span>
                  <input value={v.cmpCatName ?? ""} onChange={v.setCmpCat} placeholder={v.cpT?.cpCatNamePh} maxLength={24} autoComplete="off" style={{ ...field, background: "rgba(255,255,255,.88)" }} />
                </label>
              )}
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
            /* the letter over the open envelope, its bottom in the pocket; sending tucks it in and shuts the flap */
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
              {/* who it goes to (once you have cat pals): a new cat pal at random — as before, the default — or one you have */}
              {v.cmpTo && !v.cmpBusy && !sealing ? (
                <div style={{ marginTop: "14px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "#8A8478" }}>{I(v.cmpTo.label)}</span>
                  <div role="radiogroup" aria-label={v.cmpTo.label} className="cp-tips">
                    {each(v.cmpTo.options, (o: any) => (
                      <span key={o.id || "random"} onClick={o.tap} role="radio" aria-checked={o.on} className="dc-hover-2"
                        style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: "7px", padding: o.photo ? "4px 12px 4px 4px" : "7px 12px", borderRadius: "999px", border: "1px solid " + (o.on ? INK : "#D9D5CC"), background: o.on ? "#fff" : "rgba(255,252,244,.6)", boxShadow: o.on ? "0 2px 6px rgba(34,48,74,.12)" : "none", cursor: "pointer", whiteSpace: "nowrap", transition: "border-color .15s ease, background .15s ease" }}>
                        {o.photo ? <img src={o.photo} alt="" style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", display: "block", border: "1.5px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,.15)" }} /> : <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: "1" }}>{o.flag}</span>}
                        <span style={{ fontWeight: o.on ? 700 : 500, fontSize: "13px", lineHeight: "16px", color: INK }}>{I(o.name)}</span>
                        {o.photo ? <span aria-hidden="true" style={{ fontSize: "12px", lineHeight: "1" }}>{o.flag}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="dc-hover-8" onClick={send} role="button" aria-busy={v.cmpBusy || sealing} style={{ ...cta, marginTop: "18px", width: "100%", background: v.cmpBusy || sealing ? "#FBF5EA" : "#22304A", boxShadow: v.cmpBusy || sealing ? "inset 0 0 0 1.5px #EADFCB" : "0 10px 22px rgba(34,48,74,.2)", cursor: v.cmpBusy || sealing ? "default" : "pointer", position: "relative", overflow: "hidden" }}>
                {v.cmpBusy ? <span className="cp-catrun" aria-hidden="true"><img src="./assets/cat-run.gif" alt="" /></span> : null}
                <span style={{ ...ctaText, position: "relative", color: v.cmpBusy || sealing ? "#7A5A43" : "#fff" }}>{I(v.cmpBusy ? (v.cmpRouteInvite ? T.cpInviting : v.cmpTo?.busyLabel || T.cpSending) : sealing ? T.cpSealing : v.cmpTo?.sendLabel || T.cpSend)}</span>
              </div>
              {!v.cmpBusy && !sealing ? (
                <div style={{ marginTop: "6px", display: "flex", gap: "6px", justifyContent: "center" }}>
                  <span onClick={v.cmpEditLetter} role="button" style={linkBtn}>{I(v.cpT?.cpEditLetter)}</span>
                  <span onClick={v.cmpEditCat} role="button" style={linkBtn}>{I(v.cmpMet ? T.cpEditMet : T.cpEditCat)}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {step === 4 && v.cmpLink ? (
            /* the link: to share (the device's share sheet: WhatsApp, Instagram DM, KakaoTalk…) or copy; not delivered yet */
            <>
              <span style={{ marginTop: "2px", fontWeight: 500, fontSize: "12.5px", lineHeight: "18px", color: v.cmpLink.opened ? "#2E7458" : "#8A6A4E", textAlign: "center" }}>{I(v.cmpLink.opened ? T.ivOpened : T.ivNotYet)}</span>
              <div style={{ marginTop: "12px", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", padding: "6px 6px 6px 14px", borderRadius: "14px", background: "rgba(255,252,244,.9)", boxShadow: "inset 0 0 0 1px #E5DCCB" }}>
                <input readOnly value={v.cmpLink.url} onFocus={(e) => e.currentTarget.select()} aria-label={T.ivCopy}
                  style={{ flex: "1", minWidth: "0", border: "none", outline: "none", background: "transparent", fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "12px", color: MUTED, textOverflow: "ellipsis" }} />
                <span onClick={v.cmpLink.copy} role="button" className="dc-hover-2" style={{ flex: "none", padding: "8px 12px", borderRadius: "10px", background: v.cmpLink.copied ? "rgba(46,116,88,.12)" : "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.1)", fontWeight: 700, fontSize: "12.5px", color: v.cmpLink.copied ? "#2E7458" : INK, cursor: "pointer", whiteSpace: "nowrap" }}>{I(v.cmpLink.copied ? T.ivCopied : T.ivCopy)}</span>
              </div>
              {v.cmpLink.canShare ? (
                <div className="dc-hover-8" onClick={v.cmpLink.share} role="button" style={{ ...cta, marginTop: "14px", width: "100%", background: "#22304A", boxShadow: "0 10px 22px rgba(34,48,74,.2)" }}><span style={ctaText}>{I(T.ivShare)}</span></div>
              ) : null}
              <span style={{ marginTop: "12px", fontWeight: 400, fontSize: "12px", lineHeight: "17px", color: "#7A8091", textAlign: "center", maxWidth: "320px" }}>{I(T.ivPublicNote)}</span>
              <div style={{ marginTop: "6px", display: "flex", gap: "6px", justifyContent: "center" }}>
                <span onClick={v.cmpLink.done} role="button" style={{ ...linkBtn, fontWeight: 700, color: INK }}>{I(T.ivDone)}</span>
                <span onClick={v.cmpLink.cancel} role="button" style={linkBtn}>{I(T.ivCancel)}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
