// THE MAILBOX'S LETTERS — the received ones, as real envelopes, and opening one.
//   LetterDeck:  the envelopes in a little stack, each a touch askew; swipe (or drag) the top one aside and the next
//                comes forward; tap it to open. Each wears its country's stamp and postmark — who sent it stays a
//                surprise until it's opened — and a wax seal saying "Tap" (glowing softly while unread).
//   OpenLetter:  opening it, as by hand (GSAP): the envelope comes to the middle, its flap lifts back, the cat's photo
//                and then the letter rise out of it and fan apart, and the letter comes forward to be read.
//   Reading:     who it's from (the cat, the country), the photo, their words, the stamp and postmark, the date — and,
//                once you've read it, "Write back to …". The first letter ever opened from a country says, quietly, that
//                its stamp is now in your passport.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { I } from '../dc/runtime';
import { SHEET_BG, sheetWith } from '../community/grain';

const INK = "#22304A", MUTED = "#5E6A80", LETTER = "#2F3B57";
const ENV = { closed: "./assets/onboarding-preview/envelope-closed.png", open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png",
  /** the open envelope (600 × 671): its flap folds at `fold`, the front pocket from `frontTop` for `frontH` (of its height) */
  ratio: 671 / 600, closedRatio: 369 / 600, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const ruled = (h: number) => `repeating-linear-gradient(to bottom, transparent 0 ${h - 1}px, rgba(47,59,87,.14) ${h - 1}px ${h}px)`;
const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** a letter as the Mailbox has it (received) */
export type MailItem = { key: string; name: string; flag: string; country: string; date: string; dateLong?: string; photo: string; stamp: string; pm: string; isNew: boolean; body?: string; open?: () => void;
  /** still flying: it waits at the back of the stack, sealed, saying when it lands (`soon`) — not to be opened till then */
  inbound?: boolean; soon?: string };

/** the gold wax seal, a cat pressed into it (the app's own image), stuck where the flap closes; on the envelope in
 *  front, "Tap" is written under it by hand */
const WAX = "./assets/mailbox/wax-seal.webp";
function WaxSeal({ text, size }: { text?: string; size: number }) {
  return (
    <span style={{ position: "relative", display: "block", width: size + "px", height: size * 0.95 + "px" }}>
      <img src={WAX} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", filter: "drop-shadow(0 2px 2px rgba(60,30,10,.35)) drop-shadow(0 6px 8px rgba(60,30,10,.18))" }} />
      {text ? <span style={{ position: "absolute", left: "50%", top: "100%", marginTop: "2px", transform: "translateX(-50%) rotate(-4deg)", fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: "22px", lineHeight: "22px", color: "#FFF6E4", textShadow: "0 1px 2px rgba(90,20,20,.45)", whiteSpace: "nowrap", pointerEvents: "none" }}>{text}</span> : null}
    </span>
  );
}

/** a closed envelope: its country's stamp (and that country's postmark over it), sealed — who it's from is a surprise
 *  until it's opened */
export function EnvelopeCard({ c, w, tap }: { c: MailItem; w: number; tap?: string }) {
  const h = w * ENV.closedRatio;
  return (
    <div style={{ position: "relative", width: w + "px", height: h + "px" }}>
      <img src={ENV.closed} alt="" draggable={false} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", filter: "drop-shadow(0 10px 16px rgba(80,30,30,.18))" }} />
      {/* the stamp, and the postmark across it */}
      <img src={c.stamp} alt="" draggable={false} style={{ position: "absolute", right: w * 0.06 + "px", top: h * 0.1 + "px", width: w * 0.15 + "px", transform: "rotate(4deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))" }} />
      {c.pm ? <img src={c.pm} alt="" draggable={false} style={{ position: "absolute", right: w * 0.13 + "px", top: h * 0.12 + "px", width: w * 0.24 + "px", mixBlendMode: "multiply", opacity: 0.55, transform: "rotate(-9deg)" }} /> : null}
      {/* the wax seal at the flap's tip, "Tap" pressed into it (on the envelope in front); a soft glow while unread */}
      {tap ? <span className={c.isNew ? "cp-tap-seal" : undefined} style={{ position: "absolute", left: "50%", top: h * 0.43 + "px", transform: "translate(-50%, -50%)", borderRadius: "50%" }}><WaxSeal text={tap} size={Math.round(w * 0.26)} /></span>
        : c.isNew ? <span aria-label="new" style={{ position: "absolute", left: "50%", top: h * 0.43 + "px", transform: "translate(-50%, -50%)" }}><WaxSeal size={Math.round(w * 0.16)} /></span> : null}
    </div>
  );
}

/** a letter, opened: from the envelope to the reading */
export function OpenLetter({ c, from, onClose, onWriteBack, t, sample, freshSheet = true, mine = false }: {
  c: MailItem & { firstStamp?: boolean; newStampText?: string; writeBackLabel?: string; welcome?: { note: string; meet: string; go: () => void } | null; block?: { label: string; go: () => void } | null }; from: DOMRect | null; onClose: () => void; onWriteBack: (() => void) | null; t: Record<string, string>; sample?: boolean;
  /** "Write back" goes on to a new sheet of paper (it slides up first); off: straight on (to the letters with them) */
  freshSheet?: boolean;
  /** a letter of mine (Sent): who it went to; no writing back from it */
  mine?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [reading, setReading] = useState(false), [leaving, setLeaving] = useState(false);
  // "Write back": a fresh sheet slides up over their letter (which stays, tucked behind), then on to writing on it
  const writeBack = () => {
    if (!onWriteBack || leaving) return;
    if (reduceMotion() || !freshSheet) { onWriteBack(); return; }
    const el = root.current!, q = (s: string) => el.querySelector(s) as HTMLElement;
    setLeaving(true);
    gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: onWriteBack })
      .to([q(".ol-cta"), q(".ol-from"), q(".ol-note")].filter(Boolean), { autoAlpha: 0, duration: 0.2, ease: "power1.out" }, 0)
      .to(q(".ol-their-cat"), { y: -30, scale: 0.8, autoAlpha: 0, duration: 0.4 }, 0)
      .to(q(".ol-their"), { y: -150, scale: 0.95, rotation: -2.2, duration: 0.55 }, 0.05)
      .fromTo(q(".ol-fresh"), { yPercent: 115, rotation: 3 }, { yPercent: 0, rotation: -1, duration: 0.6 }, 0.15);
  };
  useLayoutEffect(() => {
    const el = root.current!;
    const q = (s: string) => el.querySelector(s) as HTMLElement;
    if (reduceMotion()) { gsap.set(q(".ol-rig"), { autoAlpha: 0 }); gsap.set(q(".ol-read"), { autoAlpha: 1 }); setReading(true); return; }
    // where the envelope was (in the overlay's own units: the app is scaled to the screen)
    const box = el.getBoundingClientRect(), k = box.width / el.offsetWidth || 1;
    const rig = q(".ol-rig"), W = rig.offsetWidth, H = W * ENV.ratio;
    const cx = el.offsetWidth / 2, cy = el.offsetHeight * 0.52;
    const fx = from ? (from.left + from.width / 2 - box.left) / k : cx, fy = from ? (from.top + from.height / 2 - box.top) / k : cy;
    const fs = from ? from.width / k / W : 0.8;
    const ctx = gsap.context(() => {
      gsap.set(rig, { x: fx - cx, y: fy - cy - H * 0.1, scale: fs, rotation: -2 });
      gsap.set(".ol-closed", { autoAlpha: 1 }); gsap.set([".ol-flap"], { rotationX: 180, transformPerspective: 900, transformOrigin: `50% ${ENV.fold * 100}%` });
      // both inside to begin with: their tops under the flap's fold, their bottoms above the envelope's
      gsap.set(".ol-photo", { y: H * 0.058, autoAlpha: 1 }); gsap.set(".ol-paper", { y: H * 0.02, autoAlpha: 1 });
      gsap.set(".ol-read", { autoAlpha: 0, scale: 0.86, y: 30 });
      gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => setReading(true) })
        .to(".ol-veil", { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0)
        // 1 · to the middle, a little larger
        .to(rig, { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.62 }, 0)
        // 2 · the flap lifts back
        .to(".ol-closed", { autoAlpha: 0, duration: 0.18, ease: "none" }, 0.6)
        // (over the front while it lifts; once it's past upright it's behind the letters, as a real flap is — so they
        // come out in front of it, never through it)
        .to(".ol-flap", { rotationX: 90, duration: 0.28, ease: "power2.in" }, 0.62)
        .set(".ol-flap", { zIndex: 0 })
        .to(".ol-flap", { rotationX: 0, duration: 0.32, ease: "power2.out" })
        // 3 · the photo, then the letter, rise out of it
        .to(".ol-photo", { y: -H * 0.5, rotation: -5, duration: 0.6, ease: "power3.out" }, 1.05)
        .to(".ol-paper", { y: -H * 0.34, rotation: 2, duration: 0.6, ease: "power3.out" }, 1.2)
        // 4 · they fan apart, the envelope sinks away
        .to(".ol-photo", { x: -W * 0.2, y: -H * 0.56, rotation: -9, duration: 0.5 }, 1.75)
        .to(".ol-paper", { x: W * 0.12, y: -H * 0.38, rotation: 4, duration: 0.5 }, 1.75)
        .to([".ol-back", ".ol-front", ".ol-flap"], { y: H * 0.5, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 1.85)
        // 5 · the letter comes forward to be read
        .to([".ol-photo", ".ol-paper"], { autoAlpha: 0, scale: 1.12, duration: 0.4, ease: "power2.in" }, 2.25)
        .to(".ol-read", { autoAlpha: 1, scale: 1, y: 0, duration: 0.55, ease: "power3.out" }, 2.3);
    }, el);
    return () => ctx.revert();
  }, []);
  // a new country's stamp: said quietly, once it's read
  const W = 250;
  return (
    <div ref={root} role="dialog" aria-label={c.name} style={{ position: "absolute", inset: "0", zIndex: 80, overflow: "hidden" }}>
      <div className="ol-veil" onClick={reading ? onClose : undefined} style={{ position: "absolute", inset: "0", background: "rgba(246,243,236,.93)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", opacity: 0, visibility: "hidden" }} />
      {/* the envelope, opening */}
      <div className="ol-rig" aria-hidden="true" style={{ position: "absolute", left: "50%", top: "52%", width: W + "px", height: W * ENV.ratio + "px", marginLeft: -W / 2 + "px", marginTop: -(W * ENV.ratio) / 2 + "px", pointerEvents: "none" }}>
        <img className="ol-back" src={ENV.open} alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", clipPath: `inset(${ENV.fold * 100}% 0 0 0)` }} />
        <div className="ol-photo" style={{ position: "absolute", left: "50%", top: W * ENV.ratio * 0.36 + "px", width: W * 0.52 + "px", marginLeft: -W * 0.26 + "px", padding: "5px 5px 14px", background: "#fff", boxShadow: "0 3px 10px rgba(40,25,20,.22)", zIndex: 2 }}>
          {c.photo ? <img src={c.photo} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#F2EEE7" }} />}
        </div>
        <div className="ol-paper" style={{ position: "absolute", left: "50%", top: W * ENV.ratio * 0.4 + "px", width: W * 0.86 + "px", height: W * 0.54 + "px", marginLeft: -W * 0.43 + "px", ...sheetWith(ruled(16)), backgroundPosition: "0 30px, 0 0, 0 0", borderRadius: "3px", boxShadow: "0 3px 10px rgba(60,40,20,.16)", zIndex: 1 }} />
        <img className="ol-front" src={ENV.front} alt="" style={{ position: "absolute", left: "0", top: ENV.frontTop * 100 + "%", width: "100%", height: ENV.frontH * 100 + "%", zIndex: 3 }} />
        <img className="ol-flap" src={ENV.open} alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", clipPath: `inset(0 0 ${(1 - ENV.fold) * 100}% 0)`, zIndex: 4, backfaceVisibility: "visible" }} />
        <img className="ol-closed" src={ENV.closed} alt="" style={{ position: "absolute", left: "0", top: ENV.fold * 100 + "%", width: "100%", zIndex: 5 }} />
      </div>

      {/* the letter, to read */}
      <div className="ol-read" style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", opacity: 0, visibility: "hidden" }}>
        <div style={{ flex: "1", minHeight: "0", overflowY: "auto", scrollbarWidth: "none", padding: "54px 22px 18px" }}>
          <div onClick={onClose} role="button" aria-label={t.mbClose} style={{ position: "absolute", left: "14px", top: "12px", width: "40px", height: "40px", borderRadius: "20px", background: "rgba(255,255,255,.85)", boxShadow: "0 2px 8px rgba(34,48,74,.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </div>
          {/* from: the cat, where */}
          <div className="ol-from" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "10px", letterSpacing: ".2em", color: "#7A8091" }}>{I((mine ? t.mbToLabel : t.mbFromLabel)?.toUpperCase())}</span>
            <span style={{ marginTop: "2px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "24px", lineHeight: "28px", letterSpacing: "var(--ls-heading)", color: INK }}>{I(c.name)}</span>
            <span style={{ marginTop: "2px", fontWeight: 500, fontSize: "13px", color: MUTED }}><span style={{ marginRight: "5px" }}>{I(c.flag)}</span>{I(c.country)}</span>
          </div>
          {/* the cat */}
          <div className="ol-their-cat" style={{ margin: "16px auto 0", width: "220px", padding: "8px 8px 22px", background: "#fff", boxShadow: "0 4px 14px rgba(40,25,20,.18)", transform: "rotate(-2deg)" }}>
            {c.photo ? <img src={c.photo} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#F2EEE7" }} />}
          </div>
          {/* their words, on the letter: stamped and postmarked, dated */}
          <div className="ol-their" style={{ position: "relative", margin: "18px auto 0", maxWidth: "340px", padding: "18px 18px 14px", ...SHEET_BG, borderRadius: "3px", boxShadow: "0 1px 2px rgba(60,40,20,.1), 0 14px 30px rgba(60,40,20,.12)", transform: "rotate(.6deg)" }}>
            <img src={c.stamp} alt="" style={{ position: "absolute", right: "12px", top: "-14px", width: "44px", transform: "rotate(5deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.22))" }} />
            {c.pm ? <img src={c.pm} alt="" style={{ position: "absolute", right: "34px", top: "-8px", width: "78px", mixBlendMode: "multiply", opacity: 0.8, transform: "rotate(-8deg)" }} /> : null}
            <p className="cp-letter" style={{ margin: "26px 0 0", fontSize: "18px", lineHeight: "27px", color: LETTER, backgroundImage: ruled(27), whiteSpace: "pre-wrap", overflowWrap: "anywhere", minHeight: "81px" }}>{I(c.body || "")}</p>
            <div style={{ marginTop: "10px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontWeight: 500, fontSize: "11.5px", color: MUTED }}>{I(c.dateLong || c.date)}</span>
              {mine ? <span /> : <span className="cp-letter-i" style={{ fontSize: "20px", color: "#7A8299" }}>{"— "}{I(c.name)}</span>}
            </div>
          </div>
          {/* Sophie & Tori's automatic welcome: said so, small but readable */}
          {c.welcome ? <span style={{ display: "block", margin: "12px auto 0", maxWidth: "340px", textAlign: "center", fontWeight: 500, fontSize: "12px", lineHeight: "17px", color: "#6B6F7A" }}>{I(c.welcome.note)}</span> : null}
          {/* the first letter from a country: its stamp, now in your passport (said, not shouted) */}
          {c.firstStamp ? (
            <div className="ol-note" style={{ margin: "16px auto 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", animation: reading ? "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .3s both" : "none", opacity: reading ? undefined : 0 }}>
              <img src={c.stamp} alt="" style={{ width: "22px", transform: "rotate(-4deg)" }} />
              <span style={{ fontWeight: 500, fontSize: "12.5px", color: "#4C5562" }}>{I(c.newStampText)}</span>
            </div>
          ) : null}
        </div>
        {/* write back: there when you've read it */}
        {mine ? null : <div className="ol-cta" style={{ flex: "none", padding: "10px 22px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", background: "linear-gradient(rgba(246,243,236,0), rgba(246,243,236,.95) 30%)" }}>
          <div className="dc-hover-8" onClick={onWriteBack ? writeBack : undefined} role="button" aria-disabled={!onWriteBack}
            style={{ width: "100%", maxWidth: "340px", height: "54px", borderRadius: "27px", background: onWriteBack ? "#22304A" : "#C9BFB2", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: onWriteBack ? "pointer" : "default", boxShadow: onWriteBack ? "0 10px 22px rgba(34,48,74,.2)" : "none", transition: "transform .15s ease" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 18.5c1.2-3.6 4-6.4 9.5-6.6V8.5L20 13l-6 4.6v-3.3c-3.9 0-6.9 1.3-9.5 4.2z" /></svg>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff", whiteSpace: "nowrap" }}>{I(c.writeBackLabel)}</span>
          </div>
          {/* after the welcome: on to a real CatPal (a letter written and sent only by you) */}
          {c.welcome ? (
            <div className="dc-hover-8" onClick={c.welcome.go} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.welcome!.go(); } }}
              style={{ width: "100%", maxWidth: "340px", height: "50px", borderRadius: "25px", background: "#fff", boxShadow: "inset 0 0 0 1.5px #22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--fs-button)", color: "#22304A" }}>🐾 {I(c.welcome.meet)}</span>
            </div>
          ) : null}
          {sample ? <span style={{ fontWeight: 500, fontSize: "11.5px", color: "#C9785D" }}>{I(onWriteBack ? t.mbSampleWrite : t.mbSampleReply)}</span> : null}
          {c.block && !sample ? <span onClick={c.block.go} role="button" style={{ marginTop: "2px", fontWeight: 500, fontSize: "11.5px", color: "#8E8A84", textDecoration: "underline", cursor: "pointer" }}>{I(c.block.label)}</span> : null}
        </div>}
        {/* the fresh sheet for your reply (hidden below until "Write back"): "Dear …," already at its top */}
        <div className="ol-fresh" aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "-24px", margin: "0 auto", width: "330px", maxWidth: "calc(100% - 36px)", height: "62%", transform: "translateY(115%)", ...SHEET_BG, borderRadius: "3px",
          boxShadow: "0 -2px 4px rgba(60,40,20,.06), 0 -18px 40px rgba(60,40,20,.14)", padding: "18px 18px 0", boxSizing: "border-box", pointerEvents: "none" }}>
          <span className="cp-letter-i" style={{ display: "block", fontSize: "27px", lineHeight: "30px", color: LETTER }}>{I((t.cpDearName || "Dear {name},").replace("{name}", c.name))}</span>
          <div style={{ margin: "14px auto 0", width: "56%", aspectRatio: "1 / 1", boxSizing: "border-box", border: "2px dashed #D9CDBB", borderRadius: "3px", background: "#FBF7F0" }} />
          <div style={{ marginTop: "12px", height: "81px", backgroundImage: ruled(27) }} />
        </div>
      </div>
    </div>
  );
}

/** the ink of rubber stamps on these pages: a little rough at the edges, patchy where it didn't press evenly */
export function InkDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="cp-mb-ink" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="1.4" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency=".06 .14" numOctaves="2" seed="9" result="b" />
        <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 2.0" result="m" />
        <feComposite in="d" in2="m" operator="in" />
      </filter>
    </svg>
  );
}

