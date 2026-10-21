// FEED — cat moments and public Cat Letters from around the world: word tabs (Popular / Recent / This week, the chosen
// one underlined by hand) over cards floating on the sky, each with the cat's profile and where it went (from → to).
// Popular = most hearts ever (ties → newest), Recent, This week = top 10 by likes in the last 7 days.
// All counts are real (explore_feed()); the map itself lives in the Cat Map tab.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = "#22304A", MUTED = "#8E8A84", RED = "#E5483D";

function Heart({ c, small = false }: { c: any; small?: boolean }) {
  return (
    <span onClick={(e) => { e.stopPropagation(); c.like(); }} role="button" aria-pressed={c.liked} aria-label="like"
      style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: "4px", padding: small ? "6px 2px 6px 8px" : "8px 4px 8px 10px", cursor: "pointer", fontWeight: 700, fontSize: small ? "12px" : "13px", color: c.liked ? RED : MUTED, userSelect: "none" }}>
      <span key={c.liked ? "on" : "off"} style={{ fontSize: small ? "15px" : "18px", lineHeight: "1", animation: c.liked ? "cp-rpopa .4s cubic-bezier(.34,1.56,.64,1)" : "none" }}>{c.liked ? "♥" : "♡"}</span>{I(c.likes)}
    </span>
  );
}

/** the profile row, like a little route: who → who (the sender's name, the receiver's), each with their country
 *  printed above, and under it how far it flew (letters) and when; the sender's cat on the left */
