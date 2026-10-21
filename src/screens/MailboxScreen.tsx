// MAILBOX — a little box of letters from far away, in Home's look (the pastel sky, navy type, the red envelope):
// a little card file: index dividers of coloured card stock (Received / Sent / CatPals, each its own paper, with a
// hand-written note at the bottom); the chosen one comes to the front and turns like a page when you switch.
//   Received: the envelopes, as they came — shut with a small NEW until read, then open with the cat's photo peeking
//             out; tap one and it opens, its photo rising, on to the letter
//   Sent:     postcards kept as a record — to whom, where, when, a SENT postmark and whether it's been read
//   CatPals:  a little address book — each friend's cat, country, letters exchanged, their country's postmark
// Nothing to show: a quiet empty page with the red mailbox (or envelope) and a way to send a letter.
// "?mbSample=1" (or the Map's "?mapSample=1") shows sample letters (labelled as such) to see the design without any real ones.
import { useEffect, useRef, useState } from 'react';
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = "#22304A", MUTED = "#6E7884", FAINT = "#9AA1B0";
const ENV = { open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png", shut: "./assets/onboarding-preview/envelope-closed.png", w: 600, h: 671, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const MAILBOX = "./assets/home/mailbox-frames.webp";
/** no CatPals yet: one cat on its own (in its turkey hat, by its bowl), waiting */
const LONELY_CAT = "./assets/mailbox/lonely-cat.webp";
/** the empty pages' picture frame (the mailbox and the cat fill its height, the envelope its width) */
const ART = { w: 140, h: 128 };   // its first frame: the mailbox shut
const TAB_IDS = ["received", "sent", "pals"] as const;
/** each divider's card stock: a dusty blue, a sage, an oat */
const PAPER: Record<string, string> = { received: "#B9C5CB", sent: "#C5CDB6", pals: "#E4D8BF" };
const card = { position: "relative", display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px", borderRadius: "14px", background: "#FFFEFA", boxShadow: "0 1px 2px rgba(60,40,20,.08), 0 8px 18px rgba(60,40,20,.08)", cursor: "pointer" } as const;
const name = { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px", lineHeight: "22px", letterSpacing: "var(--ls-heading)", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
const sub = { fontWeight: 500, fontSize: "13px", lineHeight: "18px", color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

const sampleOn = typeof location !== "undefined" && ["mbSample", "mapSample"].some((k) => new URLSearchParams(location.search).has(k));
/** sample letters for ?mbSample=1 / ?mapSample=1 only (illustrative names; the photos are the app's own cat images) */
const SAMPLE = {
  received: [
    { key: "s1", name: "Léa", flag: "🇫🇷", country: "France", date: "Oct 21", photo: "./assets/cats/cat-1.jpg", stamp: "./assets/stamp-2.png", pm: "./assets/pm/paris.png", isNew: true },
    { key: "s2", name: "Yuki", flag: "🇯🇵", country: "Japan", date: "Oct 18", photo: "./assets/cats/cat-2.jpg", stamp: "./assets/stamp-5.png", pm: "./assets/pm/tokyo.png", isNew: false },
    { key: "s3", name: "Tom", flag: "🇺🇸", country: "United States", date: "Oct 12", photo: "./assets/cats/cat-3.jpg", stamp: "./assets/stamp-7.png", pm: "./assets/pm/newyork.png", isNew: false },
    { key: "s4", name: "Ava", flag: "🇦🇺", country: "Australia", date: "Oct 9", photo: "./assets/cats/cat-6.jpg", stamp: "./assets/stamp-4.png", pm: "./assets/pm/sydney.png", isNew: false },
  ],
  sent: [
    { key: "t1", name: "Léa", flag: "🇫🇷", country: "France", date: "Oct 20", photo: "./assets/cats/cat-4.jpg", stamp: "./assets/stamp-1.png", pm: "./assets/pm/seoul.png", status: "delivered", statusLabel: "Delivered" },
    { key: "t2", name: "Mei", flag: "🇹🇼", country: "Taiwan", date: "Oct 17", photo: "./assets/cats/cat-5.jpg", stamp: "./assets/stamp-3.png", pm: "./assets/pm/seoul.png", status: "read", statusLabel: "Read" },
    { key: "t3", name: "Yuki", flag: "🇯🇵", country: "Japan", date: "Oct 15", photo: "./assets/cats/cat-6.jpg", stamp: "./assets/stamp-6.png", pm: "./assets/pm/seoul.png", status: "read", statusLabel: "Read" },
    { key: "t4", name: "Ava", flag: "🇦🇺", country: "Australia", date: "Oct 10", photo: "./assets/cats/cat-2.jpg", stamp: "./assets/stamp-8.png", pm: "./assets/pm/seoul.png", status: "read", statusLabel: "Read" },
  ],
  pals: [
    { id: "p1", name: "Léa", flag: "🇫🇷", country: "France", lettersLabel: "4 letters", photo: "./assets/cats/cat-1.jpg", pm: "./assets/pm/paris.png" },
    { id: "p2", name: "Yuki", flag: "🇯🇵", country: "Japan", lettersLabel: "2 letters", photo: "./assets/cats/cat-2.jpg", pm: "./assets/pm/tokyo.png" },
  ],
};

/** a small red envelope: shut (with its stamp) until read, then open with the cat's photo peeking out; opening, the photo rises */
function Envelope({ shut, photo, stamp, rising }: { shut: boolean; photo: string; stamp: string; rising: boolean }) {
  const W = 88, EH = (W * ENV.h) / ENV.w, fold = EH * ENV.fold;
  return (
    <div style={{ position: "relative", flex: "none", width: W + "px", height: EH - fold + "px" }}>
      {/* open: the inside, the photo tucked in, the front pocket */}
      <img src={ENV.open} alt="" draggable={false} style={{ position: "absolute", left: "0", top: -fold + "px", width: "100%", height: EH + "px", clipPath: `inset(${ENV.fold * 100}% 0 0 0)` }} />
      <div style={{ position: "absolute", left: "50%", top: "-14px", width: "42px", padding: "3px 3px 6px", background: "#fff", boxShadow: "0 1px 3px rgba(40,25,20,.25)",
        opacity: shut ? 0 : 1, transform: `translateX(-50%) translateY(${rising ? -14 : shut ? 10 : 0}px) rotate(-4deg)`, transition: "opacity .2s ease .1s, transform .45s cubic-bezier(.3,1.2,.5,1) .12s" }}>
        {photo ? <img src={photo} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#FBF7F0" }} />}
      </div>
      <img src={ENV.front} alt="" draggable={false} style={{ position: "absolute", left: "0", top: (ENV.frontTop - ENV.fold) * EH + "px", width: "100%", height: ENV.frontH * EH + "px" }} />
      {/* shut: the closed envelope over it all, with its stamp (fades as it opens) */}
      <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", opacity: shut ? 1 : 0, transition: "opacity .25s ease" }}>
        <img src={ENV.shut} alt="" draggable={false} style={{ display: "block", width: "100%" }} />
        <div style={{ position: "absolute", right: "7px", top: "7px", width: "15px", height: "20px", background: `url(${stamp}) center / contain no-repeat`, transform: "rotate(5deg)", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.25))" }} />
      </div>
    </div>
  );
}

/** a polaroid of the cat (or an empty one) */
function Polaroid({ src, w, r = -3 }: { src: string; w: number; r?: number }) {
  return (
    <div style={{ flex: "none", width: w + "px", padding: "3px 3px 7px", background: "#fff", boxShadow: "0 1px 3px rgba(40,25,20,.22)", transform: `rotate(${r}deg)` }}>
      {src ? <img src={src} alt="" draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
        : <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#FBF7F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: w * 0.4 + "px" }}>🐱</div>}
    </div>
  );
}

/** the round SENT postmark (in stamp ink), with the date */
function SentMark({ label, date }: { label: string; date: string }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", right: "12px", top: "10px", width: "54px", height: "54px", borderRadius: "50%", border: "2px solid rgba(62,111,168,.75)", boxShadow: "inset 0 0 0 3px #FFFEFA, inset 0 0 0 4px rgba(62,111,168,.55)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-12deg)", color: "rgba(62,111,168,.9)", pointerEvents: "none" }}>
      <span style={{ fontWeight: 700, fontSize: "11px", letterSpacing: ".12em", lineHeight: "12px" }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: "8.5px", lineHeight: "11px" }}>{date}</span>
    </div>
  );
}

/** delivered (in their mailbox) or read (opened), as a small chip */
function Status({ status, label }: { status: string; label: string }) {
  const read = status === "read";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px 3px 7px", borderRadius: "999px", background: read ? "rgba(47,125,91,.10)" : "rgba(110,120,132,.10)", color: read ? "#2F7D5B" : MUTED, fontWeight: 700, fontSize: "11.5px", lineHeight: "16px" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {read ? <><path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="m4.5 12 7.5 5 7.5-5" /></> : <><rect x="3.5" y="6" width="17" height="12" rx="1.6" /><path d="m4.4 7.2 7.6 5.6 7.6-5.6" /></>}
      </svg>
      {label}
    </span>
  );
}

export default function MailboxScreen({ v }: { v: Vals }) {
  // the envelope being opened (it opens, its photo rises, then on to the letter)
  const [opening, setOpening] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!v.sMailbox) return null;
  const T = v.mbT || {};
  const tab: string = v.mbTab || "received";
  const received = sampleOn ? SAMPLE.received : v.mbReceived || [];
  const sent = sampleOn ? SAMPLE.sent : v.mbSent || [];
  const pals = sampleOn ? SAMPLE.pals : v.mbPals || [];
  const ready = sampleOn || v.mbReady;
  const openLetter = (c: any) => {
    if (opening) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { c.open?.(); return; }
    setOpening(c.key);
    timer.current = window.setTimeout(() => { setOpening(null); c.open?.(); }, 620);
  };
  const empty = (img: "mailbox" | "envelope" | "cat", title: string, desc: string) => (
    <div style={{ padding: "46px 18px 34px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
      {/* the picture, the same size on every tab: in one frame, standing on its bottom edge, a soft shadow at its feet */}
      <div aria-hidden="true" style={{ position: "relative", width: ART.w + "px", height: ART.h + "px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <span style={{ position: "absolute", left: "16px", right: "16px", bottom: "-5px", height: "12px", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(60,40,20,.16), transparent)" }} />
        {img === "cat"
          /* alone in the middle of the page, breathing slowly */
          ? <img src={LONELY_CAT} alt="" draggable={false} style={{ position: "relative", display: "block", height: ART.h + "px", width: "auto", transformOrigin: "50% 100%", animation: "cp-mb-lonely 4.5s ease-in-out infinite" }} />
          : img === "mailbox"
            ? <div style={{ position: "relative", height: ART.h + "px", aspectRatio: "184 / 220", backgroundImage: `url(${MAILBOX})`, backgroundSize: "300% 100%", backgroundRepeat: "no-repeat" }} />
            : <img src={ENV.shut} alt="" draggable={false} style={{ position: "relative", display: "block", width: ART.w + "px", marginBottom: "14px", filter: "drop-shadow(0 6px 8px rgba(80,40,30,.14))", transform: "rotate(-4deg)" }} />}
      </div>
      <span style={{ marginTop: "18px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", letterSpacing: "var(--ls-heading)", color: INK }}>{I(title)}</span>
      <span style={{ marginTop: "6px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#4C5562", maxWidth: "260px" }}>{I(desc)}</span>
      <div className="dc-hover-8" onClick={v.startLetter} role="button" style={{ marginTop: "20px", height: "46px", padding: "0 22px", borderRadius: "23px", background: INK, display: "flex", alignItems: "center", cursor: "pointer", boxShadow: "0 8px 18px rgba(20,15,10,.14)", transition: "transform .15s ease" }}>
        <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>{I(T.mbSendCta)}</span>
      </div>
    </div>
  );

  return (
    <div data-screen-label="Mailbox" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto", padding: "52px 18px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <span style={{ paddingLeft: v.showBack ? "34px" : "4px", fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "30px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", color: INK }}>{I(v.t?.mailbox)}</span>
        {sampleOn ? <span style={{ marginTop: "4px", paddingLeft: "4px", fontWeight: 500, fontSize: "12px", color: "#C9785D" }}>{I(T.mbSampleNote)}</span> : null}

        {/* index tabs: the chosen one is the sheet in front */}
        <div className="cp-mb-tabs" role="tablist" style={{ marginTop: "16px" }}>
          {each(v.mbTabs, (b: any, i: number) => (
            <div role="tab" aria-selected={tab === TAB_IDS[i]} onClick={b?.tap} className={"cp-mb-tab" + (tab === TAB_IDS[i] ? " on" : "")} style={{ ["--paper" as string]: PAPER[TAB_IDS[i]] }}>
              <span style={{ whiteSpace: "nowrap" }}>{I(b?.label)}</span>
              {b?.badge ? <span style={{ minWidth: "18px", height: "18px", padding: "0 5px", boxSizing: "border-box", borderRadius: "9px", background: "#E5483D", color: "#fff", fontWeight: 700, fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>{I(b?.count)}</span> : null}
            </div>
          ))}
        </div>

        {/* the sheet: it turns like a page when the tab changes */}
        <div className="cp-mb-panel" style={{ ["--paper" as string]: PAPER[tab] }}>
          <div key={tab} className="cp-mb-page">
            {!ready ? null : tab === "received" ? (
              received.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {each(received, (c: any, i: number) => (
                    <div className="cp-mb-card dc-hover-2" onClick={() => openLetter(c)} role="button" aria-label={c.name + ", " + c.country}
                      style={{ ...card, ["--r" as string]: (i % 2 ? 0.6 : -0.5) + "deg", animationDelay: i * 60 + "ms" }}>
                      <Envelope shut={!!c.isNew && opening !== c.key} photo={c.photo} stamp={c.stamp} rising={opening === c.key} />
                      <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: 500, fontSize: "11px", color: FAINT }}>{I(T.mbFromLabel)}</span>
                        <span style={name}>{I(c.name)}</span>
                        <span style={sub}>{I(c.flag)}{" "}{I(c.country)}</span>
                      </div>
                      <div style={{ flex: "none", alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" }}>
                        {c.isNew && opening !== c.key ? <span style={{ padding: "2px 7px", borderRadius: "8px", background: "#E5483D", color: "#fff", fontWeight: 700, fontSize: "9.5px", letterSpacing: ".06em" }}>{I(T.mbNewTag)}</span> : <span />}
                        <span style={{ fontWeight: 500, fontSize: "12px", color: FAINT }}>{I(c.date)}</span>
                      </div>
                      {/* their country's postmark, faint, across the corner */}
                      <div aria-hidden="true" style={css(`position:absolute;right:40px;top:6px;width:66px;height:46px;background:url(${R(c.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.28;transform:rotate(-10deg);pointer-events:none`)} />
                    </div>
                  ))}
                </div>
              ) : empty("mailbox", T.mbEmptyRecvT, T.mbEmptyRecvD)
            ) : tab === "sent" ? (
              sent.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {each(sent, (c: any, i: number) => (
                    <div className="cp-mb-card dc-hover-2" onClick={() => c.open?.()} role="button" aria-label={c.name + ", " + c.country + ", " + c.statusLabel}
                      style={{ ...card, overflow: "hidden", paddingLeft: "18px", ["--r" as string]: (i % 2 ? -0.5 : 0.5) + "deg", animationDelay: i * 60 + "ms" }}>
                      {/* an airmail edge: this one went out */}
                      <span aria-hidden="true" style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "6px", background: "repeating-linear-gradient(-45deg, #E5483D 0 6px, #FFFEFA 6px 10px, #3E6FA8 10px 16px, #FFFEFA 16px 20px)" }} />
                      <Polaroid src={c.photo} w={54} />
                      <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px", paddingRight: "54px" }}>
                        <span style={{ fontWeight: 500, fontSize: "11px", color: FAINT }}>{I(T.mbToLabel)}</span>
                        <span style={name}>{I(c.name)}</span>
                        <span style={sub}>{I(c.flag)}{" "}{I(c.country)}</span>
                        <span style={{ marginTop: "4px" }}><Status status={c.status} label={c.statusLabel} /></span>
                      </div>
                      <SentMark label={T.mbSentMark} date={c.date} />
                    </div>
                  ))}
                </div>
              ) : empty("envelope", T.mbEmptySentT, T.mbEmptySentD)
            ) : (
              pals.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {each(pals, (p: any, i: number) => (
                    <div className="cp-mb-card dc-hover-2" onClick={() => p.open?.()} role="button" aria-label={p.name + ", " + p.country}
                      style={{ ...card, paddingTop: "16px", background: "#FFFEFA", backgroundImage: "linear-gradient(#E9A296, #E9A296), repeating-linear-gradient(to bottom, transparent 0 25px, rgba(62,111,168,.10) 25px 26px)",
                        backgroundSize: "100% 1.5px, 100% 100%", backgroundPosition: "0 10px, 0 10px", backgroundRepeat: "no-repeat, repeat", ["--r" as string]: "0deg", animationDelay: i * 60 + "ms" }}>
                      <Polaroid src={p.photo} w={56} r={i % 2 ? 3 : -3} />
                      <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={name}>{I(p.name)}</span>
                        <span style={sub}>{I(p.flag)}{" "}{I(p.country)}</span>
                        <span style={{ marginTop: "4px", alignSelf: "flex-start", padding: "2px 9px", borderRadius: "999px", background: "rgba(34,48,74,.06)", fontWeight: 700, fontSize: "11.5px", lineHeight: "16px", color: INK }}>{"✉ "}{I(p.lettersLabel)}</span>
                      </div>
                      <div aria-hidden="true" style={css(`flex:none;width:64px;height:46px;background:url(${R(p.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.6;transform:rotate(-10deg)`)} />
                      <span aria-hidden="true" style={{ flex: "none", fontSize: "16px", color: "#C6BBA8" }}>›</span>
                    </div>
                  ))}
                </div>
              ) : empty("cat", T.mbEmptyPalsT, T.mbEmptyPalsD)
            )}
          </div>
          <span className="cp-mb-caption">{I(tab === "sent" ? T.mbCapSent : tab === "pals" ? T.mbCapPals : T.mbCapRecv)}</span>
        </div>
      </div>
    </div>
  );
}
