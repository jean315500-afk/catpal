// MAILBOX — a little box of letters from far away, in Home's look (the pastel sky, navy type, the red envelope):
// a little card file: index dividers of coloured card stock (Received / Sent / CatPals, each its own paper); the
// chosen one comes to the front and turns like a page when you switch.
//   Received: the envelopes in a little stack (MailboxLetters): swipe for the next, tap one to open it — it comes to
//             the middle, opens, the photo and letter rise out, and the letter comes forward to read, with "Write back"
//   Sent:     an airmail record box — the envelopes you sent, a little on top of each other: to whom, where, a rubber-
//             stamped DELIVERED / READ and an inked SENT postmark, dated; the countries they went to along the top
//   CatPals:  each friend as the bundle of letters you've kept from them (MailboxLetters' PalBundle): their cat's
//             print, how many on a tag, their stamp and postmark as you've collected them, and whose turn it is
// Nothing to show: a quiet empty page with the red mailbox (or envelope) and a way to send a letter.
// "?mbSample=1" (or the Map's "?mapSample=1") shows sample letters (labelled as such) to see the design without any real ones.
import { useEffect, useRef, useState } from 'react';
import { each, I } from '../dc/runtime';
import { stampOf } from '../community/countries';
import { InkDefs, LetterDeck, OpenLetter, PalBundle, SentEnvelope, type MailItem } from './MailboxLetters';
import type { Vals } from '../dc/runtime';