function Profile({ c, size = 40, time }: { c: any; size?: number; time?: string }) {
  const place = { fontWeight: 500, fontSize: "10.5px", lineHeight: "14px", color: "#7A8091", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: "0" } as const;
  const who = { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "15px", lineHeight: "19px", letterSpacing: "var(--ls-heading)", color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: "0" } as const;
  const sub = [c.kmText ? "✈ " + c.kmText : "", time || ""].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "0", flex: "1" }}>
      <img src={c.photo} alt="" loading="lazy" style={{ flex: "none", width: size + "px", height: size + "px", borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #fff", boxSizing: "border-box", boxShadow: "0 2px 6px rgba(34,48,74,.18)" }} />
      <div style={{ minWidth: "0", flex: "1", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", columnGap: "8px", alignItems: "end" }}>
        <span style={place}>{I(c.fromPlace)}</span>
        <span />
        <span style={place}>{I(c.toPlace)}</span>
        <span style={who}>{I(c.from)}</span>
        {/* the way it went */}
        <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden="true" style={{ alignSelf: "center" }}>
          <path d="M1.5 5H27" fill="none" stroke="#E5483D" strokeWidth="1.5" strokeDasharray="1.2 3" strokeLinecap="round" />
          <path d="M24 2 28 5 24 8" fill="none" stroke="#E5483D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ ...who, color: c.isLetter ? INK : "#5E6670" }}>{I(c.toName)}</span>
        {sub ? <span style={{ gridColumn: "1 / -1", marginTop: "2px", fontWeight: 500, fontSize: "11.5px", lineHeight: "15px", color: c.kmText ? "#C9785D" : MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(sub)}</span> : null}
      </div>
    </div>
  );
}


const CARD = { background: "#FFFEFA", borderRadius: "22px", boxShadow: "0 1px 2px rgba(34,48,74,.06), 0 12px 28px rgba(34,48,74,.10)" } as const;

export default function ExploreScreen({ v }: { v: Vals }) {
  if (!v.sExplore) return null;
  const list = v.exList || [], ranking = v.exSort === "ranking", sort = v.exSort || "top";
  const note = (text: any, action?: any) => (
    <div style={{ ...CARD, marginTop: "6px", padding: "34px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
      <span style={{ fontWeight: 500, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#5E6670", maxWidth: "260px" }}>{I(text)}</span>
      {action}
    </div>
  );
  const link = { fontWeight: 700, fontSize: "var(--fs-caption-sm)", color: INK, textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" } as const;
  return (
    <div data-screen-label="Explore" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto", padding: "52px 18px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <span style={{ paddingLeft: v.showBack ? "34px" : "4px", fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "30px", color: INK, fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>{I(v.t?.fTitle)}</span>

        {/* tabs: just words, the chosen one underlined by hand in red */}
        <div role="tablist" style={{ marginTop: "18px", display: "flex", gap: "22px", padding: "0 4px" }}>
          {each(v.exSorts, (b: any) => (
            <div role="tab" aria-selected={b.on} onClick={b.tap} style={{ position: "relative", padding: "4px 0 10px", cursor: "pointer" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", letterSpacing: "var(--ls-heading)", color: b.on ? INK : "#9AA1B0", transition: "color .2s ease" }}>{I(b.label)}</span>
              {b.on ? (
                <svg key={b.id} className="cp-fd-line" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: "-3px", right: "-3px", bottom: "0", width: "calc(100% + 6px)", height: "8px", overflow: "visible" }}>
                  <path d="M2 5.2C20 3.1 38 6.4 56 4.4S86 2.8 98 4.6" fill="none" stroke="#E5483D" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength="1" />
                </svg>
              ) : null}
            </div>
          ))}
        </div>

        <div key={sort} style={{ marginTop: "12px", animation: "cp-rise2 .35s cubic-bezier(.2,.8,.2,1) both" }}>
          {v.exState === "loading" ? (
            <div style={{ height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <img src="./assets/cat-run.gif" alt="" className="cp-cathop" style={{ width: "72px", height: "32px", objectFit: "contain" }} />
              <span style={{ fontWeight: 500, fontSize: "12.5px", color: "#5E6670", animation: "cp-pulse 1.4s ease infinite" }}>{I(v.t?.hWaiting)}</span>
            </div>
          ) : v.exState === "missing" || v.exState === "error" ? (
            note(v.exState === "missing" ? v.t?.xMissing : v.t?.offline, <span onClick={v.exRefresh} role="button" style={link}>{I(v.t?.retry)}</span>)
          ) : !list.length ? (
            note(ranking ? v.t?.xTopNone : v.t?.xEmpty, !ranking ? <span onClick={v.quickShare} role="button" style={link}>{I(v.t?.hSendCta)}</span> : null)
          ) : ranking ? (
            /* this week's top 10: rows with a rank, the profile (where it went), this week's hearts */
            <div style={{ ...CARD, padding: "6px 14px" }}>
              {each(list, (c: any, i: number) => (
                <div onClick={c.open || undefined} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderTop: i ? "1px dashed #E6E0D4" : "none", cursor: c.open ? "pointer" : "default", animation: `cp-rise2 .35s ease ${i * 0.04}s both` }}>
                  <span style={{ flex: "none", width: "26px", height: "26px", borderRadius: "13px", border: `1.5px solid ${i < 3 ? RED : "#C9CED8"}`, color: i < 3 ? RED : "#7A8091", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "13px" }}>{i + 1}</span>
                  <Profile c={c} size={44} />
                  <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                    <Heart c={c} small />
                    <span style={{ fontWeight: 500, fontSize: "10.5px", color: RED, marginTop: "-6px" }}>{I(c.weekText)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* the posts: a card each — the profile (where it went) on top, the cat, its words and hearts */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {each(list, (c: any, i: number) => (
                <article style={{ ...CARD, padding: "12px 12px 10px", animation: `cp-rise2 .4s cubic-bezier(.2,.8,.2,1) ${Math.min(i, 6) * 0.05}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0 2px 10px" }}>
                    <Profile c={c} time={c.time} />
                  </div>
                  <div onClick={c.open || undefined} role={c.open ? "button" : undefined} style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: "16px", overflow: "hidden", background: "#F2EEE7", cursor: c.open ? "pointer" : "default" }}>
                    <img src={c.photo} alt={c.message} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {c.isLetter ? <div style={{ position: "absolute", right: "12px", top: "12px", width: "38px", height: "51px", background: "url(./assets/stamp-1.png) center / contain no-repeat", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))", transform: "rotate(6deg)" }} /> : null}
                  </div>
                  <div style={{ marginTop: "10px", padding: "0 4px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span className="cp-letter cp-clamp3" style={{ flex: "1", minWidth: "0", fontSize: "17px", lineHeight: "22px", color: "#2F3B57", overflowWrap: "anywhere" }}>{I(c.message)}</span>
                    <Heart c={c} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
