// HOME — random feed of real cat moments (one per person, shuffled), Like and
// "Send a Cat Letter". Cards reuse the design's envelope / polaroid language.
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const sectionTitle = { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", lineHeight: "24px", letterSpacing: "var(--ls-heading)" } as const;
const muted = { fontWeight: 500, fontSize: "12px", lineHeight: "18px", color: "#a89f8d" } as const;
const dashed = { border: "2px dashed #E7E2D8", borderRadius: "14px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "26px 20px", textAlign: "center" } as const;

export function LikeButton({ c, size = 40 }: { c: any; size?: number }) {
  return (
    <div className="dc-hover-4" onClick={c.like} role="button" aria-pressed={c.liked} aria-label={c.likeLabel} style={{ position: "relative", flex: "none", height: size + "px", minWidth: size + 18 + "px", padding: "0 14px", borderRadius: size / 2 + "px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", transition: "transform .15s ease", boxSizing: "border-box" }}>
      <span style={{ display: "inline-block", fontSize: "var(--fs-body)", lineHeight: "1", color: c.liked ? "#FF4800" : "#22304A", animation: c.heartAnim }}>{c.liked ? "♥" : "♡"}</span>
      <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption-sm)" }}>{I(c.likes)}</span>
      {each(c.burst, (b: any) => (
        <span key={b.key} style={{ position: "absolute", left: "18px", top: "8px", fontSize: "var(--fs-body)", color: "#FF4800", pointerEvents: "none", animation: b.anim }}>♥</span>
      ))}
    </div>
  );
}

export function MomentCardView({ c, t }: { c: any; t: any }) {
  return (
    <div style={css(`position:relative;background:#F9F4EB;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.08);padding:16px 16px 16px;transform:rotate(${R(c.rot)}deg);animation:cp-fadeup .35s ease both`)}>
      {/* envelope header: sender + stamp + postmark of their country */}
      <div style={{ position: "relative", height: "52px" }}>
        <div style={{ position: "absolute", left: "0", top: "2px", right: "120px", display: "flex", flexDirection: "column", minWidth: "0" }}>
          <span style={{ fontWeight: 700, fontSize: "var(--fs-body)", lineHeight: "22px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(c.whoFlag)}{" "}{I(c.who)}</span>
          <span style={{ ...muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(c.whoCountry)}</span>
        </div>
        <div style={css(`position:absolute;right:0;top:-4px;width:36px;height:48px;background:url(${R(c.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
        <div style={css(`position:absolute;right:26px;top:-6px;width:74px;height:54px;background:url(${R(c.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.92;transform:rotate(-8deg)`)} />
      </div>
      {/* polaroid */}
      <div style={{ marginTop: "8px", background: "#fff", padding: "6px", boxShadow: "0 2px 4px #cecece" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", background: "#EFE9DD", overflow: "hidden" }}>
          <img src={c.photo} alt={c.caption} loading="lazy" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", left: "8px", top: "8px", padding: "3px 9px", borderRadius: "10px", background: "rgba(255,255,255,.92)", fontWeight: 700, fontSize: "11px", lineHeight: "16px" }}>{I(c.cat)}</span>
        </div>
      </div>
      <span style={{ display: "block", marginTop: "12px", fontWeight: 500, fontSize: "var(--fs-body)", lineHeight: "23px", textWrap: "pretty", overflowWrap: "anywhere" }}>{I(c.caption)}</span>
      {c.hasCatName || c.hasWhere ? (
        <span style={{ display: "block", marginTop: "2px", ...muted }}>
          {c.hasCatName ? <>{"🐈 "}{I(c.catName)}</> : null}
          {c.hasCatName && c.hasWhere ? " · " : null}
          {c.hasWhere ? <>{"📍 "}{I(c.where)}</> : null}
        </span>
      ) : null}
      <div style={{ marginTop: "14px", display: "flex", gap: "10px", alignItems: "center" }}>
        <LikeButton c={c} />
        {c.canLetter ? (
          <div className="dc-hover-8" onClick={c.letter} role="button" style={{ flex: "1", height: "40px", borderRadius: "20px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption-sm)", color: "#fff", whiteSpace: "nowrap" }}>{I(t?.sendLetter)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FeedScreen({ v }: { v: Vals }) {
  if (!v.sFeed) return null;
  return (
    <div data-screen-label="Home" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fade .25s ease", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
      <div style={{ padding: "58px 25px 120px", display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "29px", whiteSpace: "pre-line", textWrap: "pretty", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>{I(v.t?.feedTitle)}</span>
        <div className="dc-hover-0" onClick={v.openShare} role="button" style={{ marginTop: "16px", height: "56px", borderRadius: "15px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" }}>{I(v.t?.shareMoment)}</span>
        </div>

        {v.hasTop ? (
          <>
            <span style={{ marginTop: "28px", ...sectionTitle }}>{I(v.t?.topCats)}</span>
            <div style={{ margin: "10px -25px 0", padding: "4px 25px 12px", display: "flex", gap: "14px", overflowX: "auto", scrollSnapType: "x mandatory", scrollPadding: "0 25px", scrollbarWidth: "none" }}>
              {each(v.topCards, (c: any, i: number) => (
                <div key={c.id} className="dc-hover-2" onClick={c.canLetter ? c.letter : undefined} style={{ flex: "none", width: "118px", display: "flex", flexDirection: "column", gap: "6px", cursor: c.canLetter ? "pointer" : "default", transition: "transform .15s ease", scrollSnapAlign: "start" }}>
                  <div style={css(`position:relative;height:138px;background:#fff;padding:5px;box-sizing:border-box;box-shadow:0 2px 4px #cecece;transform:rotate(${i % 2 ? 2 : -2}deg)`)}>
                    <img src={c.photo} alt={c.caption} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", left: "-6px", top: "-6px", width: "24px", height: "24px", borderRadius: "12px", background: "#22304A", color: "#fff", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "12px", lineHeight: "17px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{I(c.whoFlag)}{" "}{I(c.catName || c.who)}</span>
                  <span style={{ marginTop: "-6px", ...muted, fontSize: "11px" }}>{"♥ "}{I(c.likes)}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <span style={{ marginTop: v.hasTop ? "14px" : "28px", ...sectionTitle }}>{I(v.t?.aroundWorld)}</span>
        {v.feedLoading ? (
          <div style={{ marginTop: "18px", height: "140px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <img src="./assets/cat-run.gif" alt="" style={{ width: "72px", height: "32px", objectFit: "contain", animation: "cp-float 1.4s ease-in-out infinite" }} />
            <span style={{ ...muted, animation: "cp-pulse 1.4s ease infinite" }}>{I(v.t?.findingCats)}</span>
          </div>
        ) : null}
        {v.feedError ? (
          <div style={{ marginTop: "12px", ...dashed }}>
            <span style={{ ...muted, color: "#746e63" }}>{I(v.feedError)}</span>
            <span onClick={v.moreCats} role="button" style={{ fontWeight: 700, fontSize: "var(--fs-caption-sm)", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(v.t?.retry)}</span>
          </div>
        ) : null}
        {v.feedEmpty ? (
          <div style={{ marginTop: "12px", ...dashed }}>
            <span style={{ ...muted, whiteSpace: "pre-line" }}>{I(v.feedEmptyText)}</span>
          </div>
        ) : null}
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "26px" }}>
          {each(v.feedCards, (c: any) => <MomentCardView key={c.id} c={c} t={v.t} />)}
        </div>
        {v.feedCards?.length ? (
          <div className="dc-hover-10" onClick={v.moreCats} role="button" style={{ marginTop: "28px", height: "48px", borderRadius: "15px", border: "1.5px solid #22304A", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption)" }}>{"🔀 "}{I(v.t?.moreCats)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
