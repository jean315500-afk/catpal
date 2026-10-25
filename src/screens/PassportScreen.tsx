// PASSPORT — your cat's papers: a file folder on top, its passport's stamp page below.
//   the folder:   an index divider of oat card stock (its tab in brick-red ink, a blue sheet tucked behind), holding your
//                 cat's photo (clipped on), its name and country, and three numbers — countries, CatPals, stamps
//   the passport: its visa page (an image) — under ENTRIES / DEPARTURES, that country's postmark (the app's own
//                 stamp images) stamped on for each country a CatPal has written to you from, with the date and their
//                 name; under OFFICIAL VISAS, the countries still to come, faint in dashed rings
// "?ppSample=1" (or the Map's / Mailbox's sample) shows sample stamps, labelled as such.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = "#22304A";
/** the folder's card stock (the Mailbox's oat) and the sheet behind it (its blue) */
const FOLDER = "#E4D8BF", BACK = "#B9C5CB";

/** a little scatter, the same every time: [dx, dy] */
const jitter = (cc: string, i: number) => [((cc.charCodeAt(0) * 13 + i * 7) % 15) - 7, ((cc.charCodeAt(1) * 11 + i * 5) % 13) - 6];
/** "2026. 10. 25. · LÉA": under a stamp, when (the app's one date form) and from whom */
const note = (s: any) => (s.stampDate || "") + (s.from ? " · " + s.from.toUpperCase() : "");

