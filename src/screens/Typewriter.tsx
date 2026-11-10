// THE TYPEWRITER — the letter, once its photo is on, written on a sheet in a typewriter (the app's own picture of one,
// mint green, CATPAL on it): the sheet stands up out of its platen, under the paper bail (who it goes to at its top, the
// photo small in its corner), "Dear …," and your words in typewriter type, the
// line being typed right on the bail, where it strikes (signed by your cat on the finished letter). Each letter clacks
// (its key on the machine dips, the sheet steps left a little); a new line rings the bell and sends it back. Only about half a sheet stands out: past that, its top is rolled back over (a roll of paper at
// the top edge; it rolls back as you type); tap the roll to unroll it and see the whole sheet, tap its top again to
// roll it back. The words are a real text box (any keyboard, any language) — or tap the machine's own keys; the
// sound can be turned off (kept on this device). Reduced motion: the sheet and the keys keep still.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { setTypeMuted, typeBack, typeKey, typeMuted, typeReturn } from '../community/typeSound';
import { SHEET_BG } from '../community/grain';

const TYPE_INK = "#24221F";
/** typewriter type: Special Elite (Latin), Nanum Gothic Coding (Hangul, monospaced) */
export const TYPE_FONT = "'Special Elite', 'Nanum Gothic Coding', ui-monospace, Menlo, monospace";
const LINE = 25;
/** (compact) how much of the machine stays in view, from its top: the paper bail, the roller and a strip of its body */
const MACHINE_TOP = 0.37;
/** how much of the sheet stands out of the machine: past this, its top is rolled back */
const SHOWN = 280;
/** the curl at the top: strips of paper (how many, how tall), bent back `turn`° in all — a little at first, then more
 *  and more (strip k by k + 1 parts of it), so the sheet goes over in one smooth curve, with no crease where it starts */
const CURL = { n: 22, h: 3, turn: 104 };
const CURL_STEP = (k: number) => (CURL.turn * (k + 1)) / ((CURL.n * (CURL.n + 1)) / 2);
/** what the curl takes, seen from the front: each strip's height as it shows, tilted (and a little more for the
 *  perspective) */
const ROLL = (() => {
  let turned = 0, high = 0;
  for (let k = 0; k < CURL.n; k++) { turned += CURL_STEP(k); high += Math.max(0, CURL.h * Math.cos((turned * Math.PI) / 180)); }
  return Math.ceil(high * 1.15);
})();
/** the machine (900 × 693), and where things are on it, as fractions of its width / height: the sheet's sides and its
 *  bottom (round the platen, just above the type guide); the paper bail and its two rollers (drawn again over the
 *  sheet: the sheet goes under them) */
const TW = { src: "./assets/compose/typewriter.webp", ratio: 693 / 900, paper: [0.135, 0.873], paperBottom: 0.245,
  bail: [[0.112, 0.896, 0.189, 0.202], [0.267, 0.317, 0.180, 0.208], [0.679, 0.730, 0.180, 0.208]] };
/** its keys, as drawn (centre x, y, width, height — fractions of the machine; what each types, and with shift):
 *  tapped, they type on the sheet; typed on a keyboard, the one for that letter dips */
