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

const INK = "#22304A", MUTED = "#5E6A80", LETTER = "#2F3B57";
const ENV = { closed: "./assets/onboarding-preview/envelope-closed.png", open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png",
  /** the open envelope (600 × 671): its flap folds at `fold`, the front pocket from `frontTop` for `frontH` (of its height) */
  ratio: 671 / 600, closedRatio: 369 / 600, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const ruled = (h: number) => `repeating-linear-gradient(to bottom, transparent 0 ${h - 1}px, rgba(47,59,87,.14) ${h - 1}px ${h}px)`;
const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** a letter as the Mailbox has it (received) */
export type MailItem = { key: string; name: string; flag: string; country: string; date: string; dateLong?: string; photo: string; stamp: string; pm: string; isNew: boolean; body?: string; open?: () => void };

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

/** the stack: swipe / drag the top envelope away and the next comes forward; tap it to open */
export function LetterDeck({ items, onOpen, t, lifted }: { items: MailItem[]; onOpen: (c: MailItem, el: HTMLElement) => void; t: Record<string, string>; lifted?: string | null }) {
  const n = items.length, W = 292;
  const [top, setTop] = useState(0);
  const front = useRef<HTMLDivElement>(null), d = useRef({ x0: 0, y0: 0, dx: 0, moved: 0, on: false, gone: false });
  useEffect(() => { if (top >= n) setTop(0); }, [n]);
  const next = (dir = 1) => {
    const el = front.current; if (!el || n < 2 || d.current.gone) return;
    d.current.gone = true;
    el.style.transition = "transform .34s cubic-bezier(.4,0,.6,1), opacity .34s ease";
    el.style.transform = `translate(${dir * 380}px, -20px) rotate(${dir * 16}deg)`; el.style.opacity = "0";
    setTimeout(() => { d.current.gone = false; setTop((x) => (x + 1) % n); }, 330);
  };
  const down = (e: React.PointerEvent) => { if (d.current.gone) return; d.current = { ...d.current, x0: e.clientX, y0: e.clientY, dx: 0, moved: 0, on: true }; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* gone */ } };
  const move = (e: React.PointerEvent) => {
    const s = d.current; if (!s.on || !front.current) return;
    s.dx = e.clientX - s.x0; s.moved = Math.max(s.moved, Math.abs(s.dx) + Math.abs(e.clientY - s.y0));
    if (n > 1) { front.current.style.transition = "none"; front.current.style.transform = `translate(${s.dx}px, ${Math.abs(s.dx) * -0.05}px) rotate(${s.dx / 22}deg)`; }
  };
  const up = () => {
    const s = d.current; if (!s.on) return; s.on = false;
    const el = front.current; if (!el) return;
    if (n > 1 && Math.abs(s.dx) > 70) { next(Math.sign(s.dx)); return; }
    el.style.transition = "transform .3s cubic-bezier(.2,.9,.3,1.2)"; el.style.transform = "";
    if (s.moved < 6) onOpen(items[top % n], el);
  };
  const shown = Array.from({ length: Math.min(n, 3) }, (_, k) => (top + k) % n);
  const tilt = (i: number) => [-2.2, 1.8, -1.2, 2.4][i % 4];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 6px" }}>
      <div style={{ position: "relative", width: W + "px", height: W * ENV.closedRatio + 34 + "px" }}>
        {shown.slice().reverse().map((i) => {
          const k = shown.indexOf(i), isFront = k === 0;
          return (
            <div key={items[i].key} ref={isFront ? front : undefined} onPointerDown={isFront ? down : undefined} onPointerMove={isFront ? move : undefined} onPointerUp={isFront ? up : undefined} onPointerCancel={isFront ? up : undefined}
              role={isFront ? "button" : undefined} aria-label={isFront ? items[i].flag + " " + items[i].country : undefined} tabIndex={isFront ? 0 : -1}
              onKeyDown={isFront ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(items[i], e.currentTarget); } else if (e.key === "ArrowRight") next(1); } : undefined}
              style={{ position: "absolute", left: "0", top: k * 13 + "px", zIndex: 10 - k, cursor: isFront ? "grab" : "default", touchAction: "pan-y", userSelect: "none", visibility: items[i].key === lifted ? "hidden" : undefined,
                transformOrigin: "50% 100%", transition: "transform .4s cubic-bezier(.2,.8,.2,1), opacity .4s ease", opacity: 1,
                ...(isFront ? {} : { transform: `scale(${1 - k * 0.045}) rotate(${tilt(i)}deg)`, filter: `brightness(${1 - k * 0.04})` }) }}>
              <div style={{ transform: isFront ? `rotate(${tilt(i) * 0.4}deg)` : "none" }}><EnvelopeCard c={items[i]} w={W} tap={isFront ? t.mbTap || "Tap" : undefined} /></div>
            </div>
          );
        })}
      </div>
      {n > 1 ? (
        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "10.5px", letterSpacing: ".14em", color: "#5E6670" }}>{I((t.mbOf || "{i} / {n}").replace("{i}", String((top % n) + 1)).replace("{n}", String(n)))}</span>
          <span style={{ width: "1px", height: "12px", background: "rgba(34,48,74,.2)" }} />
          <span onClick={() => next(1)} role="button" style={{ fontWeight: 500, fontSize: "12px", color: "#4C5562", cursor: "pointer" }}>{I(t.mbSwipe)}{" ›"}</span>
        </div>
      ) : null}
    </div>
  );
}

