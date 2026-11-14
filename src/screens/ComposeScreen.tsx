// THE LETTER FROM HOME — one letter, finished step by step on the same sheet of paper:
//   1 a new letter: at the top, a question at a time rolling by (ideas to write about — only shown). A reply: their
//     letter in its envelope by the sheet's corner, to open again. Then your cat's photo (a polaroid taped on) and a
//     little story, written right on the letter (a fine serif, italic accents) — your own words: the ideas are only
//     shown — and a light "My cat / A cat I met": a cat you met needs no profile, only a photo and a story
//   2 (first letter only) who's this little one: the polaroid, the cat's name, a line about it, where it's sent from —
//     or, for a cat you met, the name you sign with; its button goes on to the random CatPal
//   3 the finished letter over the open red envelope, to read once more — to whom it goes (one cat lover, at random; not
//     posted anywhere); sending tucks it in, shuts the flap, stamps it, then goes to the map (loading while a cat pal is
//     found — or, with no one yet, try again / keep it)
//   4 sent as a link (from the Map): the sealed envelope, the link to share or copy (not delivered until the friend writes back)
// Sending goes on to the delivery globe (DeliveryMapScreen). State and steps live in CatPalLogic (openCompose…).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import TypewriterPaper, { SHEET, sheetWidth, TYPE_FONT } from './Typewriter';
import { ROOM_BG, SHEET_BG } from '../community/grain';
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
/** a modal's card: white (only the letters themselves are on paper) */
const modalBg = { backgroundColor: "#fff", boxShadow: "0 14px 40px rgba(34,48,74,.18)", borderRadius: "22px" } as const;
const paperBg = { ...SHEET_BG, boxShadow: "0 1px 2px rgba(60,40,20,.10), 0 14px 30px rgba(60,40,20,.13)", borderRadius: "3px" } as const;
/** fine ruled lines under the words, one per line of text */
const ruled = (h: number) => `repeating-linear-gradient(to bottom, transparent 0 ${h - 1}px, rgba(47,59,87,.14) ${h - 1}px ${h}px)`;

/** your cat's photo, taped on: or, before there is one, the place to add it */
function Polaroid({ v, w, caption, onPick, compact }: { v: Vals; w: number; caption?: string; onPick?: () => void; /** small, in the sheet's corner: "＋ Photo" */ compact?: boolean }) {
  const has = !!v.cmpPhoto;
  return (
    <div onClick={onPick} role={onPick ? "button" : undefined} aria-label={onPick ? (has ? v.cpT?.cpChangePhoto : v.cpT?.cpAddPhoto) : undefined}
      style={{ position: "relative", width: w + "px", background: "#fff", padding: compact ? "3px 3px 9px" : "7px 7px " + (caption != null ? "8px" : "22px"), boxShadow: "0 3px 10px rgba(40,25,20,.2)", transform: "rotate(2deg)", cursor: onPick ? "pointer" : "default", flex: "none" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-9px", width: "54px", height: "18px", transform: "translateX(-50%) rotate(-5deg)", background: "rgba(242,156,122,.55)", zIndex: 1 }} />
      {has ? (
        <img src={v.cmpPhoto} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1 / 1", boxSizing: "border-box", border: "2px dashed #C4B7A3", borderRadius: "3px", background: "rgba(255,250,240,.35)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {/* a plus, and what goes here */}
          <span aria-hidden="true" style={{ position: "relative", width: compact ? "18px" : "30px", height: compact ? "18px" : "30px" }}>
            <i style={{ position: "absolute", left: "0", right: "0", top: compact ? "8px" : "14px", height: "2px", borderRadius: "1px", background: "#9A9384" }} />
            <i style={{ position: "absolute", top: "0", bottom: "0", left: compact ? "8px" : "14px", width: "2px", borderRadius: "1px", background: "#9A9384" }} />
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: compact ? "12px" : "var(--fs-caption)", color: "#8A8273" }}>{I(compact ? v.cpT?.cpPhotoShort : v.cpT?.cpAddPhoto)}</span>
        </div>
      )}
      {caption != null ? <span className="cp-letter-i" style={{ display: "block", marginTop: "4px", textAlign: "center", fontSize: "22px", lineHeight: "26px", color: caption ? LETTER : "#C9BDAE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{caption || v.cpT?.cpCatNamePh}</span> : null}
      {onPick && has && !compact ? <span style={{ position: "absolute", right: "8px", bottom: "4px", fontWeight: 500, fontSize: "11px", color: MUTED }}>{I(v.cpT?.cpChangePhoto)}</span> : null}
    </div>
  );
}

/** what a cat is like: a few words to pick (for "a cat like mine") */
export function TraitChips({ t }: { t: any }) {
  return (
    <div role="group" aria-label={t.label} style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {each(t.items, (x: any) => (
        <span key={x.id} onClick={x.tap} role="checkbox" aria-checked={x.on} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); x.tap(); } }} className="dc-hover-2"
          style={{ padding: "6px 11px", borderRadius: "999px", border: "1px solid " + (x.on ? INK : "#D9D5CC"), background: x.on ? INK : "rgba(255,255,255,.8)", color: x.on ? "#fff" : INK, fontWeight: x.on ? 700 : 500, fontSize: "12.5px", lineHeight: "16px", cursor: "pointer", whiteSpace: "nowrap" }}>{I(x.label)}</span>
      ))}
    </div>
  );
}

/** who it goes to, typed on the sheet ("To. 🎲 A random CatPal" / their cat, their name) — with cat pals, tapped to
 *  change; a random one says, under it, that only one cat lover gets it */