function Folder({ v }: { v: Vals }) {
  const c = v.ppCat || {}, T = v.ppT || {};
  return (
    <div style={{ position: "relative", marginTop: "18px" }}>
      {/* a sheet tucked in behind, its own tab peeking out */}
      <div aria-hidden="true" className="cp-pp-back" style={{ ["--paper" as string]: BACK }}><i /></div>
      <div className="cp-mb-tabs">
        <div className="cp-mb-tab on" style={{ ["--paper" as string]: FOLDER, flex: "none", padding: "0 26px", cursor: "default" }}>{I(T.ppFile)}</div>
      </div>
      <div className="cp-mb-panel" style={{ ["--paper" as string]: FOLDER, minHeight: "0", padding: "18px 16px 16px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {/* the photo, clipped on */}
          <div className="cp-pp-photo">
            <svg className="cp-pp-clip" viewBox="0 0 20 48" width="16" height="40" aria-hidden="true"><path d="M7 32 V9 a4.5 4.5 0 0 1 9 0 V35 a7 7 0 0 1 -14 0 V13" fill="none" stroke="#8D96A1" strokeWidth="2.2" strokeLinecap="round" /></svg>
            {c.photo ? <img src={c.photo} alt="" draggable={false} /> : <span style={{ fontSize: "34px" }}>🐈</span>}
          </div>
          <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px", paddingTop: "2px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="cp-pp-label">{I(T.ppName)}</span>
              <span className="cp-pp-value" style={{ fontSize: "20px", lineHeight: "24px" }}>{I(c.name)}</span>
            </div>
            {c.country ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="cp-pp-label">{I(T.ppIssued)}</span>
                <span className="cp-pp-value">{I(c.flag)}{" "}{I(c.country)}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="cp-pp-stats">
          {each(v.ppCounts, (s: any) => {
            /* Countries goes down to the passport page (where they're stamped); CatPals opens the list of them (a small › says so) */
            const go = s?.toPage ? () => document.getElementById("cp-pp-visa")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }) : s?.open;
            return (
            <div onClick={go || undefined} role={go ? "button" : undefined} className={go ? "dc-hover-2" : undefined} style={go ? { cursor: "pointer" } : undefined}>
              <b className="cp-pp-num">{I(s?.n)}</b>
              <span className="cp-pp-lab">{I(s?.l)}{go ? <span aria-hidden="true" style={{ marginLeft: "3px" }}>{s?.toPage ? "⌄" : "›"}</span> : null}</span>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** the header's emblem: a paw in a fine double ring, like the little mark printed on a passport */
const EMBLEM = (
  <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true" style={{ flex: "none" }}>
    <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1" />
    <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth=".6" strokeDasharray="1 1.2" />
    <g fill="currentColor"><ellipse cx="10" cy="11.9" rx="2.3" ry="1.9" /><circle cx="7.3" cy="9" r=".95" /><circle cx="9" cy="7.6" r=".95" /><circle cx="11" cy="7.6" r=".95" /><circle cx="12.7" cy="9" r=".95" /></g>
  </svg>
);

/** the passport's visa page (an image: the binding, the iridescent security print, "VISAS", the two sections
 *  "ENTRIES / DEPARTURES" and "OFFICIAL VISAS" up the side); where things go on it, as fractions of it */
const VISA = { src: "./assets/passport-visa.webp", ratio: "900 / 1060", x0: 0.2, x1: 0.93, entries: [0.13, 0.5], visas: [0.555, 0.8] };

function PassportPage({ v }: { v: Vals }) {
  const T = v.ppT || {}, stamps: any[] = v.ppStamps || [];
  const got = stamps.filter((s) => s.got), rest = stamps.filter((s) => !s.got);
  // the more there are, the smaller each goes, so they all fit their section
  const sw = got.length <= 2 ? 38 : got.length <= 4 ? 31 : got.length <= 6 ? 27 : got.length <= 9 ? 23 : 20;
  const cols = rest.length <= 4 ? rest.length : rest.length <= 8 ? Math.ceil(rest.length / 2) : Math.ceil(rest.length / 3);
  const gw = Math.min(19, 86 / Math.max(1, cols));
  const area = (y: number[]) => ({ position: "absolute", left: VISA.x0 * 100 + "%", right: (1 - VISA.x1) * 100 + "%", top: y[0] * 100 + "%", bottom: (1 - y[1]) * 100 + "%",
    display: "flex", flexWrap: "wrap", alignItems: "center", alignContent: "center", justifyContent: "center" } as const);
  return (
    <div id="cp-pp-visa" className="cp-visa" style={{ aspectRatio: VISA.ratio, backgroundImage: `url(${VISA.src})`, scrollMarginTop: "24px" }}>
      <span className="cp-visa-count" style={{ left: VISA.x0 * 100 + "%", right: (1 - VISA.x1) * 100 + "%" }}>{I(v.ppCollected)}{" · "}{I(v.ppMarksText)}</span>
      {/* entries: the stamps collected, stamped on a little askew */}
      <div style={{ ...area(VISA.entries), gap: "4px 12px" }}>
        {got.length ? got.map((s, i) => {
          const [dx, dy] = jitter(s.cc, i);
          return (
            <div key={s.cc} className={"cp-ppb-stamp" + (s.open ? " dc-hover-2" : "")} onClick={s.open || undefined} role={s.open ? "button" : undefined}
              aria-label={s.name + " · " + s.from} style={{ width: sw + "%", ["--r" as string]: s.rot + "deg", ["--d" as string]: i * 90 + "ms", margin: `${dy / 2}px ${dx / 2}px` }}>
              {/* only its postmark, inked onto the page (no postage stamp) */}
              <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "1.3" }}>
                <img src={s.img} alt="" draggable={false} className="cp-ppb-ink" style={{ position: "absolute", left: "8%", top: "4%", width: "84%" }} />
              </span>
              <span className="cp-ppb-note">{note(s)}</span>
            </div>
          );
        }) : <span className="cp-visa-empty">{I(T.ppEmptyPage)}</span>}
      </div>
      {/* official visas: the countries still to come, faint */}
      <div style={{ ...area(VISA.visas), gap: "6px" }}>
        {rest.map((s) => (
          <div key={s.cc} className="cp-ppb-ghost" aria-label={s.name + ", " + T.ppNotYet} style={{ width: gw + "%" }}>
            <img src={s.img} alt="" draggable={false} />
            <span>{s.en}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** a country opened from the passport: its postmark, the letters shared, its cat pals */
function CountrySheet({ v }: { v: Vals }) {
  const c = v.ppSheet, T = v.ppT || {};
  if (!c) return null;
  return (
    <>
      <div onClick={c.close} style={{ position: "absolute", inset: "0", zIndex: 70, background: "rgba(20,15,10,.28)", animation: "cp-fade .2s ease" }} />
      <div role="dialog" aria-label={c.name} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 71, padding: "12px 20px 30px", borderRadius: "26px 26px 0 0", background: "#FBF7EE", boxShadow: "0 -8px 30px rgba(40,30,20,.14)", animation: "cp-sheet .3s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ position: "relative", flex: "none", width: "92px", height: "70px" }}>
            <img src={c.img} alt="" style={{ position: "absolute", left: "8px", top: "-2px", width: "76px", mixBlendMode: "multiply", opacity: 0.9, transform: "rotate(-9deg)" }} />
          </span>
          <div style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "20px", lineHeight: "24px", color: INK }}>{I(c.flag)}{" "}{I(c.name)}</span>
            <span style={{ fontWeight: 500, fontSize: "12.5px", color: "#5E6670" }}>{I(c.stampLine)}</span>
            <span style={{ fontWeight: 500, fontSize: "12.5px", color: c.mark ? "#5E6670" : "#C9785D" }}>{I(c.markLine)}</span>
            <span style={{ fontWeight: 500, fontSize: "12.5px", color: "#5E6670" }}>{I(c.lettersText)}</span>
          </div>
        </div>
        {c.pals?.length ? (
          <>
            <span style={{ display: "block", marginTop: "18px", fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase", color: "#7A8091" }}>{I(T.ppPalsHead)}</span>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {c.pals.map((p: any) => (
                <div key={p.name} className={p.open ? "dc-hover-2" : undefined} onClick={p.open || undefined} role={p.open ? "button" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px 8px 8px", borderRadius: "14px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)", cursor: p.open ? "pointer" : "default" }}>
                  <span style={{ flex: "none", width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "#EFE7DB" }}>{p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}</span>
                  <span style={{ flex: "1", minWidth: "0", fontWeight: 700, fontSize: "15px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}</span>
                  <span style={{ flex: "none", fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(p.lettersText)}</span>
                  {p.open ? <span aria-hidden="true" style={{ color: "#C6BBA8" }}>›</span> : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/** my cat pals (from the folder's CatPals): each one — their cat, where, the letters you've shared — and a letter to them */
function PalsSheet({ v }: { v: Vals }) {
  const L = v.ppPalList;
  if (!L) return null;
  return (
    <>
      <div onClick={L.close} style={{ position: "absolute", inset: "0", zIndex: 70, background: "rgba(20,15,10,.28)", animation: "cp-fade .2s ease" }} />
      <div role="dialog" aria-label={L.title} style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: 71, maxHeight: "78%", overflowY: "auto", padding: "12px 18px 30px", borderRadius: "26px 26px 0 0", background: "#FBF7EE", boxShadow: "0 -8px 30px rgba(40,30,20,.14)", animation: "cp-sheet .3s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", margin: "0 auto 12px" }} />
        <span className="cp-pp-hand" style={{ display: "block", fontSize: "24px", paddingLeft: "4px" }}>{I(L.title)}</span>
        {L.sampleNote ? <span style={{ display: "block", marginTop: "2px", paddingLeft: "4px", fontWeight: 500, fontSize: "11.5px", color: "#C9785D" }}>{I(L.sampleNote)}</span> : null}
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {L.pals.map((p: any) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 8px 8px 8px", borderRadius: "16px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)" }}>
              <div onClick={p.open || undefined} role={p.open ? "button" : undefined} style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "12px", cursor: p.open ? "pointer" : "default" }}>
                <span style={{ position: "relative", flex: "none", width: "44px", height: "44px" }}>
                  <span style={{ position: "absolute", inset: "0", borderRadius: "50%", overflow: "hidden", background: "#EFE7DB", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(34,48,74,.16)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                    {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : "🐈"}
                  </span>
                  <span aria-hidden="true" style={{ position: "absolute", right: "-4px", bottom: "-2px", width: "18px", height: "18px", borderRadius: "9px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", lineHeight: "1" }}>{p.flag}</span>
                </span>
                <span style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <b style={{ fontSize: "15px", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.name)}</b>
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(p.country)}{" · "}{I(p.nText)}</span>
                </span>
              </div>
              {/* a letter to them, right here (the usual letter paper, to them) */}
              <span onClick={p.write} role="button" className="dc-hover-8" style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#22304A", boxShadow: "0 4px 10px rgba(34,48,74,.2)", cursor: "pointer", transition: "transform .15s ease" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="1.6" /><path d="m4.4 7.2 7.6 5.6 7.6-5.6" /></svg>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#fff", whiteSpace: "nowrap" }}>{I(L.send)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function PassportScreen({ v }: { v: Vals }) {
  if (!v.sPassport) return null;
  const T = v.ppT || {};
  return (
    <>
    <div data-screen-label="Passport" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto", padding: "52px 18px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {/* the header, as printed in a passport: a small emblem, the title, the passport number */}
        <div style={{ paddingLeft: "4px", display: "flex", flexDirection: "column" }}>
          <span className="cp-pph-emblem">{EMBLEM}{I(T.ppEmblem)}</span>
          <span style={{ marginTop: "10px", fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "30px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)", color: INK }}>{I(T.ppTitle)}</span>
          {/* the number: the profile's own, once it has one; until then not issued (dots); the sample's is marked */}
          <span className="cp-pph-no">{I(T.ppNoLabel)}{" "}<b>{v.ppNo ? I(v.ppNo) : "CP—····"}</b>{v.ppSample ? " · SAMPLE" : ""}</span>
        </div>
        <Folder v={v} />
        <div style={{ marginTop: "26px" }}><PassportPage v={v} /></div>
      </div>
    </div>
    <CountrySheet v={v} />
    <PalsSheet v={v} />
    </>
  );
}
