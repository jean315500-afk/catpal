// THE TYPEWRITER — the letter, written on a sheet in a typewriter (the app's own picture of one, mint green, CATPAL on
// it). The sheet stands up out of its platen, under the paper bail, laid out the same way always: who it goes to at its
// top left, the cat's photo under that in the middle (as big before it's added as after), the words under the photo —
// a box of a few lines that scrolls inside itself as they grow, so the sheet and the machine never move or grow as you
// write. Each letter clacks (its key on the machine dips); a new line rings the bell. The words are a real text box
// (any keyboard, any language) — or tap the machine's own keys; the sound can be turned off (kept on this device).
// Reduced motion: the sheet and the keys keep still.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { setTypeMuted, typeBack, typeKey, typeMuted, typeReturn } from '../community/typeSound';
import { SHEET_BG } from '../community/grain';

const TYPE_INK = "#24221F";
/** typewriter type: Special Elite (Latin), Nanum Gothic Coding (Hangul, monospaced) */
export const TYPE_FONT = "'Special Elite', 'Nanum Gothic Coding', ui-monospace, Menlo, monospace";
const LINE = 21;
/** (compact) how much of the machine stays in view, from its top: the paper bail, the roller and a strip of its body */
const MACHINE_TOP = 0.37;
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


/** the sheet's own measures: the photo's share of its width, room round what's on it, the gap left over the roller */
export const SHEET = { photo: 0.38, padX: 20, padTop: 20, gap: 12, overRoller: 28 };
/** the width of the sheet for a machine `w` wide */
export const sheetWidth = (w: number) => Math.round(w * (TW.paper[1] - TW.paper[0]));

export default function TypewriterPaper({ v, w, photo, photoH, to, lines = 4, placeholder, compact = false, fit = 0, locked = false }: { v: Vals; w: number; /** (the photo first) nothing to write yet: the words and the keys wait */ locked?: boolean;
  /** the cat's photo (or the place for it), and the room kept for it — the same before it's added as after */ photo: ReactNode; photoH: number;
  /** who it goes to, at the top */ to?: ReactNode; /** how many lines of words show (more scroll inside) */ lines?: number; placeholder?: string;
  /** (a phone, its keyboard up) only the sheet and the machine's top — its roller — showing, the rest slid down out of the
   *  way; the sheet's bottom part (the words) no taller than `fit`, the room left over the keyboard */ compact?: boolean; fit?: number }) {
  const text: string = v.cmpText ?? "";
  const ta = useRef<HTMLTextAreaElement>(null);
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [muted, setMuted] = useState(typeMuted);
  // the key that dips (one of KEYS), for a moment after each stroke
  const [down, setDown] = useState(-1);
  const upT = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(upT.current), []);

  // the phone's keyboard up (over the page's bottom — on iPhones the page isn't made shorter for it): the words being
  // written, and the button under them, kept just above the keyboard (and not under the top either)
  const keepInView = () => {
    const el = ta.current, sc = el?.closest('[data-screen-label="Letter"]') as HTMLElement | null; if (!el || !sc) return;
    const vv = window.visualViewport, top = (vv ? vv.offsetTop : 0) + 60, bottom = vv ? vv.offsetTop + vv.height : innerHeight;
    const r = el.getBoundingClientRect(), want = r.bottom + 96;
    if (want > bottom) sc.scrollBy({ top: Math.min(want - bottom, r.top - top), behavior: still ? "auto" : "smooth" });
  };
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const on = () => { if (document.activeElement === ta.current) keepInView(); };
    vv.addEventListener("resize", on); return () => vv.removeEventListener("resize", on);
  }, []);
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
    // (the caret where it was, and kept in view inside the words' own box)
    requestAnimationFrame(() => { const t2 = ta.current; if (!t2) return; if (document.activeElement === t2) t2.setSelectionRange(caret, caret); else t2.scrollTop = t2.scrollHeight; });
  };
  const H = w * TW.ratio, paperW = sheetWidth(w);
  // the sheet's bottom goes round the platen, under the paper bail: what's on it stops a little over the bail
  const underBail = Math.round(H * (TW.paperBottom - TW.bail[0][2]));
  const bailClip = (r: number[]) => `inset(${r[2] * 100}% ${(1 - r[1]) * 100}% ${(1 - r[3]) * 100}% ${r[0] * 100}%)`;
  const typed = { display: "block", width: "100%", boxSizing: "border-box", padding: "0", margin: "0", fontFamily: TYPE_FONT, fontSize: "14px", lineHeight: LINE + "px", color: TYPE_INK, textShadow: "0 0 .6px rgba(42,46,56,.55)", textAlign: "left" } as const;
  // the sheet: always the same — who to, the photo's room, the words' box — whatever is (or isn't) on it yet
  const sheet = (
    <div style={{ flex: "none", boxSizing: "border-box", padding: `${SHEET.padTop}px ${SHEET.padX}px ${underBail + SHEET.overRoller}px`, ...SHEET_BG, boxShadow: "inset 0 0 26px rgba(90,75,55,.12)",
      // (its top-left corner cut off at a slant, as an old sheet's often is)
      clipPath: "polygon(0 14px, 16% 3px, 100% 0, 100% 100%, 0 100%)" }}>
      {/* who it goes to: at the top left, one line */}
      <div style={{ height: "21px", display: "flex", alignItems: "center", minWidth: "0" }}>{to}</div>
      {/* the photo: in the middle, its room kept as it is (adding or changing it moves nothing) */}
      <div style={{ marginTop: SHEET.gap + 4 + "px", height: photoH + "px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{photo}</div>
      {/* the words: under the photo, a few lines tall — more scroll inside */}
      <textarea ref={ta} id="cp-letter-text" disabled={locked} value={text} onChange={v.setCmpText} onKeyDown={onKeyDown} onInput={onInput} placeholder={placeholder ?? v.cpT?.cpMsgPh} maxLength={v.cmpTextMax}
        // the on-screen keyboard: once it's up, the words being written are brought into view above it
        onFocus={() => { setTimeout(keepInView, 320); }}
        className="cp-type-input" spellCheck={false}
        style={{ ...typed, marginTop: SHEET.gap + 2 + "px", height: lines * LINE + "px", border: "none", outline: "none", resize: "none", overflowY: "auto", overscrollBehavior: "contain", scrollbarWidth: "thin", caretColor: "#C0392B",
          // ruled, like letter paper: a fine line under each line of words — scrolling with them (local)
          backgroundColor: "transparent", backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${LINE - 1}px, rgba(47,59,87,.17) ${LINE - 1}px ${LINE}px)`, backgroundAttachment: "local" }} />
    </div>
  );
  return (
    <div style={{ position: "relative", flex: "none", width: w + "px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* the sheet, standing up out of the platen (put in: it comes up out of it) */}
      <div style={{ position: "relative", zIndex: 1, width: paperW + "px", marginLeft: Math.round(w * (TW.paper[0] + TW.paper[1] - 1)) + "px",
        animation: still ? "none" : "cp-tw-feed .9s cubic-bezier(.3,.8,.3,1) .2s backwards" }}>
        {/* (keyboard up, little room: the sheet's bottom part — the words — is what shows) */}
        <div style={{ position: "relative", maxHeight: compact && fit ? Math.max(150, fit) + "px" : "none", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
          {sheet}
        </div>
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
            <span key={i} aria-hidden="true" onPointerDown={(e) => { e.preventDefault(); if (!locked) tap(i); }}
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
