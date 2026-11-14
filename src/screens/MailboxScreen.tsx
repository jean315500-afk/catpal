// MAILBOX — opened from Home's red mailbox: the letters standing in a box, one behind another, each one's top showing
// (MailboxLetters' LetterArchive), under two index dividers of coloured card stock — Received (the default) and Sent.
// The wheel, a trackpad or an up / down swipe looks through them, a letter at a time; tapped, one comes up out of the
// box and opens to read; put back, it slips into its place (the tab, and where you were in each, kept).
//   Received: newest not-read in front (sealed, "New"), then the read ones, the ones still on their way at the back —
//             tapped, those only say when they land. Reading one: "Reply".
//   Sent:     airmail envelopes — to whom, where, what became of each; one still flying only says how it's going.
// Nothing to show: a quiet empty page with the red mailbox (or envelope) and a way to send a letter.
// "?mbSample=1" (or the Map's "?mapSample=1") shows sample letters (labelled as such) to see the design without any real ones.
import { useEffect, useRef, useState } from 'react';
import { I } from '../dc/runtime';
import { stampOf, postmarkOf } from '../community/countries';
import { LetterArchive, InkDefs, OpenLetter, type FileItem, type MailItem } from './MailboxLetters';
import type { Vals } from '../dc/runtime';

const INK = "#22304A";
const ENV = { open: "./assets/onboarding-preview/envelope-open.png", front: "./assets/onboarding-preview/envelope-front.png", shut: "./assets/onboarding-preview/envelope-closed.png", w: 600, h: 671, fold: 512 / 1245, frontTop: 551 / 1245, frontH: 374 / 671 };
const MAILBOX = "./assets/home/mailbox-frames.webp";
/** no CatPals yet: one cat on its own (in its turkey hat, by its bowl), waiting */
const LONELY_CAT = "./assets/mailbox/lonely-cat.webp";
/** the empty pages' picture frame (the mailbox and the cat fill its height, the envelope its width) */
const ART = { w: 140, h: 128 };   // its first frame: the mailbox shut
const TAB_IDS = ["received", "sent"] as const;

const sampleOn = typeof location !== "undefined" && ["mbSample", "mapSample", "arriveSample"].some((k) => new URLSearchParams(location.search).has(k));
/** "?arriveSample=1": the sample, plus one more sample letter on its way — it lands ~30 s after the page opens (when:
 *  the logic's v.arriveAt; it counts it down, on Home too) */