export function ToLine({ v, onChange, note, extra }: { v: Vals; onChange?: () => void; note?: boolean; /** after the name (writing back: their letter) */ extra?: ReactNode }) {
  const to = v.cmpToLine; if (!to) return null;
  const tap = to.change && onChange ? onChange : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <div onClick={tap} role={tap ? "button" : undefined} tabIndex={tap ? 0 : undefined} aria-label={tap ? to.label + " " + to.name + " · " + to.change : undefined} className={tap ? "dc-hover-2" : undefined}
        onKeyDown={tap ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(); } } : undefined}
        style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: "0", cursor: tap ? "pointer" : "default", fontFamily: TYPE_FONT, color: LETTER }}>
        <span style={{ flex: "none", fontSize: "13px", lineHeight: "20px", color: SOFT }}>{I(to.label)}</span>
        {to.photo ? <img src={to.photo} alt="" draggable={false} style={{ flex: "none", width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 1.5px #fff, 0 1px 3px rgba(0,0,0,.2)" }} /> : null}
        <span style={{ minWidth: "0", fontSize: "15px", lineHeight: "21px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{to.flag ? <>{I(to.flag)}{" "}</> : null}{I(to.name)}</span>
        {extra}
        {tap ? <span style={{ flex: "none", marginLeft: "auto", padding: "1px 8px", borderRadius: "999px", border: "1px solid rgba(47,59,87,.25)", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "10.5px", lineHeight: "15px", color: MUTED }}>{I(to.change)}</span> : null}
      </div>
      {note && to.note ? <span style={{ fontWeight: 500, fontSize: "11.5px", lineHeight: "16px", color: SOFT }}>{I(to.note)}</span> : null}
    </div>
  );
}

/** (the preview) about how many lines the words take on the paper — up to three (the rest: tap it, to read and change) */
const previewRows = (text: string, w: number) => {
  const per = Math.max(10, Math.floor((w - 32) / 9.6));
  const n = text.split("\n").reduce((a, p) => a + Math.max(1, Math.ceil([...p].reduce((x, ch) => x + (ch.charCodeAt(0) > 0x2e80 ? 1.7 : 1), 0) / per)), 0);
  return Math.min(3, Math.max(1, n));
};

export function Paper({ v, w, edit, underPhoto }: { v: Vals; w: number; edit?: boolean; underPhoto?: ReactNode }) {
  const line = edit ? 27 : 23;
  return (
    <div className="cp-paper-sheet" style={{ ...paperBg, position: "relative", width: w + "px", maxWidth: "100%", boxSizing: "border-box", padding: edit ? "18px 18px 14px" : "14px 14px 12px", transform: "rotate(-1deg)" }}>
      <span className="cp-letter-i" style={{ display: "block", fontSize: edit ? "27px" : "22px", lineHeight: "30px", color: LETTER, ...(edit ? {} : { fontFamily: TYPE_FONT, fontStyle: "normal", fontSize: "16px" }) }}>{I(v.cpT?.cpDear)}</span>
      <div style={{ display: "flex", justifyContent: "center", margin: edit ? "14px 0 12px" : "10px 0 8px" }}>
        <Polaroid v={v} w={Math.round(w * (edit ? 0.56 : 0.58))} onPick={edit ? v.cmpPickPhoto : undefined} />
      </div>
      {/* (writing) right under the photo: whose cat it is */}
      {edit && underPhoto ? <div style={{ margin: "-2px 0 12px" }}>{underPhoto}</div> : null}
      {edit ? (
        <textarea id="cp-letter-text" value={v.cmpText ?? ""} onChange={v.setCmpText} placeholder={v.cpT?.cpMsgPh}
          // the on-screen keyboard: once it's up, the words being written are brought into view above it
          onFocus={(e) => { const el = e.currentTarget; setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 320); }} maxLength={v.cmpTextMax} rows={3} className="cp-letter cp-letter-input"
          style={{ display: "block", width: "100%", boxSizing: "border-box", border: "none", outline: "none", resize: "none", padding: "0 2px", margin: "0", background: "transparent", backgroundImage: ruled(line), backgroundAttachment: "local",
            fontSize: "18.5px", lineHeight: line + "px", color: LETTER, minHeight: line * 3 + "px" }} />
      ) : (
        <span className="cp-letter" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", height: line * previewRows(v.cmpText || "", w) + "px", padding: "0 2px", backgroundImage: ruled(line), fontFamily: TYPE_FONT, fontSize: "14px", lineHeight: line + "px", color: LETTER, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{I(v.cmpText)}</span>
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
  const sealT = useRef<number | undefined>(undefined);
  const step = v.cmpStep;
  useEffect(() => { setSealing(step === 4); setFly(false); setTheirs(false); }, [step]);
  // back here (from the map, or later from Home): sealed only if it still is (a link being made, or made)
  useEffect(() => { if (v.sCompose) setSealing(step === 4 || (step === 3 && !!v.cmpBusy)); }, [v.sCompose]);
  // not sent (an error, back on the preview): it opens again, to try again
  useEffect(() => { if (step === 3 && v.cmpErr && !v.cmpBusy) setSealing(false); }, [v.cmpErr, v.cmpBusy]);
  useEffect(() => () => clearTimeout(sealT.current), []);
  // the envelope, letter and all, sits in the middle of the room between the title and the button; as the letter goes
  // in, the whole of it rises by half the letter's height above the envelope, so the shut envelope ends up in the middle
  const letterEl = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  // "Send" tapped: first a word on how long it flies (the farther, the longer), then — "Send it" — sealed and away
  const [fly, setFly] = useState(false);
  // writing back: their letter, open again over yours (a tap on "See …'s letter")
  const [theirs, setTheirs] = useState(false);
  // who it goes to, being changed (tapped on the sheet's "To." line)
  const [toOpen, setToOpen] = useState(false);
  const [stampOpen, setStampOpen] = useState(false);
  useEffect(() => { if (step !== 3) setStampOpen(false); }, [step]);
  // the photo first: before there's one, the page is dimmed and the sheet's place for it shows big, in the middle of
  // the sheet; a photo picked, that place — the photo in it now — shrinks and goes to its spot at the sheet's top, the
  // dim lifting, and the words are there to write. (Once done it stays done, even if the photo is changed later.)
  const [gate, setGate] = useState<"on" | "fly" | "off">(() => (v.cmpPhoto ? "off" : "on"));
  const [gateBox, setGateBox] = useState<{ left: number; top: number; w: number; tilt: number; pad: number } | null>(null);
  const slotRef = useRef<HTMLSpanElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const pickFile = () => fileRef.current?.click();
  // where it shows big: the middle of the sheet (measured from the page)
  const placeBig = () => {
    const root = rootEl.current, sheet = document.getElementById("cp-letter-text")?.parentElement; if (!root || !sheet) return;
    const R0 = root.getBoundingClientRect(), r = sheet.getBoundingClientRect(), wBig = Math.round(Math.min(250, r.width * 0.86));
    setGateBox({ left: r.left - R0.left + r.width / 2 - wBig / 2, top: r.top - R0.top + r.height * 0.47 - (wBig + 40) / 2, w: wBig, tilt: -2, pad: 10 });
  };
  useLayoutEffect(() => {
    if (!v.sCompose || step !== 1 || gate !== "on") return;
    placeBig(); const t = setTimeout(placeBig, 950);   // (again once the sheet has come up out of the machine)
    addEventListener("resize", placeBig); return () => { clearTimeout(t); removeEventListener("resize", placeBig); };
  }, [v.sCompose, step, gate]);
  useEffect(() => { if (v.sCompose && step === 1 && !v.cmpPhoto) setGate("on"); }, [v.sCompose]);
  // a photo in: to its spot on the sheet (~0.42 s), then the words, ready (focused where there's no on-screen keyboard)
  useEffect(() => {
    if (!v.cmpPhoto || gate !== "on") return;
    const root = rootEl.current, slot = slotRef.current?.firstElementChild as HTMLElement | null;
    if (root && slot) {
      const R0 = root.getBoundingClientRect(), r = slot.getBoundingClientRect();
      // (the slot's own polaroid is tilted 2°: its box, untilted, is about the same)
      setGateBox({ left: r.left - R0.left + (r.width - slot.offsetWidth) / 2, top: r.top - R0.top + (r.height - slot.offsetHeight) / 2, w: slot.offsetWidth, tilt: 2, pad: 3 });
    }
    setGate("fly");
    const t = setTimeout(() => {
      setGate("off");
      if (matchMedia("(pointer: fine)").matches) document.getElementById("cp-letter-text")?.focus({ preventScroll: true });
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 440);
    return () => clearTimeout(t);
  }, [v.cmpPhoto]);
  // the photo, big: to look at, or change
  const [photoBig, setPhotoBig] = useState(false);
  useEffect(() => { if (!v.cmpPhoto || step !== 1) setPhotoBig(false); }, [v.cmpPhoto, step]);
  // the phone's keyboard: told by how much of the page can still be seen (not only by the words being in focus) — the
  // tallest it's been at this width, less what shows now (whether the phone shrinks the page for it or lays it over)
  const rootEl = useRef<HTMLDivElement>(null), tallest = useRef({ w: 0, h: 0 });
  // (kb: how much less shows than at its tallest — the keyboard is up; cover: how much of the page it lies over; vis:
  // how much shows)
  const [vp, setVp] = useState({ h: 0, kb: 0, cover: 0, vis: 0 });
  const [writingIn, setWritingIn] = useState(false);
  useEffect(() => {
    if (!v.sCompose) return;
    const vv = window.visualViewport;
    const m = () => {
      const t = tallest.current; if (Math.abs(innerWidth - t.w) > 40) { t.w = innerWidth; t.h = 0; }   // (turned round: measured again)
      t.h = Math.max(t.h, innerHeight);
      const vis = vv ? vv.height : innerHeight;
      setVp({ h: t.h, kb: Math.max(0, Math.round(t.h - vis)), cover: vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0, vis: Math.round(vis) });
    };
    m(); vv?.addEventListener("resize", m); vv?.addEventListener("scroll", m); addEventListener("resize", m);
    return () => { vv?.removeEventListener("resize", m); vv?.removeEventListener("scroll", m); removeEventListener("resize", m); };
  }, [v.sCompose]);
  useEffect(() => { if (!v.sCompose) setToOpen(false); }, [v.sCompose]);
  const flyGo = useRef<HTMLDivElement>(null);
  useEffect(() => { if (fly) flyGo.current?.focus(); }, [fly]);   // (Enter sends, Escape steps back)
  useLayoutEffect(() => { if (step === 3 && letterEl.current) setLift(Math.max(0, (letterEl.current.offsetHeight - (EH * ENV.frontTop + TUCK)) / 2)); }, [step, v.sCompose, v.cmpText, v.cmpPhoto]);
  // keyboard up (writing on a phone): the page back to its top — the sheet and the roller fill what shows
  const kbNow = step === 1 && writingIn && vp.kb > 120;
  useEffect(() => { if (kbNow) requestAnimationFrame(() => rootEl.current?.scrollTo({ top: 0 })); }, [kbNow]);
  if (!v.sCompose) return null;
  // sending: sealed first (~2.4 s: in, shut, stamped, postmarked), then off to the map, which shows the loading
  const send = () => { if (!v.cmpBusy && !sealing) sendNow(); };
  const sendNow = () => {
    setFly(false);
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
  // writing back: their letter, as a little envelope at the end of the "To." line — tapped, it opens again
  const theirEnv = re && (re.said || re.photo) ? (
    <span onClick={() => setTheirs(true)} role="button" tabIndex={0} aria-label={re.see} title={re.see} className="cp-their-env dc-hover-2"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTheirs(true); } }}
      style={{ position: "relative", flex: "none", width: "34px", cursor: "pointer", transform: "rotate(-6deg)" }}>
      <img src="./assets/onboarding-preview/envelope-closed.png" alt="" draggable={false} style={{ display: "block", width: "100%", filter: "drop-shadow(0 2px 3px rgba(60,30,30,.25))" }} />
      {re.stamp ? <img src={re.stamp} alt="" aria-hidden="true" style={{ position: "absolute", right: "3px", top: "3px", width: "8px" }} /> : null}
    </span>
  ) : null;
  // (a new letter: one line at the top — "Write your first letter", or "Write a letter" once one has gone)
  const first = !re && step === 1 && !!v.cmpFirst;
  const title = re && step === 1 ? re.title : first ? v.cmpTitle || T.cpFirstTitle : s3 ? s3.title : title0, sub = re && step === 1 ? re.sub : first || step === 3 ? "" : s3 ? s3.sub : sub0;
  const sealed = sealing || step === 4;
  // the typewriter: as big as the screen allows (past the page's side margins — its sheet, and the words on it, larger)
  // (a little smaller than the screen allows — about 13% — so the photo and the words are what's seen first)
  const twW = Math.round(Math.max(270, Math.min(340, ((typeof window !== "undefined" ? window.innerWidth : 375) - 6) * 0.87)));
  // the photo: about 38% of the sheet's width (its white frame and tape included); the words: five lines, six on a tall screen
  const photoW = Math.round(sheetWidth(twW) * SHEET.photo), photoH = photoW + 24;
  const twLines = typeof window !== "undefined" && window.innerHeight >= 780 ? 6 : 5;
  // writing on a phone, its keyboard up: the sheet and the roller only (the machine's keys slid down), the sheet as tall
  // as what's left over the keyboard allows — under the back button, over the Next button kept above the keyboard
  const kbUp = kbNow;
  const twH = (twW * 693) / 900, sheetFit = kbUp ? vp.vis - 62 - Math.round(twH * 0.125) - 104 : 0;
  return (
    <>
    <div ref={rootEl} data-screen-label="Letter"
      onFocus={(e) => { if ((e.target as HTMLElement).id === "cp-letter-text") setWritingIn(true); }} onBlur={(e) => { if ((e.target as HTMLElement).id === "cp-letter-text") setWritingIn(false); }}
      style={{ position: "absolute", inset: "0", ...ROOM_BG, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
      <div style={{ minHeight: "100%", boxSizing: "border-box", padding: "14px 24px 34px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* back */}
        <div style={{ alignSelf: "stretch", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div className="dc-hover-12" onClick={v.cmpBack} role="button" aria-label={v.cpT?.cpBack} style={{ position: "absolute", zIndex: 25, left: "-6px", top: "2px", width: "40px", height: "40px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: v.cmpBusy ? "default" : "pointer", opacity: v.cmpBusy ? 0.4 : 1 }}>
            <div style={{ width: "10px", height: "10px", borderLeft: "2px solid " + INK, borderBottom: "2px solid " + INK, transform: "rotate(45deg)", marginLeft: "4px" }} />
          </div>
        </div>

        <div key={step} style={{ flex: "1 0 auto", width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: step === 1 ? "center" : "flex-start", paddingBottom: step === 1 ? "28px" : "0", boxSizing: "border-box", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
          {/* (a new letter: no title — the typewriter says it) */}
          {first || step === 1 ? <h1 className="cp-sr">{I(title)}</h1> : <h1 className="cp-h2" style={{ margin: "10px 0 0", color: INK, textAlign: "center", textWrap: "balance" } as any}>{I(title)}</h1>}
          {sub && step !== 1 ? <p style={{ margin: "6px 0 0", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: MUTED, textAlign: "center", textWrap: "balance" } as any}>{I(sub)}</p> : null}

          {step === 1 ? (
            <>
              {/* (writing back: just your sheet, "Dear …," at its top) */}
              {/* one sheet, in the typewriter from the start: who it goes to at its top, the photo small in its corner
                  ("＋ Photo"; once in, tapped: big, to look at or change), the words under — in either order */}
              <div style={{ marginTop: v.cmpFirst ? "4px" : "20px", position: "relative", zIndex: 2, width: "100%", display: "flex", justifyContent: "center", animation: "cp-letterup .6s cubic-bezier(.2,.9,.3,1) both" }}>
                <TypewriterPaper v={v} w={twW} compact={kbUp} fit={sheetFit} to={<ToLine v={v} extra={theirEnv} />} lines={twLines} placeholder={T.cpMsgPhShort} photoH={photoH}
                  locked={gate !== "off" && !v.cmpPhoto}
                  photo={<span ref={slotRef} style={{ display: "block", visibility: gate === "off" ? "visible" : "hidden" }}><Polaroid v={v} w={photoW - 6} compact onPick={pickFile} /></span>} />

              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div style={{ marginTop: "22px" }}><Polaroid v={v} w={168} caption={v.cmpMet ? v.cmpPenName || undefined : v.cmpCatName} /></div>
              {/* not your cat? a cat you met (then you sign it, and there's no intro) */}
              {v.cmpMetCheck ? (
                <label className="dc-hover-2" style={{ position: "relative", marginTop: "20px", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", borderRadius: "14px", background: v.cmpMetCheck.on ? "#fff" : "rgba(255,255,255,.55)", boxShadow: "inset 0 0 0 1px " + (v.cmpMetCheck.on ? INK : "rgba(34,48,74,.14)"), cursor: "pointer", transition: "background .15s ease, box-shadow .15s ease" }}>
                  <input type="checkbox" checked={v.cmpMetCheck.on} onChange={v.cmpMetCheck.tap} style={{ position: "absolute", opacity: 0, width: "1px", height: "1px" }} />
                  <span aria-hidden="true" style={{ flex: "none", width: "20px", height: "20px", borderRadius: "6px", boxSizing: "border-box", border: v.cmpMetCheck.on ? "none" : "1.5px solid #B9B2A4", background: v.cmpMetCheck.on ? INK : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s ease" }}>
                    {v.cmpMetCheck.on ? <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 7.2 5.8 10 11 4.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                  </span>
                  <span style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", lineHeight: "19px", color: INK }}>{I(v.cmpMetCheck.label)}</span>
                    <span style={{ fontWeight: 400, fontSize: "12px", lineHeight: "16px", color: MUTED }}>{I(v.cmpMetCheck.sub)}</span>
                  </span>
                </label>
              ) : null}
              {v.cmpMet ? (
                <label style={{ marginTop: "16px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={label}>{I(T.cpPenName)}</span>
                  <input value={v.cmpPenName ?? ""} onChange={v.setCmpPen} placeholder={T.cpPenNamePh} maxLength={24} autoComplete="off" style={{ ...field, background: "rgba(255,255,255,.88)" }} />
                </label>
              ) : (
                <label style={{ marginTop: "16px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={label}>{I(v.cpT?.cpCatName)}</span>
                  <input value={v.cmpCatName ?? ""} onChange={v.setCmpCat} placeholder={v.cpT?.cpCatNamePh} maxLength={24} autoComplete="off" style={{ ...field, background: "rgba(255,255,255,.88)" }} />
                </label>
              )}
              {/* your own cat: a line or two about it (on its profile, for the CatPals it writes to) */}
              {!v.cmpMet ? (
                <label style={{ marginTop: "14px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={label}>{I(T.cpCatIntro)}</span>
                  <textarea value={v.cmpCatIntro ?? ""} onChange={v.setCmpIntro} placeholder={T.cpCatIntroPh} maxLength={120} rows={2}
                    style={{ ...field, height: "auto", minHeight: "64px", padding: "11px 14px", lineHeight: "21px", resize: "none", fontFamily: "inherit", background: "rgba(255,255,255,.88)" }} />
                </label>
              ) : null}
              {!v.cmpMet && v.catTraits ? (
                <div style={{ marginTop: "14px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={label}>{I(v.catTraits.label)}</span>
                  <TraitChips t={v.catTraits} />
                </div>
              ) : null}
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
            <div style={{ flex: "1", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0", zoom: 0.8 } as any}>
            <div className={"cp-seal" + (sealed ? " is-sealed" : "")} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
              transform: sealed ? `translateY(${-lift}px)` : "none", transition: "transform .85s cubic-bezier(.5,0,.3,1)" }}>
              {/* --seal-in: how much of the letter is left showing below the envelope's pocket once it's all the way in (clipped away) */}
              <div ref={letterEl} className="cp-seal-letter" onClick={!sealing && !v.cmpBusy ? v.cmpEditLetter : undefined} role={!sealing ? "button" : undefined} tabIndex={!sealing ? 0 : undefined} aria-label={!sealing ? T.cdEdit : undefined}
                onKeyDown={!sealing ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.cmpEditLetter?.(); } } : undefined}
                style={{ position: "relative", zIndex: 2, cursor: sealing ? "default" : "pointer", ["--seal-in" as string]: `${Math.round(24 + EH * ENV.frontH - TUCK)}px` }}><Paper v={v} w={LETTER_W} /></div>
              <div style={{ position: "relative", width: EW + "px", height: EH + "px", marginTop: -(EH * ENV.frontTop + TUCK) + "px" }}>
                <img src={ENV.open} alt="" draggable={false} className="cp-seal-back" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: 1, filter: "drop-shadow(0 18px 22px rgba(60,30,30,.18))" }} />
                <img src={ENV.front} alt="" draggable={false} style={{ position: "absolute", left: "0", top: ENV.frontTop * 100 + "%", width: "100%", height: ENV.frontH * 100 + "%", zIndex: 3 }} />
                {v.cmpStamps && !v.cmpBusy && !sealing ? (
                  <span onClick={() => (v.cmpStamps.locked ? v.plus?.openIt() : setStampOpen((o) => !o))} role="button" tabIndex={0} aria-label={v.cmpStamps.label} aria-expanded={stampOpen} title={v.cmpStamps.label} className="dc-hover-2"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (v.cmpStamps.locked) v.plus?.openIt(); else setStampOpen((o) => !o); } }}
                    style={{ position: "absolute", right: "7%", top: EH * (ENV.frontTop + ENV.frontH * 0.2) + "px", zIndex: 5, width: "32px", height: "42px", cursor: "pointer", transform: "rotate(5deg)" }}>
                    <img src={v.cmpStamp} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.28))" }} />
                  </span>
                ) : null}
                <img src={ENV.open} alt="" draggable={false} className="cp-seal-flap" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: 4, clipPath: `inset(0 0 ${(1 - ENV.fold) * 100}% 0)`, transformOrigin: `50% ${ENV.fold * 100}%` }} />
                {/* once it's shut: the stamp goes on, then the sending country's postmark over it */}
                <Postage v={v} top={EH * ENV.fold + 16} right={20} cls="cp-seal-post" />
              </div>
            </div>
            </div>
          ) : null}

          {v.cmpErr ? <span role="alert" style={{ marginTop: "14px", fontWeight: 500, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#D9442F", textAlign: "center" }}>{I(v.cmpErr)}</span> : null}

          {/* who it goes to, down by the button (not on the envelope): "To. 🌏 A random CatPal" — Change, beside it */}
          {step === 3 && v.cmpToLine && !sealing ? (
            <div style={{ marginTop: "8px", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", minHeight: "48px", padding: "4px 6px 4px 14px", borderRadius: "16px", background: "rgba(255,255,255,.7)", boxShadow: "inset 0 0 0 1px rgba(34,48,74,.08)" }}>
              <span style={{ flex: "none", fontFamily: TYPE_FONT, fontSize: "13px", color: MUTED }}>{I(v.cmpToLine.label)}</span>
              {v.cmpToLine.photo ? <img src={v.cmpToLine.photo} alt="" draggable={false} style={{ flex: "none", width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} /> : null}
              <span style={{ flex: "1", minWidth: "0", fontWeight: 700, fontSize: "14.5px", lineHeight: "20px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.cmpToLine.flag ? <>{I(v.cmpToLine.flag)}{" "}</> : null}{I(v.cmpToLine.name)}</span>
              {v.cmpToLine.change && v.cmpTo && !v.cmpBusy ? (
                <span onClick={() => setToOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setToOpen(true); } }} className="dc-hover-2"
                  style={{ flex: "none", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(34,48,74,.16)", display: "flex", alignItems: "center", fontWeight: 600, fontSize: "13px", color: INK, cursor: "pointer" }}>{I(v.cmpToLine.change)}</span>
              ) : null}
            </div>
          ) : null}
          {/* (the last step) how it'll be delivered, over the button — Plus: at once; known: about how long; random: varies */}
          {step === 3 && v.cmpDelivery && !sealing ? (
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: "13px", lineHeight: "18px", color: v.cmpDelivery.plus ? "#8A5A2B" : "#4C5562" }}>{I(v.cmpDelivery.text)}</span>
              {v.cmpDelivery.bird ? (
                <span onClick={v.cmpDelivery.bird.tap} role="switch" aria-checked={v.cmpDelivery.bird.on} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.cmpDelivery.bird.tap(); } }} className="dc-hover-2"
                  style={{ padding: "3px 10px", borderRadius: "999px", background: v.cmpDelivery.bird.on ? "#FFF1DC" : "#fff", boxShadow: "inset 0 0 0 1px " + (v.cmpDelivery.bird.on ? "#D9963F" : "rgba(34,48,74,.16)"), fontWeight: 600, fontSize: "12px", color: INK, cursor: "pointer" }}>{I(v.cmpDelivery.bird.label)}</span>
              ) : null}
            </div>
          ) : null}
          {/* (Plus) new letters left today — smaller still (replies don't count) */}
          {(step === 1 || step === 3) && v.cmpToLine?.quota && !(step === 3 && sealing) ? (
            <span style={{ marginTop: step === 3 ? "4px" : "16px", marginBottom: step === 3 ? "-8px" : "-10px", textAlign: "center", fontWeight: 500, fontSize: "11.5px", lineHeight: "16px", color: v.cmpToLine.quotaOut ? "#D9442F" : "#8A93A3" }}>{I(v.cmpToLine.quota)}</span>
          ) : null}
          {/* the one thing to do on this step */}
          {step === 1 || step === 2 ? (
            <div className="dc-hover-8" onClick={v.cmpNext} role="button" aria-disabled={!v.cmpCanNext} style={{ ...cta, marginTop: step === 1 ? "24px" : "22px", width: "100%", flex: "none",
              ...(step === 1 ? { position: "sticky", bottom: vp.cover + 16 + "px", zIndex: 8 } : {}), background: v.cmpCanNext ? INK : "#DDD5C6", boxShadow: v.cmpCanNext ? cta.boxShadow : "inset 0 0 0 1px rgba(34,48,74,.10)" }}>
              {/* (not ready yet: the same button, the same place — only its colour, its words still easy to read) */}
              <span style={{ ...ctaText, color: v.cmpCanNext ? "#fff" : "#5C5547" }}>{I(v.cmpNextLabel || v.cpT?.cpContinue)}</span>
            </div>
          ) : null}
          {step === 3 ? (
            <>
              {/* the stamp it wears (tapped on the envelope): picked, with Plus */}
              {stampOpen && v.cmpStamps && !v.cmpBusy && !sealing ? (
                <div role="radiogroup" aria-label={v.cmpStamps.label} style={{ marginTop: "10px", width: "100%", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
                  {each(v.cmpStamps.items, (x: any, i: number) => (
                    <span key={i} onClick={() => { x.tap(); setStampOpen(false); }} role="radio" aria-checked={x.on} aria-label={v.cmpStamps.label + " " + (i + 1)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); x.tap(); setStampOpen(false); } }} className="dc-hover-2"
                      style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer" }}>
                      <span style={{ display: "block", width: "36px", height: "46px", borderRadius: "4px", boxSizing: "border-box", padding: "2px", boxShadow: x.on ? "0 0 0 2px " + INK : "none" }}>
                        <img src={x.src} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.2))" }} />
                      </span>
                      {x.state ? <span style={{ fontWeight: x.on ? 700 : 500, fontSize: "10px", lineHeight: "13px", color: x.on ? INK : MUTED }}>{I(x.state)}</span> : null}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="dc-hover-8" onClick={send} role="button" aria-busy={v.cmpBusy || sealing} style={{ ...cta, marginTop: "14px", width: "100%", background: v.cmpBusy || sealing ? "#FBF5EA" : "#22304A", boxShadow: v.cmpBusy || sealing ? "inset 0 0 0 1.5px #EADFCB" : "0 10px 22px rgba(34,48,74,.2)", cursor: v.cmpBusy || sealing ? "default" : "pointer", position: "relative", overflow: "hidden" }}>
                {v.cmpBusy ? <span className="cp-catrun" aria-hidden="true"><img src="./assets/cat-run.gif" alt="" /></span> : null}
                <span style={{ ...ctaText, position: "relative", color: v.cmpBusy || sealing ? "#7A5A43" : "#fff" }}>{I(v.cmpBusy ? (v.cmpRouteInvite ? T.cpInviting : v.cmpTo?.busyLabel || T.cpSending) : sealing ? T.cpSealing : v.cmpTo?.sendLabel || T.cpSend)}</span>
              </div>
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
    {/* (the letter's photo: straight from the files — cancelled, nothing changes; changed later, the words stay) */}
    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; v.cmpPhotoFile?.(f || null); }} />
    {/* the photo first: the page dimmed (taps go through it — the back button still works; the words and keys wait),
        the sheet's place for the photo big over it; picked, it goes to its spot as the dim lifts */}
    {step === 1 && gate !== "off" && !kbUp ? (
      <>
        <div aria-hidden="true" style={{ position: "absolute", inset: "0", zIndex: 20, background: "rgba(26,30,42,.48)", pointerEvents: "none", opacity: gate === "fly" ? 0 : 1, transition: "opacity .42s ease", animation: "cp-fade .3s ease" }} />
        {gateBox ? (
          <div onClick={gate === "on" ? pickFile : undefined} role="button" tabIndex={0} aria-label={T.cpAddYourPhoto}
            onKeyDown={(e) => { if (gate === "on" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pickFile(); } }}
            style={{ position: "absolute", zIndex: 21, left: gateBox.left + "px", top: gateBox.top + "px", width: gateBox.w + "px", boxSizing: "border-box", padding: `${gateBox.pad}px ${gateBox.pad}px ${gateBox.pad * 2.8}px`, background: "#fff",
              boxShadow: gate === "fly" ? "0 3px 10px rgba(40,25,20,.2)" : "0 16px 40px rgba(10,12,20,.35)", transform: `rotate(${gateBox.tilt}deg)`, cursor: gate === "on" ? "pointer" : "default",
              transition: "left .42s cubic-bezier(.2,.8,.2,1), top .42s cubic-bezier(.2,.8,.2,1), width .42s cubic-bezier(.2,.8,.2,1), padding .42s cubic-bezier(.2,.8,.2,1), transform .42s ease, box-shadow .42s ease", animation: gate === "on" ? "cp-fade .3s ease" : "none" }}>
            <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: -Math.round(gateBox.w * 0.05) + "px", width: Math.round(gateBox.w * 0.36) + "px", height: Math.round(gateBox.w * 0.1) + "px", transform: "translateX(-50%) rotate(-5deg)", background: "rgba(242,156,122,.6)", transition: "all .42s cubic-bezier(.2,.8,.2,1)" }} />
            {v.cmpPhoto ? (
              <img src={v.cmpPhoto} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "1 / 1", boxSizing: "border-box", border: "2px dashed #C4B7A3", borderRadius: "4px", background: "rgba(255,250,240,.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <span aria-hidden="true" style={{ position: "relative", width: "40px", height: "40px" }}>
                  <i style={{ position: "absolute", left: "0", right: "0", top: "19px", height: "2.5px", borderRadius: "2px", background: "#9A9384" }} />
                  <i style={{ position: "absolute", top: "0", bottom: "0", left: "19px", width: "2.5px", borderRadius: "2px", background: "#9A9384" }} />
                </span>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#7A7263", textAlign: "center", padding: "0 10px" }}>{I(T.cpAddYourPhoto)}</span>
              </div>
            )}
          </div>
        ) : null}
      </>
    ) : null}
    {/* the photo, big: to look at, or change */}
    {photoBig && v.cmpPhoto ? (
      <div onClick={() => setPhotoBig(false)} onKeyDown={(e) => { if (e.key === "Escape") setPhotoBig(false); }} style={{ position: "absolute", inset: "0", zIndex: 40, background: "rgba(34,48,74,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "cp-fade .2s ease" }}>
        <div role="dialog" aria-modal="true" aria-label={T.cpChangePhoto} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "22px", animation: "cp-pop .35s cubic-bezier(.34,1.56,.64,1) both" }}>
          <Polaroid v={v} w={Math.min(300, twW - 40)} />
          <div style={{ display: "flex", gap: "10px" }}>
            <span onClick={() => { setPhotoBig(false); v.cmpPickPhoto(); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhotoBig(false); v.cmpPickPhoto(); } }} className="dc-hover-8"
              style={{ height: "44px", padding: "0 18px", borderRadius: "22px", background: "#fff", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "14px", color: INK, cursor: "pointer" }}>{I(T.cpChangePhoto)}</span>
            <span onClick={() => setPhotoBig(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhotoBig(false); } }} className="dc-hover-8"
              style={{ height: "44px", padding: "0 22px", borderRadius: "22px", background: INK, display: "flex", alignItems: "center", fontWeight: 700, fontSize: "14px", color: "#fff", cursor: "pointer" }}>{I(T.cpToDone)}</span>
          </div>
        </div>
      </div>
    ) : null}
    {/* who it goes to: a random CatPal (as it starts), or one of your cat pals */}
    {toOpen && v.cmpTo ? (
      <div onClick={() => setToOpen(false)} onKeyDown={(e) => { if (e.key === "Escape") setToOpen(false); }} style={{ position: "absolute", inset: "0", zIndex: 40, background: "rgba(34,48,74,.32)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "cp-fade .2s ease" }}>
        <div role="dialog" aria-modal="true" aria-label={v.cmpTo.label} onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: "460px", maxHeight: "70%", overflowY: "auto", boxSizing: "border-box", padding: "10px 16px 26px", background: "#fff", borderRadius: "24px 24px 0 0", boxShadow: "0 -10px 30px rgba(34,48,74,.16)", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8", margin: "0 auto 12px" }} />
          <span style={{ display: "block", padding: "0 4px 8px", fontWeight: 700, fontSize: "16px", color: INK }}>{I(v.cmpTo.label)}</span>
          {/* (Plus) a country — anywhere, as it starts — and / or a cat like yours; without Plus, tapped: what Plus is */}
          <div style={{ padding: "2px 4px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "12.5px", color: MUTED }}>
              {I(v.cmpTo.pickLabel)}
              {v.cmpTo.locked ? <span style={{ padding: "1px 7px", borderRadius: "8px", background: INK, color: "#fff", fontWeight: 700, fontSize: "10px", lineHeight: "15px" }}>🔒 Plus</span> : null}
            </span>
            <label onClick={v.cmpTo.locked ? (e) => { e.preventDefault(); v.cmpTo.lockTap(); } : undefined} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 12px", height: "44px", borderRadius: "14px", border: "1px solid " + (v.cmpTo.country.value ? INK : "#D9D5CC"), background: "#fff", opacity: v.cmpTo.locked ? 0.6 : 1, cursor: "pointer" }}>
              <span style={{ flex: "none", fontWeight: 600, fontSize: "13px", color: MUTED }}>{I(v.cmpTo.country.label)}</span>
              <select value={v.cmpTo.country.value} onChange={v.cmpTo.country.set} disabled={v.cmpTo.locked} aria-label={v.cmpTo.country.label}
                style={{ flex: "1", minWidth: "0", height: "40px", border: "0", background: "transparent", fontFamily: "inherit", fontWeight: v.cmpTo.country.value ? 700 : 500, fontSize: "14px", color: INK, outline: "none", cursor: "pointer" }}>
                <option value="">🌏 {v.cmpTo.country.any}</option>
                {v.cmpTo.country.options.map((o: any) => <option key={o.cc} value={o.cc}>{o.label}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {each([{ id: "similar", icon: "🐾", ...v.cmpTo.similar }], (r: any) => (
                <span key={r.id} onClick={v.cmpTo.locked ? v.cmpTo.lockTap : r.tap} role="checkbox" aria-checked={!!r.on} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (v.cmpTo.locked ? v.cmpTo.lockTap : r.tap)(); } }} className="dc-hover-2"
                  style={{ padding: "7px 12px", borderRadius: "999px", border: "1px solid " + (r.on ? INK : "#D9D5CC"), background: r.on ? INK : "#fff", color: r.on ? "#fff" : INK, opacity: v.cmpTo.locked ? 0.6 : 1, fontWeight: r.on ? 700 : 500, fontSize: "13px", lineHeight: "16px", cursor: "pointer", whiteSpace: "nowrap" }}>{r.icon} {I(r.name)}</span>
              ))}
            </div>
            {v.cmpTo.similar.showTraits && v.catTraits ? (
              <div style={{ marginTop: "2px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontWeight: 500, fontSize: "12.5px", color: MUTED }}>{I(v.cmpTo.similar.hint)}</span>
                <TraitChips t={v.catTraits} />
              </div>
            ) : null}
            {!v.cmpTo.locked && (v.cmpTo.similar.on || v.cmpTo.country.value) ? (
              <div onClick={() => setToOpen(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setToOpen(false); } }} className="dc-hover-8" style={{ marginTop: "4px", height: "44px", borderRadius: "22px", background: INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>{I(T.cpToDone)}</span>
              </div>
            ) : null}
          </div>
          {v.cmpTo.palsLabel ? <span style={{ display: "block", padding: "0 4px 6px", fontWeight: 600, fontSize: "12.5px", color: MUTED }}>{I(v.cmpTo.palsLabel)}</span> : null}
          <div role="radiogroup" aria-label={v.cmpTo.label} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {each(v.cmpTo.options, (o: any) => (
              <div key={o.id || "random"} onClick={() => { o.tap(); setToOpen(false); }} role="radio" aria-checked={o.on} tabIndex={0} className="dc-hover-2"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.tap(); setToOpen(false); } }}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", background: o.on ? "#F4F1EA" : "transparent", boxShadow: o.on ? "inset 0 0 0 1.5px " + INK : "none", cursor: "pointer" }}>
                {o.photo ? <img src={o.photo} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                  : <span aria-hidden="true" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{o.flag}</span>}
                <span style={{ flex: "1", minWidth: "0", fontWeight: o.on ? 700 : 500, fontSize: "14.5px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(o.name)}{o.photo ? " " + o.flag : ""}</span>
                {o.on ? <span aria-hidden="true" style={{ flex: "none", fontWeight: 700, color: INK }}>✓</span> : null}
              </div>
            ))}
            {/* a friend, by link: once they accept, they're here to write to (and you in theirs) */}
            {v.cmpTo.invite ? (
              <div onClick={() => { setToOpen(false); v.cmpTo.invite.tap(); }} role="button" tabIndex={0} className="dc-hover-2"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setToOpen(false); v.cmpTo.invite.tap(); } }}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "16px", cursor: "pointer" }}>
                <span aria-hidden="true" style={{ flex: "none", width: "40px", height: "40px", borderRadius: "50%", boxSizing: "border-box", border: "1.5px dashed #C9BFAE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: MUTED }}>＋</span>
                <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <b style={{ fontWeight: 700, fontSize: "14.5px", color: INK }}>{I(v.cmpTo.invite.label)}</b>
                  <span style={{ fontWeight: 500, fontSize: "12px", color: MUTED }}>{I(v.cmpTo.invite.sub)}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ) : null}
    {/* writing back: their letter again — who, from where, when, their cat, their words (yours stays as it was) */}
    {theirs && re ? (
      <div onClick={() => setTheirs(false)} onKeyDown={(e) => { if (e.key === "Escape") setTheirs(false); }} style={{ position: "absolute", inset: "0", zIndex: 40, background: "rgba(34,48,74,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: "22px", animation: "cp-fade .2s ease" }}>
        <div role="dialog" aria-modal="true" aria-label={re.see} onClick={(e) => e.stopPropagation()}
          style={{ ...modalBg, position: "relative", width: "100%", maxWidth: "350px", maxHeight: "calc(100% - 20px)", overflowY: "auto", boxSizing: "border-box", padding: "18px 18px 16px", display: "flex", flexDirection: "column", alignItems: "center", animation: "cp-rise2 .32s cubic-bezier(.2,.8,.2,1) both" }}>
          <span onClick={() => setTheirs(false)} role="button" tabIndex={0} aria-label={T.cpCloseTheirs} style={{ position: "absolute", right: "10px", top: "10px", width: "32px", height: "32px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "15px", color: MUTED }}>✕</span>
          <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: "20px", color: INK }}>{I(re.from)}</span>
          <span style={{ marginTop: "2px", fontWeight: 500, fontSize: "12px", color: MUTED }}>{I(re.flag)}{" "}{I(re.country)}{re.date ? " · " + re.date : ""}</span>
          {re.photo ? (
            <span style={{ marginTop: "14px", width: "60%", background: "#fff", padding: "6px 6px 16px", boxShadow: "0 4px 12px rgba(40,25,20,.18)", transform: "rotate(-2deg)" }}>
              <img src={re.photo} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
            </span>
          ) : null}
          {re.said ? (
            <div style={{ ...paperBg, marginTop: "14px", alignSelf: "stretch", padding: "14px 16px 12px", transform: "rotate(.4deg)" }}>
              <span style={{ display: "block", fontFamily: TYPE_FONT, fontSize: "14px", lineHeight: "22px", color: LETTER, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{I(re.said)}</span>
              <span style={{ display: "block", marginTop: "6px", textAlign: "right", fontFamily: TYPE_FONT, fontSize: "13px", color: SOFT }}>{"— "}{I(re.name)}</span>
            </div>
          ) : null}
          <div className="dc-hover-8" onClick={() => setTheirs(false)} role="button" style={{ ...cta, marginTop: "16px", width: "100%", background: INK }}>
            <span style={ctaText}>{I(T.cpBackToMine)}</span>
          </div>
        </div>
      </div>
    ) : null}
    {/* before it goes: a bird carries it — the farther, the longer, and it can't be opened till it lands */}
    {fly && v.cmpFly ? (
      <div onClick={() => setFly(false)} onKeyDown={(e) => { if (e.key === "Escape") setFly(false); }} style={{ position: "absolute", inset: "0", zIndex: 40, background: "rgba(34,48,74,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "cp-fade .2s ease" }}>
        <div role="dialog" aria-modal="true" aria-labelledby="cp-fly-t" onClick={(e) => e.stopPropagation()}
          style={{ ...modalBg, borderRadius: "24px", width: "100%", maxWidth: "340px", boxSizing: "border-box", padding: "22px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "cp-rise2 .35s cubic-bezier(.2,.8,.2,1) both" }}>
          <img src="./assets/map/bird-letter-slow.webp" alt="" aria-hidden="true" style={{ width: "86px", transform: "scaleX(-1)" }} />
          <span id="cp-fly-t" style={{ marginTop: "6px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "26px", letterSpacing: "var(--ls-heading)", color: INK }}>{I(v.cmpFly.title)}</span>
          <span style={{ marginTop: "8px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#4C5562", textWrap: "pretty" } as any}>{I(v.cmpFly.body)}</span>
          <span style={{ marginTop: "12px", padding: "8px 14px", borderRadius: "14px", background: "#FFF1DC", fontWeight: 700, fontSize: "13px", lineHeight: "18px", color: "#8A5A2B" }}>{v.cmpFly.route ? I(v.cmpFly.route) : null}{v.cmpFly.route ? <br /> : null}{I(v.cmpFly.line)}</span>
          {/* (Plus) the Fast Bird, already on: delivered at once */}
          {v.cmpFly.fast && v.cmpFly.fast.applied ? (
            <div style={{ marginTop: "10px", alignSelf: "stretch", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "14px", textAlign: "left", background: "#FFF1DC", boxShadow: "inset 0 0 0 1.5px #D9963F" }}>
              <span aria-hidden="true" style={{ flex: "none", fontSize: "18px", lineHeight: "1", color: "#B8742A" }}>✦</span>
              <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
                <b style={{ fontWeight: 700, fontSize: "13.5px", lineHeight: "18px", color: INK }}>{I(v.cmpFly.fast.name)}</b>
                <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: MUTED }}>{I(v.cmpFly.fast.sub)}</span>
              </span>
              <span aria-hidden="true" style={{ flex: "none", fontWeight: 700, fontSize: "14px", color: "#8A5A2B" }}>✓</span>
            </div>
          ) : null}
          {/* a fast bird (there at once; none left: the way to some) */}
          {v.cmpFly.fast && !v.cmpFly.fast.applied ? (
            <div onClick={v.cmpFly.fast.tap} role="switch" aria-checked={v.cmpFly.fast.on} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.cmpFly.fast.tap(); } }} className="dc-hover-2"
              style={{ marginTop: "10px", alignSelf: "stretch", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "14px", textAlign: "left", cursor: "pointer", background: v.cmpFly.fast.on ? "#FFF1DC" : "#F7F4EE", boxShadow: v.cmpFly.fast.on ? "inset 0 0 0 1.5px #D9963F" : "none" }}>
              <span aria-hidden="true" style={{ flex: "none", fontSize: "18px", lineHeight: "1" }}>⚡</span>
              <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
                <b style={{ fontWeight: 700, fontSize: "13.5px", lineHeight: "18px", color: INK }}>{I(v.cmpFly.fast.name)}</b>
                <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: MUTED }}>{I(v.cmpFly.fast.sub)}</span>
              </span>
              <span style={{ flex: "none", fontWeight: 700, fontSize: "11.5px", color: v.cmpFly.fast.on ? "#8A5A2B" : MUTED, whiteSpace: "nowrap" }}>{v.cmpFly.fast.on ? "✓ " : ""}{I(v.cmpFly.fast.left)}</span>
            </div>
          ) : null}
          <div ref={flyGo} tabIndex={0} className="dc-hover-8" onClick={sendNow} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sendNow(); } }} role="button" style={{ ...cta, marginTop: "18px", width: "100%", background: INK }}>
            <span style={ctaText}>{I(v.cmpFly.go)}</span>
          </div>
          <span onClick={() => setFly(false)} role="button" tabIndex={0} style={{ ...linkBtn, marginTop: "4px" }}>{I(v.cmpFly.back)}</span>
        </div>
      </div>
    ) : null}
    </>
  );
}