/** a letter, opened: from the envelope to the reading */
export function OpenLetter({ c, from, onClose, onWriteBack, t, sample, freshSheet = true }: {
  c: MailItem & { firstStamp?: boolean; newStampText?: string; writeBackLabel?: string }; from: DOMRect | null; onClose: () => void; onWriteBack: (() => void) | null; t: Record<string, string>; sample?: boolean;
  /** "Write back" goes on to a new sheet of paper (it slides up first); off: straight on (to the letters with them) */
  freshSheet?: boolean;
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
        <div className="ol-paper" style={{ position: "absolute", left: "50%", top: W * ENV.ratio * 0.4 + "px", width: W * 0.86 + "px", height: W * 0.54 + "px", marginLeft: -W * 0.43 + "px", background: "#FFFCF4", backgroundImage: ruled(16), backgroundPosition: "0 30px", borderRadius: "3px", boxShadow: "0 3px 10px rgba(60,40,20,.16)", zIndex: 1 }} />
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
            <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "10px", letterSpacing: ".2em", color: "#7A8091" }}>{I(t.mbFromLabel?.toUpperCase())}</span>
            <span style={{ marginTop: "2px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "24px", lineHeight: "28px", letterSpacing: "var(--ls-heading)", color: INK }}>{I(c.name)}</span>
            <span style={{ marginTop: "2px", fontWeight: 500, fontSize: "13px", color: MUTED }}><span style={{ marginRight: "5px" }}>{I(c.flag)}</span>{I(c.country)}</span>
          </div>
          {/* the cat */}
          <div className="ol-their-cat" style={{ margin: "16px auto 0", width: "220px", padding: "8px 8px 22px", background: "#fff", boxShadow: "0 4px 14px rgba(40,25,20,.18)", transform: "rotate(-2deg)" }}>
            {c.photo ? <img src={c.photo} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#F2EEE7" }} />}
          </div>
          {/* their words, on the letter: stamped and postmarked, dated */}
          <div className="ol-their" style={{ position: "relative", margin: "18px auto 0", maxWidth: "340px", padding: "18px 18px 14px", background: "#FFFCF4", borderRadius: "3px", boxShadow: "0 1px 2px rgba(60,40,20,.1), 0 14px 30px rgba(60,40,20,.12)", transform: "rotate(.6deg)" }}>
            <img src={c.stamp} alt="" style={{ position: "absolute", right: "12px", top: "-14px", width: "44px", transform: "rotate(5deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.22))" }} />
            {c.pm ? <img src={c.pm} alt="" style={{ position: "absolute", right: "34px", top: "-8px", width: "78px", mixBlendMode: "multiply", opacity: 0.8, transform: "rotate(-8deg)" }} /> : null}
            <p className="cp-letter" style={{ margin: "26px 0 0", fontSize: "18px", lineHeight: "27px", color: LETTER, backgroundImage: ruled(27), whiteSpace: "pre-wrap", overflowWrap: "anywhere", minHeight: "81px" }}>{I(c.body || "")}</p>
            <div style={{ marginTop: "10px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontWeight: 500, fontSize: "11.5px", color: MUTED }}>{I(c.dateLong || c.date)}</span>
              <span className="cp-letter-i" style={{ fontSize: "20px", color: "#7A8299" }}>{"— "}{I(c.name)}</span>
            </div>
          </div>
          {/* the first letter from a country: its stamp, now in your passport (said, not shouted) */}
          {c.firstStamp ? (
            <div className="ol-note" style={{ margin: "16px auto 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", animation: reading ? "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) .3s both" : "none", opacity: reading ? undefined : 0 }}>
              <img src={c.stamp} alt="" style={{ width: "22px", transform: "rotate(-4deg)" }} />
              <span style={{ fontWeight: 500, fontSize: "12.5px", color: "#4C5562" }}>{I(c.newStampText)}</span>
            </div>
          ) : null}
        </div>
        {/* write back: there when you've read it */}
        <div className="ol-cta" style={{ flex: "none", padding: "10px 22px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", background: "linear-gradient(rgba(246,243,236,0), rgba(246,243,236,.95) 30%)" }}>
          <div className="dc-hover-8" onClick={onWriteBack ? writeBack : undefined} role="button" aria-disabled={!onWriteBack}
            style={{ width: "100%", maxWidth: "340px", height: "54px", borderRadius: "27px", background: onWriteBack ? "#22304A" : "#C9BFB2", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: onWriteBack ? "pointer" : "default", boxShadow: onWriteBack ? "0 10px 22px rgba(34,48,74,.2)" : "none", transition: "transform .15s ease" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 18.5c1.2-3.6 4-6.4 9.5-6.6V8.5L20 13l-6 4.6v-3.3c-3.9 0-6.9 1.3-9.5 4.2z" /></svg>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff", whiteSpace: "nowrap" }}>{I(c.writeBackLabel)}</span>
          </div>
          {sample ? <span style={{ fontWeight: 500, fontSize: "11.5px", color: "#C9785D" }}>{I(onWriteBack ? t.mbSampleWrite : t.mbSampleReply)}</span> : null}
        </div>
        {/* the fresh sheet for your reply (hidden below until "Write back"): "Dear …," already at its top */}
        <div className="ol-fresh" aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "-24px", margin: "0 auto", width: "330px", maxWidth: "calc(100% - 36px)", height: "62%", transform: "translateY(115%)", background: "#FFFCF4", borderRadius: "3px",
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

/** CatPals: a friend, as the bundle of letters you've kept from them — thin sheets behind their envelope (as many as
 *  you've shared, up to a few), tied with string, their cat in a round frame beside it and the count on a kraft tag;
 *  beside it who and where and — when their letter is the last — a note that it's your turn */
export function PalBundle({ p, i, t }: { p: any; i: number; t: Record<string, string> }) {
  const sheets = Math.max(0, Math.min(3, (p.n || 1) - 1)), tilt = i % 2 ? 0.5 : -0.4;
  return (
    <div className="cp-mb-card" onClick={p.open || undefined} role={p.open ? "button" : undefined} aria-label={p.name + ", " + p.country}
      style={{ ...paper("#F8F1E2"), position: "relative", display: "flex", alignItems: "center", gap: "14px", padding: "14px 14px 14px 10px", borderRadius: "4px", cursor: p.open ? "pointer" : "default",
        boxShadow: "0 1px 1px rgba(60,40,20,.14), 0 8px 16px rgba(60,40,20,.08)", ["--r" as string]: tilt + "deg", animationDelay: i * 70 + "ms", overflow: "hidden" }}>
      {/* their country's postmark, as if stamped on this card */}
      <img src={p.pm} alt="" aria-hidden="true" style={{ position: "absolute", right: "-10px", top: "-6px", width: "92px", mixBlendMode: "multiply", opacity: 0.22, transform: "rotate(-12deg)", pointerEvents: "none" }} />
      {/* the bundle */}
      <div aria-hidden="true" style={{ position: "relative", flex: "none", width: "112px", height: "90px", marginRight: "6px" }}>
        {Array.from({ length: sheets }, (_, k) => (
          <span key={k} style={{ position: "absolute", left: 10 + k * 3 + "px", top: 4 + k * 2 + "px", width: "88px", height: "62px", background: "#FFFCF4", backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 8px, rgba(47,59,87,.1) 8px 9px)", borderRadius: "2px", boxShadow: "0 1px 2px rgba(60,40,20,.16)", transform: `rotate(${[-7, 5, -3][k]}deg)` }} />
        ))}
        <img src="./assets/onboarding-preview/envelope-closed.png" alt="" style={{ position: "absolute", left: "8px", top: "22px", width: "98px", transform: "rotate(-2deg)", filter: "drop-shadow(0 2px 3px rgba(60,30,20,.22))" }} />
        <img src={p.stampImg} alt="" style={{ position: "absolute", left: "82px", top: "26px", width: "18px", transform: "rotate(4deg)" }} />
        {/* the string, round the bundle both ways */}
        <span style={{ position: "absolute", left: "2px", right: "2px", top: "50px", height: "2px", background: "#A27A4E", borderRadius: "1px", transform: "rotate(-2deg)", boxShadow: "0 1px 0 rgba(0,0,0,.12)" }} />
        <span style={{ position: "absolute", left: "58px", top: "14px", bottom: "0", width: "2px", background: "#A27A4E", borderRadius: "1px", transform: "rotate(-2deg)", boxShadow: "1px 0 0 rgba(0,0,0,.12)" }} />
        {/* their cat, in a round frame tucked against the bundle */}
        <span style={{ position: "absolute", left: "-2px", top: "-2px", width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", background: "#F2EEE7", border: "2.5px solid #fff", boxShadow: "0 2px 6px rgba(40,25,20,.25)", boxSizing: "border-box" }}>
          {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
        </span>
        {/* how many, on a kraft tag hung from the string */}
        <span style={{ position: "absolute", left: "40px", top: "62px", padding: "2px 8px 3px 12px", background: "#D8BD90", borderRadius: "2px 7px 7px 2px", clipPath: "polygon(0 50%, 8px 0, 100% 0, 100% 100%, 8px 100%)", transform: "rotate(7deg)", boxShadow: "0 1px 2px rgba(60,40,20,.25)",
          fontFamily: "var(--font-hand)", fontWeight: 600, fontSize: "15px", lineHeight: "16px", color: "#5A3E22", whiteSpace: "nowrap" }}>{I(p.lettersLabel)}</span>
      </div>
      {/* who, where; whose turn (centred in the space beside the bundle) */}
      <div style={{ position: "relative", flex: "1", minWidth: "0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "3px" }}>
        <span style={{ maxWidth: "100%", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px", lineHeight: "21px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}</span>
        <span style={{ maxWidth: "100%", fontWeight: 500, fontSize: "12.5px", color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ marginRight: "5px" }}>{I(p.flag)}</span>{I(p.country)}</span>
        {p.yourTurn && p.writeBack ? (
          <span onClick={(e) => { e.stopPropagation(); p.writeBack(); }} role="button" style={{ marginTop: "2px", fontFamily: "var(--font-hand)", fontWeight: 600, fontSize: "18px", lineHeight: "20px", color: "var(--hand-ink)", cursor: "pointer" }}>{I(p.turnLabel || t.mbYourTurn)}</span>
        ) : p.yourTurn ? <span style={{ marginTop: "2px", fontFamily: "var(--font-hand)", fontWeight: 600, fontSize: "18px", lineHeight: "20px", color: "var(--hand-ink)" }}>{I(p.turnLabel || t.mbYourTurn)}</span> : null}
      </div>
    </div>
  );
}

/** Sent: a letter you sent, as the airmail envelope it went in — its striped edge, their cat's print, the address by
 *  hand, a rubber-stamped DELIVERED / READ, and the round SENT postmark in real ink, dated. They lie a little on top of
 *  each other, as letters kept in a box. */
export function SentEnvelope({ c, i, t, isNew }: { c: any; i: number; t: Record<string, string>; isNew?: boolean }) {
  // read (green), delivered (blue-grey); a letter sent as a link isn't delivered yet: shared, or opened (in brick ink)
  const read = c.status === "read", ink = read ? "#2E7458" : c.invite ? "#A05245" : "#4A6A9A";
  return (
    <div className="cp-mb-card dc-hover-2" onClick={c.open || undefined} role={c.open ? "button" : undefined} aria-label={c.name + ", " + c.country + ", " + c.statusLabel}
      style={{ position: "relative", marginTop: i ? "-10px" : "0", zIndex: i + 1, padding: "5px", borderRadius: "5px", cursor: c.open ? "pointer" : "default",
        background: "repeating-linear-gradient(-45deg, #D9554A 0 9px, #F7F1E4 9px 14px, #4C6FA5 14px 23px, #F7F1E4 23px 28px)",
        boxShadow: "0 1px 1px rgba(60,40,20,.16), 0 8px 18px rgba(60,40,20,.1)", ["--r" as string]: (i % 2 ? 0.7 : -0.6) + "deg", animationDelay: i * 70 + "ms" }}>
      {/* just sent: NEW, the first time it's seen here */}
      {isNew ? <span className="cp-pop-in" style={{ position: "absolute", left: "-6px", top: "-8px", zIndex: 3, padding: "2px 8px", borderRadius: "9px", background: "#E5483D", color: "#fff", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(229,72,61,.35)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "10px", letterSpacing: ".08em" }}>{I(t.mbNewTag || "NEW")}</span> : null}
      <div style={{ ...paper("#F7F1E4"), position: "relative", display: "flex", alignItems: "center", gap: "14px", padding: "12px 74px 12px 12px", borderRadius: "2px", minHeight: "70px" }}>
        {/* their cat, the print sent */}
        <span style={{ flex: "none", width: "52px", padding: "3px 3px 9px", background: "#fff", boxShadow: "0 2px 4px rgba(40,25,20,.22)", transform: `rotate(${i % 2 ? 3 : -4}deg)` }}>
          {c.photo ? <img src={c.photo} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} /> : <span style={{ display: "block", aspectRatio: "1 / 1", background: "#F2EEE7" }} />}
        </span>
        {/* the address, by hand, on its lines */}
        <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "9.5px", letterSpacing: ".16em", color: "#8A8478" }}>{I((t.mbToLabel || "To").toUpperCase())}</span>
          <span className="cp-letter-i" style={{ fontSize: "22px", lineHeight: "24px", color: LETTER, borderBottom: "1px solid rgba(47,59,87,.18)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(c.name)}</span>
          <span style={{ marginTop: "3px", fontWeight: 500, fontSize: "12px", lineHeight: "18px", color: MUTED, borderBottom: "1px solid rgba(47,59,87,.12)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ marginRight: "5px" }}>{I(c.flag)}</span>{I(c.country)}</span>
          {/* delivered / read: rubber-stamped */}
          <span style={{ marginTop: "7px", alignSelf: "flex-start", padding: "1px 6px", border: `1.5px solid ${ink}`, borderRadius: "3px", color: ink, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontWeight: 700, fontSize: "9.5px", letterSpacing: ".14em", textTransform: "uppercase", transform: "rotate(-4deg)", filter: "url(#cp-mb-ink)", opacity: 0.85 }}>{I(c.statusLabel)}{read ? " ✓" : ""}</span>
        </div>
        {/* the SENT postmark, inked, dated */}
        <div aria-hidden="true" style={{ position: "absolute", right: "10px", top: "50%", marginTop: "-29px", width: "58px", height: "58px", borderRadius: "50%", border: "2px solid rgba(62,90,150,.8)", boxShadow: "inset 0 0 0 3px #F7F1E4, inset 0 0 0 4.5px rgba(62,90,150,.6)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `rotate(${i % 2 ? 9 : -12}deg)`, color: "rgba(52,80,140,.92)", filter: "url(#cp-mb-ink)" }}>
          <span style={{ fontWeight: 700, fontSize: "11px", letterSpacing: ".14em", lineHeight: "12px" }}>{I(t.mbSentMark)}</span>
          {/* a day in two lines, as postmarks have it (the year apart): "2026." / "10. 22." — "Oct 22," / "2026" */}
          <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "8px", lineHeight: "10px", textAlign: "center", whiteSpace: "pre-line", maxWidth: "48px" }}>{I(String(c.date || "").replace(/^(\d{4}\.) /, "$1\n").replace(/, (\d{4})$/, ",\n$1"))}</span>
        </div>
      </div>
    </div>
  );
}