const arriveOn = typeof location !== "undefined" && new URLSearchParams(location.search).has("arriveSample");
/** sample letters for ?mbSample=1 / ?mapSample=1 only (illustrative names; the photos are the app's own cat images) */
const SAMPLE = {
  received: [
    { key: "s1", at: "2026-11-05T09:00:00Z", name: "Léa", cc: "FR", flag: "🇫🇷", country: "France", date: "Nov 5", photo: "./assets/cats/cat-1.jpg", stamp: stampOf("FR"), pm: postmarkOf("FR"), isNew: true, body: "Bonjour from Paris! Mochi found the sunniest spot by the window today and refused to move all afternoon. Does your cat have a favourite spot too?", dateLong: "November 5, 2026" },
    { key: "s2", at: "2026-11-02T09:00:00Z", name: "Yuki", cc: "JP", flag: "🇯🇵", country: "Japan", date: "Nov 2", photo: "./assets/cats/cat-2.jpg", stamp: stampOf("JP"), pm: postmarkOf("JP"), isNew: true, body: "Hello! Tora knocked my tea off the table again this morning. She looked so proud of herself. What is your cat like?", dateLong: "November 2, 2026" },
    { key: "s3", at: "2026-10-24T09:00:00Z", name: "Tom", cc: "US", flag: "🇺🇸", country: "United States", date: "Oct 24", photo: "./assets/cats/cat-3.jpg", stamp: stampOf("US"), pm: postmarkOf("US"), isNew: true, body: "Hi there! Biscuit learned to open the treat drawer. We had to put a lock on it. Hope your cat is having a cozy day!", dateLong: "October 24, 2026" },
    { key: "s5", at: "2026-10-12T09:00:00Z", name: "Maple", cc: "CA", flag: "🇨🇦", country: "Canada", date: "Oct 12", photo: "./assets/cats/cat-5.jpg", stamp: stampOf("CA"), pm: postmarkOf("CA"), isNew: false, body: "Hi from Vancouver! Maple watched the first snow from the window all morning. Has it snowed where you are yet?", dateLong: "October 12, 2026" },
    { key: "s6", at: "2026-10-03T09:00:00Z", name: "Emma", cc: "GB", flag: "🇬🇧", country: "United Kingdom", date: "Oct 3", photo: "./assets/cats/cat-2.jpg", stamp: stampOf("GB"), pm: postmarkOf("GB"), isNew: false, body: "Hello from London! It rained all week, so Earl Grey has claimed the radiator as his own. Does your cat have a winter spot?", dateLong: "October 3, 2026" },
    { key: "s4", at: "2026-09-28T09:00:00Z", name: "Ava", cc: "AU", flag: "🇦🇺", country: "Australia", date: "Sep 28", photo: "./assets/cats/cat-6.jpg", stamp: stampOf("AU"), pm: postmarkOf("AU"), isNew: false, body: "G'day! Pip loves watching the birds from the balcony. She chatters at them every morning.", dateLong: "September 28, 2026" },
    { key: "s7", at: "2026-09-15T09:00:00Z", name: "Marco", cc: "IT", flag: "🇮🇹", country: "Italy", date: "Sep 15", photo: "./assets/cats/cat-3.jpg", stamp: stampOf("IT"), pm: postmarkOf("IT"), isNew: false, body: "Ciao! Pepe sleeps in the fruit bowl every afternoon. We have stopped buying fruit bowls.", dateLong: "September 15, 2026" },
  ],
  sent: [
    { key: "t0", at: "2026-11-07T12:00:00Z", name: "Tom", flag: "🇺🇸", country: "United States", date: "Nov 7", photo: "./assets/cats/cat-1.jpg", stamp: "./assets/stamp-2.png", pm: postmarkOf("KR"), status: "flying", statusLabel: "On its way · 6 h", body: "" },
    { key: "t1", at: "2026-11-04T10:00:00Z", body: "Hi Léa! Mochi says bonjour back. She has a sunny spot too — right on my desk, on top of whatever I'm working on.", dateLong: "November 4, 2026", name: "Léa", flag: "🇫🇷", country: "France", date: "Nov 4", photo: "./assets/cats/cat-4.jpg", stamp: "./assets/stamp-1.png", pm: postmarkOf("KR"), status: "delivered", statusLabel: "Delivered" },
    { key: "t2", at: "2026-10-27T10:00:00Z", body: "Hello Mei! It rained all day here, so Mochi and I watched the drops on the window together.", dateLong: "October 27, 2026", name: "Mei", flag: "🇹🇼", country: "Taiwan", date: "Oct 27", photo: "./assets/cats/cat-5.jpg", stamp: "./assets/stamp-3.png", pm: postmarkOf("KR"), status: "read", statusLabel: "Read" },
    { key: "t3", at: "2026-10-19T10:00:00Z", body: "Hi Yuki! Mochi knocked a pen off my table this morning, so Tora isn't alone. Cats really are the same everywhere.", dateLong: "October 19, 2026", name: "Yuki", flag: "🇯🇵", country: "Japan", date: "Oct 19", photo: "./assets/cats/cat-6.jpg", stamp: "./assets/stamp-6.png", pm: postmarkOf("KR"), status: "read", statusLabel: "Read" },
    { key: "t4", at: "2026-09-30T10:00:00Z", body: "G'day Ava! Mochi chatters at the birds too. One day she'll catch one — in her dreams.", dateLong: "September 30, 2026", name: "Ava", flag: "🇦🇺", country: "Australia", date: "Sep 30", photo: "./assets/cats/cat-2.jpg", stamp: "./assets/stamp-8.png", pm: postmarkOf("KR"), status: "read", statusLabel: "Read" },
  ],
  /** (?arriveSample=1) the one on its way, till it lands */
  arriving: { key: "s0", name: "Alex", cc: "CA", flag: "🇨🇦", country: "Canada", date: "Oct 28", photo: "./assets/cats/cat-4.jpg", stamp: stampOf("CA"), pm: postmarkOf("CA"), isNew: true, body: "Hi from Vancouver! Luna slept on my keyboard all morning while I tried to work. Does your cat steal your chair too?", dateLong: "October 28, 2026" },
};