type Key = { x: number; y: number; w: number; h: number; k: string; up?: string };
const row = (y: number, h: number, keys: [number, string, string?][], w = 0.048): Key[] => keys.map(([x, k, up]) => ({ x, y, w, h, k, up }));
const KEYS: Key[] = [
  ...row(0.558, 0.046, [[0.119, "'"], [0.182, "1", "!"], [0.245, "2", '"'], [0.307, "3", "#"], [0.371, "4", "$"], [0.433, "5", "%"], [0.497, "6", "_"], [0.561, "7", "&"], [0.623, "8", "("], [0.686, "9", ")"], [0.748, "0", "="], [0.813, ".", "*"], [0.878, "BACK"]]),
  ...row(0.631, 0.046, [[0.150, "q"], [0.216, "w"], [0.279, "e"], [0.343, "r"], [0.405, "t"], [0.467, "y"], [0.530, "u"], [0.593, "i"], [0.656, "o"], [0.719, "p"], [0.784, "[", "{"], [0.847, "]", "}"]]),
  ...row(0.704, 0.047, [[0.166, "a"], [0.231, "s"], [0.297, "d"], [0.361, "f"], [0.424, "g"], [0.486, "h"], [0.550, "j"], [0.615, "k"], [0.679, "l"], [0.744, ";", ":"], [0.812, '"', '"']]),
  { x: 0.884, y: 0.709, w: 0.06, h: 0.049, k: "RETURN" },
  { x: 0.109, y: 0.779, w: 0.069, h: 0.055, k: "SHIFT" },
  ...row(0.776, 0.047, [[0.192, "z"], [0.259, "x"], [0.326, "c"], [0.391, "v"], [0.455, "b"], [0.519, "n"], [0.585, "m"], [0.652, ",", "<"], [0.718, ".", ">"], [0.786, "/", "?"]]),
  { x: 0.878, y: 0.781, w: 0.083, h: 0.056, k: "SHIFT" },
  { x: 0.5, y: 0.866, w: 0.56, h: 0.05, k: " " },
];
/** the key for what was typed on a keyboard (a letter either case, a symbol on either face of its key) */
const keyFor = (e: { key: string }) => {
  const c = e.key === "Enter" ? "RETURN" : e.key === "Backspace" ? "BACK" : e.key.length === 1 ? e.key.toLowerCase() : "";
  return c ? KEYS.findIndex((x) => x.k === c || x.up === c) : -1;
};