/** paper: a card-stock tone with the app's grain */
const paper = (tone: string) => ({ backgroundColor: tone, backgroundImage: "var(--mb-grain)", backgroundSize: "300px", backgroundBlendMode: "overlay" } as const);

/** a letter as it's kept in the Mailbox: received (sealed till read; read: a cream sheet and its photo), on its way
 *  (sealed, when it lands), or sent (what became of it); `at`: when it came (or went), to file it by month */
export type FileItem = MailItem & { inbound?: boolean; soon?: string; sent?: boolean; status?: string; statusLabel?: string; at?: string; invite?: boolean };
/** one bundle in the folder (Received, Sent): its index, its letters (newest first), and where you were in it */
export type FolderGroup = { id: string; label: string; count?: number; items: FileItem[]; empty?: JSX.Element | null; start?: number; onPlace?: (i: number) => void };

/** the folder: how much of each letter behind shows (a little less with depth); its front flap, and how much of the
 *  front letter shows over it; the index dividers — their tabs (44 high, to be tapped), the one in front standing a
 *  little lower than the one behind */
const BX = { gap: 40, fall: 0.955, flap: 64, show: 168, tab: 46, step: 18 };
/** each letter stands a touch differently in the folder (from its key: the same each time) */
const jitter = (key: string) => { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return { x: ((h & 255) / 255 - 0.5) * 6, r: (((h >> 8) & 255) / 255 - 0.5) * 1.4 }; };
const MONO = "ui-monospace,'SF Mono',Menlo,monospace";
/** how far up the k-th one behind stands (the gaps closing a little, as with distance) — for any k, a fraction too */
const rise = (k: number) => BX.gap * (1 - Math.pow(BX.fall, k)) / (1 - BX.fall);