const INK = "#22304A";
const ENV = { open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png", shut: "./assets/onboarding-preview/envelope-closed.png", w: 600, h: 671, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const MAILBOX = "./assets/home/mailbox-frames.webp";
/** no CatPals yet: one cat on its own (in its turkey hat, by its bowl), waiting */
const LONELY_CAT = "./assets/mailbox/lonely-cat.webp";
/** the empty pages' picture frame (the mailbox and the cat fill its height, the envelope its width) */
const ART = { w: 140, h: 128 };   // its first frame: the mailbox shut
const TAB_IDS = ["received", "sent", "pals"] as const;
/** each divider's card stock: a dusty blue, a sage, an oat */
const PAPER: Record<string, string> = { received: "#B9C5CB", sent: "#C5CDB6", pals: "#E4D8BF" };

const sampleOn = typeof location !== "undefined" && ["mbSample", "mapSample", "arriveSample"].some((k) => new URLSearchParams(location.search).has(k));
/** "?arriveSample=1": the sample, plus one more sample letter on its way — it lands ~30 s after the page opens (when:
 *  the logic's v.arriveAt; it counts it down, on Home too) */
const arriveOn = typeof location !== "undefined" && new URLSearchParams(location.search).has("arriveSample");
/** sample letters for ?mbSample=1 / ?mapSample=1 only (illustrative names; the photos are the app's own cat images) */
const SAMPLE = {
  received: [
    { key: "s1", name: "Léa", cc: "FR", flag: "🇫🇷", country: "France", date: "Oct 21", photo: "./assets/cats/cat-1.jpg", stamp: stampOf("FR"), pm: "./assets/pm/paris.png", isNew: true, body: "Bonjour from Paris! Mochi found the sunniest spot by the window today and refused to move all afternoon. Does your cat have a favourite spot too?", dateLong: "October 21, 2026" },
    { key: "s2", name: "Yuki", cc: "JP", flag: "🇯🇵", country: "Japan", date: "Oct 18", photo: "./assets/cats/cat-2.jpg", stamp: stampOf("JP"), pm: "./assets/pm/tokyo.png", isNew: false, body: "Hello! Tora knocked my tea off the table again this morning. She looked so proud of herself. What is your cat like?", dateLong: "October 18, 2026" },
    { key: "s3", name: "Tom", cc: "US", flag: "🇺🇸", country: "United States", date: "Oct 12", photo: "./assets/cats/cat-3.jpg", stamp: stampOf("US"), pm: "./assets/pm/newyork.png", isNew: false, body: "Hi there! Biscuit learned to open the treat drawer. We had to put a lock on it. Hope your cat is having a cozy day!", dateLong: "October 12, 2026" },
    { key: "s4", name: "Ava", cc: "AU", flag: "🇦🇺", country: "Australia", date: "Oct 9", photo: "./assets/cats/cat-6.jpg", stamp: stampOf("AU"), pm: "./assets/pm/sydney.png", isNew: false, body: "G'day! Pip loves watching the birds from the balcony. She chatters at them every morning.", dateLong: "October 9, 2026" },
  ],
  sent: [
    { key: "t1", at: new Date().toISOString(), name: "Léa", flag: "🇫🇷", country: "France", date: "Oct 20", photo: "./assets/cats/cat-4.jpg", stamp: "./assets/stamp-1.png", pm: "./assets/pm/seoul.png", status: "delivered", statusLabel: "Delivered" },
    { key: "t2", name: "Mei", flag: "🇹🇼", country: "Taiwan", date: "Oct 17", photo: "./assets/cats/cat-5.jpg", stamp: "./assets/stamp-3.png", pm: "./assets/pm/seoul.png", status: "read", statusLabel: "Read" },
    { key: "t3", name: "Yuki", flag: "🇯🇵", country: "Japan", date: "Oct 15", photo: "./assets/cats/cat-6.jpg", stamp: "./assets/stamp-6.png", pm: "./assets/pm/seoul.png", status: "read", statusLabel: "Read" },
    { key: "t4", name: "Ava", flag: "🇦🇺", country: "Australia", date: "Oct 10", photo: "./assets/cats/cat-2.jpg", stamp: "./assets/stamp-8.png", pm: "./assets/pm/seoul.png", status: "read", statusLabel: "Read" },
  ],
  /** (?arriveSample=1) the one on its way, till it lands */
  arriving: { key: "s0", name: "Alex", cc: "CA", flag: "🇨🇦", country: "Canada", date: "Oct 28", photo: "./assets/cats/cat-4.jpg", stamp: stampOf("CA"), pm: "./assets/pm/vancouver.png", isNew: true, body: "Hi from Vancouver! Luna slept on my keyboard all morning while I tried to work. Does your cat steal your chair too?", dateLong: "October 28, 2026" },
  pals: [
    { id: "p1", name: "Léa", flag: "🇫🇷", country: "France", n: 4, lettersLabel: "4 letters", photo: "./assets/cats/cat-1.jpg", pm: "./assets/pm/paris.png", stampImg: stampOf("FR"), hasStamp: true, hasMark: true, yourTurn: true },
    { id: "p2", name: "Yuki", flag: "🇯🇵", country: "Japan", n: 3, lettersLabel: "3 letters", photo: "./assets/cats/cat-2.jpg", pm: "./assets/pm/tokyo.png", stampImg: stampOf("JP"), hasStamp: true, hasMark: true, yourTurn: false },
    { id: "p3", name: "Tom", flag: "🇺🇸", country: "United States", n: 1, lettersLabel: "1 letter", photo: "./assets/cats/cat-3.jpg", pm: "./assets/pm/newyork.png", stampImg: stampOf("US"), hasStamp: true, hasMark: false, yourTurn: true },
  ],
};




/** when the Sent tab was last looked at: a letter sent since is NEW there (once — the next look, it isn't) */
const SENT_SEEN = "cp-sent-seen";
const readSeen = () => { try { return localStorage.getItem(SENT_SEEN) || ""; } catch { return ""; } };

export default function MailboxScreen({ v }: { v: Vals }) {
  // the Sent tab, opened: what was new is marked from the last look (kept for this visit); this look is remembered
  const [sentSeen, setSentSeen] = useState(() => readSeen() || new Date(Date.now() - 10 * 60e3).toISOString());
  const onSent = !!v.sMailbox && (v.mbTab || "received") === "sent";
  useEffect(() => {
    if (!onSent) return;
    setSentSeen(readSeen() || new Date(Date.now() - 10 * 60e3).toISOString());
    try { localStorage.setItem(SENT_SEEN, new Date().toISOString()); } catch { /* private mode: new for this visit only */ }
  }, [onSent]);
  // the envelope being opened (it opens, its photo rises, then on to the letter)
  const [opened, setOpened] = useState<{ c: MailItem; rect: DOMRect } | null>(null);
  useEffect(() => { if (!v.sMailbox) setOpened(null); }, [v.sMailbox]);
  // (?arriveSample=1) the sample letter landed — "just landed" for a moment
  const now = Date.now(), landed = arriveOn && !!v.arriveAt && now >= v.arriveAt, justLanded = landed && now < v.arriveAt + 4500;
  if (!v.sMailbox) return null;
  const T = v.mbT || {};
  const tab: string = v.mbTab || "received";
  const received = sampleOn ? (landed ? [SAMPLE.arriving, ...SAMPLE.received] : SAMPLE.received) : v.mbReceived || [];
  // on their way to you (the sample's one among them, counted down by the logic)
  const inbound = sampleOn && !arriveOn ? [] : v.mbInbound || [];
  const sent = sampleOn ? SAMPLE.sent : v.mbSent || [];
  const pals = sampleOn ? SAMPLE.pals : v.mbPals || [];
  const ready = sampleOn || v.mbReady;
  // a letter opened from the stack: where its envelope was (it opens from there), and the letter itself — a real one
  // is marked read and held by the logic (v.mbReading); a sample one is only shown
  const openFrom = (c: MailItem, el: HTMLElement) => { setOpened({ c, rect: el.getBoundingClientRect() }); if (!sampleOn) c.open?.(); };
  const shut = () => { setOpened(null); v.mbReading?.close?.(); };
  const reading = opened ? (sampleOn ? { ...opened.c, firstStamp: opened.c.isNew, newStampText: (T.mbNewStampFor || "").replace("{country}", opened.c.country), writeBackLabel: (T.mbWriteBackFor || "Write back to {name}").replace("{name}", opened.c.name) } : v.mbReading ? { ...opened.c, ...v.mbReading } : opened.c) : null;
  // unread first, then newest
  const deck = [...received].sort((a: any, b: any) => Number(b.isNew) - Number(a.isNew));
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
    <>
    <InkDefs />
    <div data-screen-label="Mailbox" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto", padding: "52px 18px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <span style={{ paddingLeft: v.showBack ? "34px" : "4px", fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "30px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", color: INK }}>{I(v.t?.mailbox)}</span>
        {sampleOn ? <span style={{ marginTop: "4px", paddingLeft: "4px", fontWeight: 500, fontSize: "12px", color: "#C9785D" }}>{I(arriveOn ? T.mbArriveSampleNote : T.mbSampleNote)}</span> : null}

        {/* (the sample) it just landed */}
        {justLanded ? (
          <div role="status" style={{ position: "fixed", left: "50%", top: "64px", zIndex: 50, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px 8px 8px", borderRadius: "999px", background: "#fff", boxShadow: "0 10px 26px rgba(34,48,74,.18)", whiteSpace: "nowrap", animation: "cp-rise2 .4s cubic-bezier(.2,.8,.2,1) both" }}>
            <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" style={{ width: "30px", transform: "scaleX(-1)" }} />
            <span style={{ fontWeight: 700, fontSize: "13px", color: INK }}>{I(SAMPLE.arriving.flag)}{" "}{I((T.mbLanded || "").replace("{name}", SAMPLE.arriving.name))}</span>
          </div>
        ) : null}
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
        <div className="cp-mb-panel" style={{ ["--paper" as string]: PAPER[tab], paddingBottom: "18px", ...(tab === "received" && received.length ? { minHeight: "0" } : {}) }}>
          <div key={tab} className="cp-mb-page">
            {/* on their way to you: where from, and when they land (not to be opened before) */}
            {ready && tab === "received" && inbound.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "4px 2px 12px" }}>
                {each(inbound, (x: any) => (
                  <div key={x.key} role="status" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px 10px 10px", borderRadius: "16px", background: "rgba(255,252,244,.92)", boxShadow: "0 1px 2px rgba(60,40,20,.08), inset 0 0 0 1px rgba(160,104,46,.14)", animation: "cp-rise2 .45s cubic-bezier(.2,.8,.2,1) both" }}>
                    <span aria-hidden="true" style={{ flex: "none", width: "42px", height: "42px", borderRadius: "21px", background: "#FFF1DC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src="./assets/map/bird-letter-still.webp" alt="" style={{ width: "30px", transform: "scaleX(-1)" }} />
                    </span>
                    <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <b style={{ fontWeight: 700, fontSize: "13.5px", lineHeight: "18px", color: INK }}>{I(x.flag)}{" "}{I(x.text)}</b>
                      <span style={{ fontWeight: 500, fontSize: "12px", lineHeight: "16px", color: "#A0682E" }}>{I(x.eta)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            {!ready ? null : tab === "received" ? (
              received.length ? (
                /* the envelopes, stacked: swipe for the next, tap to open */
                <LetterDeck items={deck} onOpen={openFrom} t={T} lifted={opened ? opened.c.key : null} />
              ) : inbound.length ? null : empty("mailbox", T.mbEmptyRecvT, T.mbEmptyRecvD)   /* (one on its way: its card says it all) */
            ) : tab === "sent" ? (
              sent.length ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* where your letters have gone: each country once, as a little stamp */}
                  <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-hand)", fontSize: "19px", lineHeight: "22px", color: "var(--hand-ink)" }}>{I(T.mbSentTo)}</span>
                    {[...new Map(sent.filter((c: any) => !c.invite).map((c: any) => [c.country, c])).values()].map((c: any, i: number) => (
                      <span key={c.country} title={c.country} style={{ width: "26px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", background: "#FFFCF4", borderRadius: "2px",
                        boxShadow: "0 1px 2px rgba(60,40,20,.2)", outline: "1.5px dotted rgba(255,252,244,1)", outlineOffset: "-1px", transform: `rotate(${i % 2 ? 4 : -3}deg)` }}>{I(c.flag)}</span>
                    ))}
                  </div>
                  {each(sent, (c: any, i: number) => <SentEnvelope c={c} i={i} t={T} isNew={!!c.at && c.at > sentSeen} />)}
                </div>
              ) : empty("envelope", T.mbEmptySentT, T.mbEmptySentD)
            ) : (
              pals.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontFamily: "var(--font-hand)", fontSize: "19px", lineHeight: "22px", color: "var(--hand-ink)" }}>
                    {I((() => { const c = new Set(pals.map((p: any) => p.country)).size;
                      return (T.mbPalsSum || "").replace("{n}", String(pals.length)).replace("{p}", pals.length === 1 ? T.wPal : T.wPals).replace("{c}", String(c)).replace("{w}", c === 1 ? T.wCountry : T.wCountries); })())}
                  </span>
                  {each(pals, (p: any, i: number) => <PalBundle p={p} i={i} t={T} />)}
                </div>
              ) : empty("cat", T.mbEmptyPalsT, T.mbEmptyPalsD)
            )}
            {/* CatPals: a friend by my personal link, always here (small; never in the way of a letter) */}
            {tab === "pals" && v.mbInvite && !sampleOn ? (
              <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <span style={{ fontWeight: 400, fontSize: "12.5px", lineHeight: "18px", color: "#5E6A80" }}>{I(T.arrInviteQ)}</span>
                <span onClick={v.mbInvite} role="button" style={{ padding: "6px 10px", fontWeight: 700, fontSize: "var(--fs-caption)", color: "#22304A", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(T.arrInvite)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
    {/* a letter, opened from the stack (over the whole screen, outside its scroll) */}
    {reading ? <OpenLetter key={reading.key} c={reading} from={opened ? opened.rect : null} onClose={shut} onWriteBack={sampleOn ? () => v.mbSampleWriteBack?.(reading) : v.mbReading?.writeBack || null} t={T} sample={sampleOn} freshSheet={sampleOn} /> : null}
    </>
  );
}