export default function MailboxScreen({ v }: { v: Vals }) {
  // the envelope being opened (it opens, its photo rises, then on to the letter)
  const [opened, setOpened] = useState<{ c: MailItem; rect: DOMRect } | null>(null);
  useEffect(() => { if (!v.sMailbox) setOpened(null); }, [v.sMailbox]);
  // a letter asked for from outside the box ("Open your letter" in an email): opened as if tapped
  useEffect(() => {
    const id = v.mbOpenReq; if (!id || !v.sMailbox) return;
    const c = (v.mbReceived || []).find((x: any) => x.key === id);
    if (c) { setOpened({ c, rect: null }); c.open?.(); v.mbOpenReqDone?.(); }
  }, [v.mbOpenReq, v.sMailbox, v.mbReceived]);
  // (?arriveSample=1) the sample letter landed — "just landed" for a moment
  const now = Date.now(), landed = arriveOn && !!v.arriveAt && now >= v.arriveAt, justLanded = landed && now < v.arriveAt + 4500;
  // put back: it slips into its place again
  const [back, setBack] = useState<string | null>(null);
  useEffect(() => { if (!back) return; const id = setTimeout(() => setBack(null), 600); return () => clearTimeout(id); }, [back]);
  // where you were in each tab's letters (kept while you read one, and between the tabs)
  const place = useRef<Record<string, number>>({ received: 0, sent: 0 });
  // a letter still on its way, tapped: how it's going (never what it says)
  const [way, setWay] = useState<any>(null);
  useEffect(() => { if (!v.sMailbox) setWay(null); }, [v.sMailbox]);
  // (a keyboard) Esc puts the letter back, or closes how one on its way is going
  const escRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!v.sMailbox) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") escRef.current(); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [v.sMailbox]);
  if (!v.sMailbox) return null;
  const T = v.mbT || {};
  const tab: string = v.mbTab || "received";
  const received = sampleOn ? (landed ? [SAMPLE.arriving, ...SAMPLE.received] : SAMPLE.received) : v.mbReceived || [];
  // on their way to you (the sample's one among them, counted down by the logic)
  const inbound = sampleOn && !arriveOn ? [] : v.mbInbound || [];
  const sent = sampleOn ? SAMPLE.sent : v.mbSent || [];
  const ready = sampleOn || v.mbReady;
  // a letter opened from the stack: where its envelope was (it opens from there), and the letter itself — a real one
  // is marked read and held by the logic (v.mbReading); a sample one is only shown
  const openFrom = (c: FileItem, el: HTMLElement) => {
    // (a link not yet claimed has no letter to show here: it opens as it always has)
    if ((c as any).invite) { c.open?.(); return; }
    setOpened({ c, rect: el.getBoundingClientRect() }); if (!sampleOn && !c.sent) c.open?.();
  };
  const shut = () => { if (opened) setBack(opened.c.key); setOpened(null); v.mbReading?.close?.(); };
  escRef.current = () => { if (way) setWay(null); else if (opened) shut(); };
  const mine = !!(opened && (opened.c as FileItem).sent);
  const reading = opened ? (mine ? opened.c : sampleOn ? { ...opened.c, firstStamp: opened.c.isNew, newStampText: (T.mbNewStampFor || "").replace("{country}", opened.c.country), writeBackLabel: T.mbReply || "Reply" } : v.mbReading ? { ...opened.c, ...v.mbReading } : opened.c) : null;
  // in the box, front to back: the ones not read yet (newest first), the read ones, then the ones still on their way
  // (soonest first) at the back
  const deck: FileItem[] = [
    ...received.filter((c: any) => c.isNew), ...received.filter((c: any) => !c.isNew),
    ...inbound.map((x: any) => ({ key: x.key, name: "", flag: x.flag, country: x.country || "", date: "", photo: "", stamp: x.stamp || "", pm: x.pm || "", isNew: false, inbound: true, soon: x.soon, text: x.text, eta: x.soon }))];
  // newest first; one still flying can't be opened, only asked after
  const sentFiled: FileItem[] = sent.map((c: any) => ({ ...c, sent: true, isNew: false, inbound: false }));
  // newest first (received: when it came; sent: when it went); the ones on their way to you at the very back
  const newest = (list: FileItem[]) => [...list].sort((a, b) => ((a.at || "") < (b.at || "") ? 1 : -1));
  const recvItems = [...newest(deck.filter((c) => !c.inbound)), ...deck.filter((c) => c.inbound)], sentItems = newest(sentFiled);
  const items = tab === "received" ? recvItems : sentItems;
  const tabOf = (id: string) => (v.mbTabs || [])[TAB_IDS.indexOf(id as any)];
  const tapWay = (c: any) => setWay(c.sent ? { flag: c.flag, text: (T.mbWayTo || "").replace("{name}", c.name), eta: c.statusLabel, sent: true } : c);
  const tapOpen = (c: FileItem, el: HTMLElement) => { if (c.sent && c.status === "flying") { tapWay(c); return; } openFrom(c, el); };
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
      <div style={{ maxWidth: "460px", margin: "0 auto", padding: "50px 18px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {/* back to the mailbox on Home; the title */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span onClick={v.mbHome} role="button" tabIndex={0} aria-label={v.t?.navHome} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.mbHome?.(); } }} className="dc-hover-12"
            style={{ width: "36px", height: "36px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}>
            <span aria-hidden="true" style={{ width: "10px", height: "10px", borderLeft: "2px solid " + INK, borderBottom: "2px solid " + INK, transform: "rotate(45deg)", marginLeft: "4px" }} />
          </span>
          <span style={{ fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "30px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", color: INK }}>{I(v.t?.mailbox)}</span>
        </div>
        {sampleOn ? <span style={{ marginTop: "4px", paddingLeft: "40px", fontWeight: 500, fontSize: "12px", color: "#C9785D" }}>{I(arriveOn ? T.mbArriveSampleNote : T.mbSampleNote)}</span> : null}

        {/* (the sample) it just landed */}
        {justLanded ? (
          <div role="status" style={{ position: "fixed", left: "50%", top: "64px", zIndex: 50, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px 8px 8px", borderRadius: "999px", background: "#fff", boxShadow: "0 10px 26px rgba(34,48,74,.18)", whiteSpace: "nowrap", animation: "cp-rise2 .4s cubic-bezier(.2,.8,.2,1) both" }}>
            <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" style={{ width: "30px", transform: "scaleX(-1)" }} />
            <span style={{ fontWeight: 700, fontSize: "13px", color: INK }}>{I(SAMPLE.arriving.flag)}{" "}{I((T.mbLanded || "").replace("{name}", SAMPLE.arriving.name))}</span>
          </div>
        ) : null}
        {/* the folder: Received / Sent on its index tabs, the letters standing in it (or, none: a quiet note in it) */}
        <div style={{ marginTop: "14px" }}>
          <LetterArchive active={tab} onTab={(id) => { if (id !== tab) tabOf(id)?.tap?.(); }} t={T} onOpen={tapOpen} onWay={tapWay} lifted={opened ? opened.c.key : null} back={back}
            groups={TAB_IDS.map((id) => ({ id, label: tabOf(id)?.label || "", count: id === "received" && tabOf(id)?.badge ? tabOf(id)?.count : 0,
              items: id === "received" ? recvItems : sentItems, start: place.current[id] || 0, onPlace: (i: number) => { place.current[id] = i; },
              empty: !ready ? null : id === "received" ? empty("mailbox", T.mbEmptyRecvT, T.mbEmptyRecvD) : empty("envelope", T.mbEmptySentT, T.mbEmptySentD) }))} />
          {items.length > 1 ? <span aria-hidden="true" style={{ display: "block", textAlign: "center", marginTop: "10px", fontSize: "11.5px", color: "#5E6670" }}>{I(T.mbBrowse)}</span> : null}
        </div>
      </div>
    </div>
    {/* a letter, opened from the stack (over the whole screen, outside its scroll) */}
    {reading ? <OpenLetter key={reading.key} c={reading} from={opened ? opened.rect : null} onClose={shut} mine={mine} onWriteBack={mine ? null : sampleOn ? () => v.mbSampleWriteBack?.(reading) : v.mbReading?.writeBack || null} t={T} sample={sampleOn && !mine} freshSheet={sampleOn && !mine} /> : null}
    {/* a letter on its way, tapped: where it's coming from (or going), and when it lands — nothing of what it says */}
    {way ? (
      <div onClick={() => setWay(null)} style={{ position: "fixed", inset: "0", zIndex: 80, background: "rgba(20,24,34,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", animation: "cp-fade .2s ease" }}>
        <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "320px", boxSizing: "border-box", padding: "22px 20px 18px", borderRadius: "16px", background: "#FFFCF4", boxShadow: "0 20px 50px rgba(20,24,34,.25)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "cp-rise2 .3s cubic-bezier(.2,.8,.2,1) both" }}>
          <img src="./assets/map/bird-letter-still.webp" alt="" aria-hidden="true" style={{ width: "64px", transform: "scaleX(-1)" }} />
          <span style={{ marginTop: "10px", fontWeight: 700, fontSize: "16px", lineHeight: "22px", color: INK }}>{I(way.flag)}{" "}{I(way.text)}</span>
          {way.eta ? <span style={{ marginTop: "6px", fontSize: "13.5px", lineHeight: "20px", color: "#8A5A2B", fontWeight: 600 }}>{I(way.eta)}</span> : null}
          {way.sent ? null : <span style={{ marginTop: "4px", fontSize: "12.5px", lineHeight: "18px", color: "#5E6670" }}>{I(T.mbNoBodyYet)}</span>}
          <div role="button" tabIndex={0} onClick={() => setWay(null)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWay(null); } }}
            style={{ marginTop: "14px", minWidth: "120px", height: "44px", padding: "0 22px", borderRadius: "22px", background: INK, color: "#fff", fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{I(T.mbWayOk)}</div>
        </div>
      </div>
    ) : null}
    </>
  );
}