/** one letter as it stands in the box. Read (or mine): a cream sheet, its cat photo under a line of who / where / when.
 *  Not read yet: its red envelope — the stamp, the seal, a small "New". On its way: an airmail envelope, sealed, with
 *  when it lands — nothing of it shows till then. */
function FileCard({ c, w, h, t }: { c: FileItem; w: number; h: number; t: Record<string, string> }) {
  const flying = !!c.inbound || (c.sent && c.status === "flying");
  const sealed = !c.sent && !c.inbound && c.isNew;
  const who = c.sent ? (t.mbToLabel || "To") + " " + c.name : c.name;
  const line = [who, c.country, c.date].filter(Boolean);
  // (one coming to you: when it lands, on a dashed tag — seen even from the back of the folder)
  const chip = c.inbound ? { text: c.soon || "", bg: "rgba(255,255,255,.7)", color: "#5E6A80" } : flying ? { text: "✈ " + (c.statusLabel || ""), bg: "#FFF1DC", color: "#8A5A2B" }
    : sealed ? { text: t.stNew || "New", bg: "#E5483D", color: "#fff" }
    : c.sent ? { text: c.statusLabel || "", bg: c.status === "read" ? "#E6EFE4" : "#EEF0F4", color: c.status === "read" ? "#3D6B4B" : "#4C5562" }
    : { text: "", bg: "", color: "" };
  const label = (onDark: boolean) => (
    <span style={{ position: "absolute", left: "10px", top: "8px", right: c.stamp ? "52px" : "10px", display: "flex", alignItems: "center", gap: "6px", minWidth: "0", height: "20px" }}>
      <span style={{ minWidth: "0", flex: "0 1 auto", padding: onDark ? "1px 7px" : "0", borderRadius: "4px", background: onDark ? "#FFFCF4" : "transparent", boxShadow: onDark ? "0 1px 2px rgba(60,20,20,.2)" : "none",
        fontSize: "11.5px", lineHeight: "18px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {I(c.flag)}{" "}<b style={{ fontWeight: 700 }}>{I(line[0] || "")}</b>{line.length > 1 ? <span style={{ color: "#6B7286" }}>{" · "}{I(line.slice(1).join(" · "))}</span> : null}
      </span>
      {chip.text ? <span style={{ flex: "none", padding: "0 7px", borderRadius: "999px", background: chip.bg, color: chip.color, fontWeight: 700, fontSize: c.inbound ? "11px" : "10px", lineHeight: "17px", whiteSpace: "nowrap", boxShadow: c.inbound ? "inset 0 0 0 1px rgba(34,48,74,.28)" : "none" }}>{c.inbound ? "✈ " : ""}{I(chip.text)}</span> : null}
    </span>
  );
  const stamp = c.stamp ? (
    <>
      <img src={c.stamp} alt="" draggable={false} style={{ position: "absolute", right: "10px", top: "6px", width: "32px", transform: "rotate(4deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))" }} />
      {c.pm ? <img src={c.pm} alt="" draggable={false} style={{ position: "absolute", right: "18px", top: "12px", width: "54px", mixBlendMode: "multiply", opacity: 0.45, transform: "rotate(-9deg)" }} /> : null}
    </>
  ) : null;
  const edge = "inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1px rgba(110,80,45,.16), 0 -1px 3px rgba(50,30,10,.10), 0 8px 18px rgba(50,30,10,.20)";
  if (c.inbound) {
    // (Received) one still on its way to you: only the outline of an envelope, dashed and see-through — not here yet,
    // nothing to open — where it's from and when it lands along its top, its bird faint in the middle
    return (
      <div style={{ position: "relative", width: w + "px", height: h + "px", borderRadius: "6px", boxSizing: "border-box", background: "rgba(255,252,244,.5)", border: "2px dashed rgba(34,48,74,.32)", backdropFilter: "blur(2px)" }}>
        <svg aria-hidden="true" width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: "absolute", inset: "0" }}>
          <path d={`M 4 4 L ${w / 2} ${h * 0.46} L ${w - 4} 4`} fill="none" stroke="rgba(34,48,74,.25)" strokeWidth="1.5" strokeDasharray="6 6" />
        </svg>
        {label(false)}
        <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", left: "50%", top: "58%", width: Math.round(w * 0.18) + "px", transform: "translate(-50%, -50%) scaleX(-1)", opacity: 0.55 }} />
      </div>
    );
  }
  if (flying) {
    // an airmail envelope: the striped edge, a cream face; sealed (no photo, no words)
    return (
      <div style={{ position: "relative", width: w + "px", height: h + "px", borderRadius: "6px", overflow: "hidden", boxShadow: edge,
        background: "repeating-linear-gradient(135deg, #D8443A 0 9px, #FBF3E4 9px 16px, #3F6FB5 16px 25px, #FBF3E4 25px 32px)" }}>
        <span aria-hidden="true" style={{ position: "absolute", inset: "6px", borderRadius: "3px", ...sheetWith() }} />
        <span aria-hidden="true" style={{ position: "absolute", left: "6px", right: "6px", top: "6px", height: "46%", background: "rgba(140,110,70,.07)", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        {label(false)}{stamp}
        <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", left: "50%", top: "52%", width: Math.round(w * 0.2) + "px", transform: "translate(-50%,-50%) scaleX(-1)", opacity: 0.85 }} />
      </div>
    );
  }
  if (sealed) {
    // not read yet: its red envelope, the flap shut with wax
    return (
      <div style={{ position: "relative", width: w + "px", height: h + "px", borderRadius: "6px", overflow: "hidden", boxShadow: edge, background: "linear-gradient(180deg, #D4473C, #BF3A30)" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "0", height: "50%", background: "rgba(120,20,15,.18)", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: "0", ...sheetWith(), opacity: 0.16, mixBlendMode: "multiply" }} />
        {label(true)}{stamp}
        <span style={{ position: "absolute", left: "50%", top: h * 0.5 + "px", transform: "translate(-50%, -50%)" }}><WaxSeal size={Math.round(Math.min(w, h) * 0.2)} /></span>
      </div>
    );
  }
  // read (or mine): its red envelope too — as they stand together in the folder — the flap shut, no seal (opened
  // already), its stamp and postmark; who / where / when (and, mine, how it stands) along its top
  return (
    <div style={{ position: "relative", width: w + "px", height: h + "px", borderRadius: "6px", overflow: "hidden", boxShadow: edge, background: "linear-gradient(180deg, #D4473C, #BF3A30)" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "0", height: "50%", background: "rgba(120,20,15,.18)", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      <span aria-hidden="true" style={{ position: "absolute", inset: "0", ...sheetWith(), opacity: 0.16, mixBlendMode: "multiply" }} />
      {label(true)}{stamp}
    </div>
  );
}

/** one bundle's letters, standing in the folder in front of its divider, newest in front — each one's top showing over
 *  the one in front of it (not past the divider's top, so its index stays clear). Looked through (the wheel, a
 *  trackpad, an up / down swipe, the arrow keys) while it's the bundle in front: one number, where you are, eased after
 *  and settling on a whole letter (after a "tumble deck" showcase); while they move the letters fan apart a little and
 *  lean, as when you thumb through a file; the one in front tips forward and down into the folder, the rest step up.
 *  Tapped (not swiped), a letter comes up out of the folder and opens (onOpen); one on its way says how it stands
 *  (onWay); put back, it slips into its place (back). Reduced motion: a letter at a time, nothing eased. */
function Bundle({ g, active, stage, geo, t, onOpen, onWay, lifted, back }: {
  g: FolderGroup; active: boolean; stage: React.RefObject<HTMLDivElement>; geo: { cw: number; hc: number; frontTop: number; room: number };
  t: Record<string, string>; onOpen: (c: FileItem, el: HTMLElement) => void; onWay: (c: FileItem) => void; lifted?: string | null; back?: string | null;
}) {
  const items = g.items, n = items.length, still = reduceMotion();
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const clampL = (x: number) => Math.max(0, Math.min(Math.max(0, n - 1), x));
  const st = useRef({ pos: clampL(g.start || 0), target: clampL(g.start || 0), fan: 0, vel: 0 });
  const [front, setFront] = useState(Math.round(st.current.pos));
  const [up, setUp] = useState<string | null>(null);
  const dragged = useRef(false);
  const G = useRef(geo); G.current = geo;
  const on = useRef(active); on.current = active;
  const keys = items.map((c) => c.key);
  const jit = useRef<Record<string, { x: number; r: number }>>({});
  keys.forEach((k) => { if (!jit.current[k]) jit.current[k] = jitter(k); });

  const paint = () => {
    const s = st.current, g2 = G.current, spread = 1 + s.fan, lean = s.fan * 10;
    els.current.forEach((el, i) => {
      if (!el) return;
      const r = i - s.pos, j = jit.current[keys[i]] || { x: 0, r: 0 };
      let y = 0, rx = 0, sc = 1, o = 1, b = 1;
      if (r < 0) { const k = Math.min(1, -r); y = k * g2.hc * 0.9; rx = -k * 14; o = Math.max(0, 1 - k * 1.25); }
      else {
        const lift = rise(r) * spread;
        y = -lift; sc = 1 - Math.min(r, 8) * 0.02; rx = Math.min(r, 1.5) * (1.5 + lean); b = 1 - Math.min(r, 7) * 0.018;
        // (not up past the divider's top: its index stays clear)
        o = Math.max(0, Math.min(1, (g2.room - lift) / 14 + 0.25));
      }
      el.style.transform = `translate3d(${j.x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateX(${rx.toFixed(2)}deg) rotate(${j.r.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      el.style.opacity = String(o); el.style.visibility = o > 0.02 ? "visible" : "hidden";
      el.style.filter = b < 0.999 ? `brightness(${b.toFixed(3)})` : "";
      el.style.zIndex = String(2000 - Math.round(r * 10));
      // (only the bundle in front can be tapped)
      el.style.pointerEvents = on.current && o > 0.5 && r > -0.4 ? "auto" : "none";
    });
    const fr = Math.round(s.target); setFront((x) => (x === fr ? x : fr));
  };
  useLayoutEffect(paint);

  // (only the bundle in front) the wheel, a trackpad, a swipe, the keys move where it's going; it eases after
  useEffect(() => {
    const el = stage.current; if (!el || !n || !active) return;
    const s = st.current;
    let raf = 0, last = 0, idle = 0, acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.064, (now - last) / 1000) || 0.016; last = now;
      const before = s.pos;
      s.pos += (s.target - s.pos) * (1 - Math.exp(-dt * 8));
      s.vel = (s.pos - before) / dt;
      s.fan += (Math.min(0.32, Math.abs(s.vel) * 0.07) - s.fan) * (1 - Math.exp(-dt * 10));
      if (Math.abs(s.target - s.pos) < 0.002 && s.fan < 0.003) { s.pos = s.target; s.fan = 0; raf = 0; } else raf = requestAnimationFrame(tick);
      paint();
    };
    const run = () => { if (still) { s.pos = s.target; paint(); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const push = (to: number) => { const a = Math.round(s.pos); s.target = clampL(Math.max(a - 3, Math.min(a + 3, to))); run(); };
    const settle = (dir: number) => { push(dir > 0 ? Math.floor(s.target + 0.7) : dir < 0 ? Math.ceil(s.target - 0.7) : Math.round(s.target)); g.onPlace?.(Math.round(s.target)); };
    const step = (d: number) => { push(Math.round(s.target) + d); g.onPlace?.(Math.round(s.target)); };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1, d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * k;
      if (still) { acc += d; while (Math.abs(acc) >= 100) { const dir = Math.sign(acc); acc -= dir * 100; step(dir); } return; }
      push(s.target + d / 170);
      clearTimeout(idle); idle = window.setTimeout(() => settle(Math.sign(d)), 140);
    };
    let drag: { id: number; y: number; travel: number; lean: number } | null = null;
    const onDown = (e: PointerEvent) => { if (e.button !== 0 || (e.target as HTMLElement).closest?.("[role=tab]")) return; drag = { id: e.pointerId, y: e.clientY, travel: 0, lean: 0 }; dragged.current = false; clearTimeout(idle); };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = drag.y - e.clientY; drag.y = e.clientY; drag.travel += Math.abs(dy); if (dy) drag.lean = Math.sign(dy);
      if (drag.travel > 8 && !dragged.current) { dragged.current = true; try { el.setPointerCapture(e.pointerId); } catch { /* gone */ } }
      if (dragged.current && !still) push(s.target + dy / (BX.gap * 1.4));
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (dragged.current) { if (still) step(drag.lean || 0); else settle(drag.lean); }
      drag = null;
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); step(1); } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); } };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown); el.addEventListener("pointermove", onMove); el.addEventListener("pointerup", onUp); el.addEventListener("pointercancel", onUp); el.addEventListener("keydown", onKey);
    paint();
    return () => {
      cancelAnimationFrame(raf); clearTimeout(idle);
      el.removeEventListener("wheel", onWheel); el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onUp); el.removeEventListener("keydown", onKey);
    };
  }, [n, still, active]);

  const tap = (c: FileItem, el: HTMLElement) => {
    if (dragged.current) { dragged.current = false; return; }
    if (c.inbound || (c.sent && c.status === "flying")) { el.animate?.([{ transform: "none" }, { transform: "translateY(-8px)" }, { transform: "none" }], { duration: 320, easing: "ease-out" }); onWay(c); return; }
    if (still) { onOpen(c, el); return; }
    setUp(c.key);
    window.setTimeout(() => { onOpen(c, el); setUp(null); }, 260);
  };
  return (
    <>
      {items.map((c, i) => (
        <div key={c.key} ref={(el) => { els.current[i] = el; }}
          style={{ position: "absolute", left: "50%", top: geo.frontTop + "px", width: geo.cw + "px", marginLeft: -geo.cw / 2 + "px", transformOrigin: "50% 0", willChange: "transform, opacity" }}>
          <div role="option" aria-selected={active && i === front} tabIndex={-1}
            aria-label={[c.flag + " " + c.country, c.sent ? (t.mbToLabel || "To") + " " + c.name : c.name, c.date, c.inbound ? c.soon : c.sent ? c.statusLabel : c.isNew ? t.stNew : ""].filter(Boolean).join(" · ")}
            onClick={(e) => tap(c, e.currentTarget)}
            style={{ cursor: "pointer", visibility: c.key === lifted ? "hidden" : undefined,
              transform: c.key === up ? "translateY(-64px) scale(1.02)" : "none", transition: still ? "none" : "transform .26s cubic-bezier(.2,.8,.2,1)",
              animation: c.key === back && !still ? "cp-file-back .5s cubic-bezier(.2,.8,.2,1) both" : undefined }}>
            <FileCard c={c} w={geo.cw} h={geo.hc} t={t} />
          </div>
        </div>
      ))}
      {active && n > 1 ? <span aria-live="polite" style={{ position: "absolute", right: "16px", bottom: "12px", zIndex: 3100, fontFamily: MONO, fontSize: "10.5px", letterSpacing: ".12em", color: "#7C6A4E" }}>{front + 1}{" / "}{n}</span> : null}
    </>
  );
}

/** the Mailbox: a paper file folder on the page — two bundles of letters, Received and Sent, each behind its own index
 *  divider (Received: cream, its tab at the left; Sent: sage, its tab just beside it). The bundle you chose stands in
 *  front, its divider's tab a little lower; the other folds back behind it. The tabs stay where they are, always to be
 *  read and tapped; tapping one brings its bundle forward (the other one sinking back behind it). */
export function LetterArchive({ groups, active, onTab, t, onOpen, onWay, lifted, back }: {
  groups: FolderGroup[]; active: string; onTab: (id: string) => void; t: Record<string, string>;
  onOpen: (c: FileItem, el: HTMLElement) => void; onWay: (c: FileItem) => void; lifted?: string | null; back?: string | null;
}) {
  const root = useRef<HTMLDivElement>(null), still = reduceMotion();
  const [box, setBox] = useState({ w: 360, h: 540 });
  useLayoutEffect(() => {
    const el = root.current; if (!el) return;
    const m = () => { const top = el.getBoundingClientRect().top + (el.closest("[data-screen-label]")?.scrollTop || 0); setBox({ w: el.clientWidth, h: Math.round(Math.max(420, Math.min(660, window.innerHeight - top - 112))) }); };
    m(); const ro = new ResizeObserver(m); ro.observe(el); addEventListener("resize", m);
    return () => { ro.disconnect(); removeEventListener("resize", m); };
  }, []);
  // where things stand: the dividers' tops (the one behind higher), the letters under the front one's top, their
  // feet in the front flap
  const backTop = BX.tab, frontDiv = BX.tab + BX.step;
  const cw = Math.max(240, box.w - 40), hc = Math.round(Math.min(cw * 0.72, 260));
  const frontTop = box.h - BX.flap - Math.min(BX.show, hc - 20), room = frontTop - frontDiv - 8;
  const geo = { cw, hc, frontTop, room };
  // the index tabs side by side from the left: Received, then Sent just beside it
  const TABW = 148;
  const LOOK: Record<string, { paper: string; ink: string; left: number }> = {
    received: { paper: "#F5EAD2", ink: "#6B4E2E", left: 10 }, sent: { paper: "#CAD5BD", ink: "#3F5236", left: 10 + TABW + 6 } };
  const kraft = (tone: string) => ({ backgroundColor: tone, backgroundImage: "var(--mb-grain)", backgroundSize: "300px", backgroundBlendMode: "overlay" } as const);
  const ease = still ? "none" : "transform .45s cubic-bezier(.2,.8,.2,1), opacity .35s ease";
  return (
    <div ref={root} role="listbox" aria-label={t.mbCapRecv} tabIndex={0}
      style={{ position: "relative", height: box.h + "px", touchAction: "none", userSelect: "none", outline: "none", overflow: "hidden", borderRadius: "0 0 12px 12px", paddingBottom: "0" }}>
      {groups.map((g) => {
        const on = g.id === active, look = LOOK[g.id] || LOOK.received;
        return (
          <div key={g.id}>
            {/* its divider: a sheet of card stock across the folder, its index tab standing up at its side */}
            <div style={{ position: "absolute", left: "8px", right: "8px", top: "0", height: box.h - 8 + "px", zIndex: on ? 3 : 1, pointerEvents: "none",
              transform: `translateY(${on ? frontDiv : backTop}px)`, transition: still ? "none" : "transform .45s cubic-bezier(.2,.8,.2,1)" }}>
              <div role="tab" aria-selected={on} tabIndex={0} onClick={() => onTab(g.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTab(g.id); } }}
                style={{ position: "absolute", top: -BX.tab + "px", left: look.left + "px", height: BX.tab + 2 + "px", width: TABW + "px", padding: "0 14px", boxSizing: "border-box", borderRadius: "12px 12px 0 0", ...kraft(look.paper),
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", pointerEvents: "auto",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), 0 -2px 6px rgba(70,45,15,.10)" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: "20px", color: look.ink, whiteSpace: "nowrap" }}>{I(g.label)}</span>
                {g.count ? <span style={{ minWidth: "20px", height: "20px", padding: "0 6px", boxSizing: "border-box", borderRadius: "10px", background: "#E5483D", color: "#fff", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}>{I(g.count)}</span> : null}
              </div>
              <div aria-hidden="true" style={{ position: "absolute", inset: "0", borderRadius: "4px 4px 12px 12px", ...kraft(look.paper),
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 -2px 8px rgba(70,45,15,.10), 0 18px 36px rgba(70,45,15,.14)" }} />
            </div>
            {/* its letters: in front of its divider when it's the one in front; folded back behind, out of sight, when not */}
            <div aria-hidden={!on} style={{ position: "absolute", inset: "0", zIndex: on ? 4 : 2, overflow: "hidden", borderRadius: "0 0 12px 12px", perspective: "1000px", perspectiveOrigin: "50% 0%",
              pointerEvents: "none", opacity: on ? 1 : 0, transform: on ? "none" : "translateY(56px) scale(.95)", transformOrigin: "50% 100%",
              transition: ease, transitionDelay: on && !still ? ".1s" : "0s" }}>
              <Bundle g={g} active={on} stage={root} geo={geo} t={t} onOpen={onOpen} onWay={onWay} lifted={lifted} back={back} />
              {on && !g.items.length && g.empty ? <div style={{ position: "absolute", left: "0", right: "0", top: frontDiv + "px", bottom: BX.flap + "px", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>{g.empty}</div> : null}
            </div>
          </div>
        );
      })}
      {/* the folder's front flap, over the letters' feet */}
      <div aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: BX.flap + "px", zIndex: 5, pointerEvents: "none", borderRadius: "16px 16px 12px 12px", ...kraft("#E6D2A8"),
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.6), 0 -6px 14px rgba(70,45,15,.16), 0 10px 24px rgba(70,45,15,.14)" }} />
    </div>
  );
}