export default function TypewriterPaper({ v, w, photo, underPhoto, to, compact = false, fit = 0 }: { v: Vals; w: number; photo: ReactNode; underPhoto?: ReactNode; /** who it goes to, at the top */ to?: ReactNode;
  /** (a phone, its keyboard up) only the sheet and the machine's top — its roller — showing, the rest slid down out of the
   *  way; the sheet no taller than `fit`, the room left over the keyboard */ compact?: boolean; fit?: number }) {
  const text: string = v.cmpText ?? "";
  const ta = useRef<HTMLTextAreaElement>(null), win = useRef<HTMLDivElement>(null);
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [muted, setMuted] = useState(typeMuted);
  // the key that dips (one of KEYS), for a moment after each stroke
  const [down, setDown] = useState(-1);
  const upT = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(upT.current), []);
  // the text box as tall as its words (so the sheet grows with them)
  useLayoutEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "0px"; el.style.height = Math.max(LINE * 2, el.scrollHeight) + "px";
  }, [text, w]);
  // the sheet's whole height; past SHOWN its top is rolled back (or, unrolled, all of it out)
  const sheetEl = useRef<HTMLDivElement>(null);
  // (a new sheet, nothing typed yet: all of it out, the photo in view; it rolls back as you start typing)
  const [full, setFull] = useState(0), [unrolled, setUnrolled] = useState(() => !(v.cmpText ?? "").trim());
  useLayoutEffect(() => {
    const el = sheetEl.current; if (!el) return;
    const m = () => setFull(Math.round(el.offsetHeight));
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, [text, w]);
  const shown = compact && fit ? Math.max(140, Math.min(SHOWN, fit)) : SHOWN;
  const over = Math.max(0, full - shown), rolled = over > 0 && !unrolled;

  // the phone's keyboard up (over the page's bottom — on iPhones the page isn't made shorter for it): the line being
  // typed, the signature and the carriage under it kept just above the keyboard (and not under the top either)
  const keepInView = () => {
    const el = ta.current, sc = el?.closest('[data-screen-label="Letter"]') as HTMLElement | null; if (!el || !sc) return;
    const vv = window.visualViewport, top = (vv ? vv.offsetTop : 0) + 60, bottom = vv ? vv.offsetTop + vv.height : innerHeight;
    const r = el.getBoundingClientRect(), want = r.bottom + 104;   // (the sheet's bottom, and the button kept over the page's foot)
    if (want > bottom) sc.scrollBy({ top: Math.min(want - bottom, r.top - top), behavior: still ? "auto" : "smooth" });
  };
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const on = () => { if (document.activeElement === ta.current) keepInView(); };
    vv.addEventListener("resize", on); return () => vv.removeEventListener("resize", on);
  }, []);
  // the carriage: a little to the left with each letter on the line, back on a new one
  const col = text.length - text.lastIndexOf("\n") - 1;
  const shift = still ? 0 : -Math.min(24, col * 0.8);
  // what was typed: a key (or a letter being composed), a new line, or one taken back — each its sound
  const dip = (i: number) => {
    if (still || i < 0) return;
    setDown(i); clearTimeout(upT.current); upT.current = window.setTimeout(() => setDown(-1), 110);
  };
  // typed on a keyboard: the key for it dips (a letter being composed — Hangul, say — has none: one at random)
  const keyed = useRef(false);
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { const i = keyFor(e); keyed.current = i >= 0; dip(i); };
  const onInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = (e.nativeEvent as InputEvent).inputType || "";
    if (t === "insertLineBreak" || t === "insertParagraph") typeReturn();
    else if (t.startsWith("delete")) typeBack();
    else typeKey();
    if (!keyed.current) dip(Math.floor(Math.random() * (KEYS.length - 1)));
    keyed.current = false;
    if (unrolled) setUnrolled(false);   // typing: the top rolls back (tap the roll to see it again)
    requestAnimationFrame(keepInView);
  };
  // the drawn keys, tapped: they type on the sheet where the caret is (shift: the next one in capitals / its upper
  // face), without the phone's own keyboard coming up
  const [shiftOn, setShiftOn] = useState(false);
  // (the words as they are now — taps can come quicker than the page is drawn again)
  const textNow = useRef(text);
  useLayoutEffect(() => { textNow.current = text; }, [text]);
  const tap = (i: number) => {
    const key = KEYS[i], el = ta.current, text = textNow.current; dip(i);
    if (key.k === "SHIFT") { setShiftOn((x) => !x); typeBack(); return; }
    const at = el && document.activeElement === el ? el.selectionStart : text.length, end = el && document.activeElement === el ? el.selectionEnd : text.length;
    let next = text, caret = at;
    if (key.k === "BACK") { if (at === end && at > 0) { next = text.slice(0, at - 1) + text.slice(end); caret = at - 1; } else { next = text.slice(0, at) + text.slice(end); } typeBack(); }
    else {
      const ch = key.k === "RETURN" ? "\n" : shiftOn ? key.up || key.k.toUpperCase() : key.k;
      if (text.length - (end - at) + ch.length > (v.cmpTextMax || 500)) return;
      next = text.slice(0, at) + ch + text.slice(end); caret = at + ch.length;
      if (key.k === "RETURN") typeReturn(); else typeKey();
      if (shiftOn) setShiftOn(false);
    }
    textNow.current = next;
    v.setCmpText({ target: { value: next } });
    // (not rolled back here: the machine would move up under the finger mid-word — the roll is a tap away)
    requestAnimationFrame(() => { const t2 = ta.current; if (t2 && document.activeElement === t2) t2.setSelectionRange(caret, caret); });
  };
  const H = w * TW.ratio, paperW = Math.round(w * (TW.paper[1] - TW.paper[0]));
  // the line being typed sits right on the paper bail — where a typewriter strikes (the sheet's bottom, below that,
  // is round the platen); the signature goes on the finished letter, not here
  const typeAt = Math.round(H * (TW.paperBottom - TW.bail[0][2])) + 2;
  // the curl, past half a sheet: the paper over the top bending back, away from you — thin strips of it, each bent a
  // little further back than the one below (past 90°, its back shows: plain paper), a little darker as it turns away —
  // still the same paper, all the way round
  const shade = (k: number) => `rgba(70,58,40,${Math.min(0.3, (k / CURL.n) ** 2 * 0.3).toFixed(3)})`;
  const curl = (k: number): ReactNode => k >= CURL.n ? null : (
    <div style={{ position: "absolute", left: "0", right: "0", bottom: k ? "100%" : "0", height: CURL.h + "px", transformOrigin: "50% 100%", transformStyle: "preserve-3d", transform: `rotateX(${CURL_STEP(k).toFixed(2)}deg)` }}>
      <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: CURL.h + 0.7 + "px", overflow: "hidden", backfaceVisibility: "hidden" }}>
        <div style={{ position: "absolute", left: "0", right: "0", top: -(over - (k + 1) * CURL.h - 0.7) + "px" }}>{sheet(true)}</div>
        <div style={{ position: "absolute", inset: "0", background: `linear-gradient(to top, ${shade(k)}, ${shade(k + 1)})` }} />
      </div>
      {/* its back: the sheet's plain back, in the same paper */}
      <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: CURL.h + 0.7 + "px", ...SHEET_BG, backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>
        <div style={{ position: "absolute", inset: "0", background: `linear-gradient(to bottom, ${shade(k)}, ${shade(k + 1)})`, boxShadow: "inset 0 0 0 100px rgba(70,58,40,.06)" }} />
      </div>
      {curl(k + 1)}
    </div>
  );
  const bailClip = (r: number[]) => `inset(${r[2] * 100}% ${(1 - r[1]) * 100}% ${(1 - r[3]) * 100}% ${r[0] * 100}%)`;
  const typed = { display: "block", width: "100%", boxSizing: "border-box", padding: "0", margin: "4px 0 0", fontFamily: TYPE_FONT, fontSize: "15.5px", lineHeight: LINE + "px", color: TYPE_INK, textShadow: "0 0 .6px rgba(42,46,56,.55)" } as const;
  // the sheet itself — and (copy) the same again, still, for what's glimpsed rolled up in the roll
  const sheet = (copy: boolean) => (
    <div ref={copy ? undefined : sheetEl} style={{ flex: "none", boxSizing: "border-box", padding: "16px 18px " + typeAt + "px", ...SHEET_BG, boxShadow: copy ? "none" : "inset 0 0 26px rgba(90,75,55,.12)",
      // (its top-left corner cut off at a slant, as an old sheet's often is — rolled back, its top is out of view anyway)
      clipPath: rolled || copy ? "none" : "polygon(0 26px, 16% 6px, 100% 0, 100% 100%, 0 100%)", paddingTop: "26px" }}>
      {/* who it goes to, across the top; "Dear …," with the photo small on the right; the words under both, all the width */}
      {to}
      <div style={{ marginTop: "8px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span style={{ flex: "1", minWidth: "0", marginTop: "14px", fontFamily: TYPE_FONT, fontSize: "15.5px", lineHeight: LINE + "px", color: TYPE_INK }}>{I(v.cpT?.cpDear)}</span>
        <div style={{ flex: "none" }}>{photo}</div>
      </div>
      {underPhoto ? <div style={{ margin: "8px 0 4px" }}>{underPhoto}</div> : null}
      {copy ? (
        <div style={{ ...typed, minHeight: LINE * 2 + "px", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{text + (text.endsWith("\n") ? "\u200b" : "")}</div>
      ) : (
        <textarea ref={ta} id="cp-letter-text" value={text} onChange={v.setCmpText} onKeyDown={onKeyDown} onInput={onInput} placeholder={v.cpT?.cpMsgPh} maxLength={v.cmpTextMax} rows={2}
          // the on-screen keyboard: once it's up, the words being written are brought into view above it
          onFocus={() => { setTimeout(keepInView, 320); }}
          className="cp-type-input" spellCheck={false}
          style={{ ...typed, border: "none", outline: "none", resize: "none", overflow: "hidden", background: "transparent", caretColor: "#C0392B" }} />
      )}
    </div>
  );
  return (
    <div style={{ position: "relative", flex: "none", width: w + "px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* the sheet: standing up out of the platen, a little to the left with each letter on the line; past half a sheet,
          its top rolled back (tap the roll: all of it out; tap its top: rolled back again) */}
      <div style={{ position: "relative", zIndex: 1, width: paperW + "px", marginLeft: Math.round(w * (TW.paper[0] + TW.paper[1] - 1)) + "px", marginTop: (rolled ? ROLL : 0) + "px",
        transform: `translateX(${shift}px)`, transition: (col === 0 ? "transform .42s cubic-bezier(.3,.8,.3,1)" : "transform .06s linear") + ", margin-top .4s ease",
        // (put in: it comes up out of the platen, rolled in)
        animation: still ? "none" : "cp-tw-feed .9s cubic-bezier(.3,.8,.3,1) .2s backwards" }}>
        <div ref={win} style={{ position: "relative", maxHeight: (rolled ? shown : Math.max(full, shown)) + "px", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", transition: still ? "none" : "max-height .5s cubic-bezier(.3,.8,.3,1)" }}>
          {sheet(false)}
        </div>
        {/* the roll: the paper rolled back over the top — round, lit from the front; tap it to unroll */}
        {over ? (
          rolled ? (
            <div onClick={() => setUnrolled(true)} role="button" aria-label={v.cpT?.cpUnroll} title={v.cpT?.cpUnroll} className="cp-tw-roll"
              style={{ position: "absolute", left: "0", right: "0", bottom: "100%", height: CURL.h + "px", cursor: "pointer", perspective: "520px", perspectiveOrigin: "50% 100%",
                animation: still ? "none" : "cp-tw-roll .45s cubic-bezier(.3,.8,.3,1) both" }}>
              {curl(0)}
              <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: -(ROLL + 6) + "px", transform: "translateX(-50%)", display: "flex", color: "rgba(60,55,40,.45)" }}>
                <svg width="12" height="12" viewBox="0 0 14 14"><path d="M2.5 5l4.5 4.5L11.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
          ) : (
            <span onClick={() => setUnrolled(false)} role="button" aria-label={v.cpT?.cpRollUp} title={v.cpT?.cpRollUp} className="dc-hover-2"
              style={{ position: "absolute", left: "50%", top: "4px", transform: "translateX(-50%)", zIndex: 2, width: "44px", height: "18px", borderRadius: "9px", background: "rgba(42,46,56,.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(42,46,56,.55)" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 9l4.5-4.5L11.5 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )
        ) : null}
      </div>
      {/* the machine, the sheet's bottom going into it; the paper bail and its rollers over the sheet — (compact) only its
          top, the roller, the rest slid down out of view */}
      <div style={{ position: "relative", width: w + "px", height: (compact ? Math.round(H * MACHINE_TOP) : H) + "px", marginTop: -Math.round(H * TW.paperBottom) + "px", overflow: "hidden", transition: still ? "none" : "height .35s cubic-bezier(.3,.8,.3,1)" }}>
      <div style={{ position: "relative", width: w + "px", height: H + "px" }}>
        <img src={TW.src} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" }} />
        {TW.bail.map((r, i) => <img key={i} src={TW.src} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: "0", zIndex: 2, width: "100%", height: "100%", clipPath: bailClip(r), pointerEvents: "none" }} />)}
        {/* the keys: tap one, it types (the one pressed dips; shift, while it's on, stays down) */}
        {KEYS.map((key, i) => {
          const isDown = down === i || (key.k === "SHIFT" && shiftOn);
          return (
            <span key={i} aria-hidden="true" onPointerDown={(e) => { e.preventDefault(); tap(i); }}
              style={{ position: "absolute", zIndex: 3, left: key.x * 100 + "%", top: key.y * 100 + "%", width: key.w * 100 + "%", height: key.h * 100 * 1.25 + "%", transform: "translate(-50%, -50%)", borderRadius: "40%", cursor: "pointer", touchAction: "manipulation",
                background: isDown ? "rgba(20,24,20,.26)" : "transparent", boxShadow: isDown ? "inset 0 2px 3px rgba(0,0,0,.32)" : "none" }} />
          );
        })}
        {/* the sound: on or off */}
        <button type="button" onClick={() => { const m = !muted; setTypeMuted(m); setMuted(m); if (!m) typeKey(); }} aria-pressed={!muted} aria-label={muted ? v.cpT?.cpTypeSoundOff : v.cpT?.cpTypeSoundOn}
          style={{ position: "absolute", zIndex: 3, right: "13%", top: "calc(47% - 13px)", width: "26px", height: "26px", borderRadius: "13px", border: "none", background: "rgba(255,255,250,.5)", boxShadow: "inset 0 0 0 1px rgba(90,115,92,.45)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#5F7660", padding: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            {muted ? <path d="m22 9-6 6M16 9l6 6" /> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
          </svg>
        </button>
      </div>
      </div>
    </div>
  );
}
