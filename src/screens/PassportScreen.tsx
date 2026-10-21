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

const pad = (n: number) => String(n).padStart(2, "0");
/** a little scatter, the same every time: [dx, dy] */
const jitter = (cc: string, i: number) => [((cc.charCodeAt(0) * 13 + i * 7) % 15) - 7, ((cc.charCodeAt(1) * 11 + i * 5) % 13) - 6];
/** "20.10.26 · LÉA": under a stamp, when and from whom */
const note = (s: any) => { const d = new Date(s.iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}` + (s.from ? " · " + s.from.toUpperCase() : ""); };

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
          {each(v.ppCounts, (s: any) => (
            <div>
              <b className="cp-pp-num">{I(s?.n)}</b>
              <span className="cp-pp-lab">{I(s?.l)}</span>
            </div>
          ))}
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
    <div className="cp-visa" style={{ aspectRatio: VISA.ratio, backgroundImage: `url(${VISA.src})` }}>
      <span className="cp-visa-count" style={{ left: VISA.x0 * 100 + "%", right: (1 - VISA.x1) * 100 + "%" }}>{I(v.ppCollected)}</span>
      {/* entries: the stamps collected, stamped on a little askew */}
      <div style={{ ...area(VISA.entries), gap: "4px 12px" }}>
        {got.length ? got.map((s, i) => {
          const [dx, dy] = jitter(s.cc, i);
          return (
            <div key={s.cc} className={"cp-ppb-stamp" + (s.open ? " dc-hover-2" : "")} onClick={s.open || undefined} role={s.open ? "button" : undefined}
              aria-label={s.name + " · " + s.from} style={{ width: sw + "%", ["--r" as string]: s.rot + "deg", ["--d" as string]: i * 90 + "ms", margin: `${dy / 2}px ${dx / 2}px` }}>
              <img src={s.img} alt="" draggable={false} className="cp-ppb-ink" />
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

export default function PassportScreen({ v }: { v: Vals }) {
  if (!v.sPassport) return null;
  const T = v.ppT || {};
  return (
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
  );
}
