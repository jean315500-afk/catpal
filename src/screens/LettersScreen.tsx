// LETTERS (thread) — converted from the Claude Design prototype (Cat Pal v6.dc.html). The letters with one cat pal;
// writing more is the usual letter paper (ComposeScreen, in reply), opened from the button at the bottom.
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function LettersScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sLetters ? (
      <>
        <div data-screen-label="Letters" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "60px", right: "20px", top: "52px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "28px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>
                {I(v.t?.lettersWith)}
              </span>
              <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#a89f8d" }}>
                {I(v.lPal?.city)}{" "}{I(v.lPal?.flag)}{v.lPal?.dist ? " · " : ""}{I(v.lPal?.dist)}{" · "}{I(v.t?.letterCount)}
              </span>
            </div>
          </div>
          <div ref={v.threadRef} style={{ position: "absolute", left: "0", right: "0", top: "112px", bottom: "150px", overflowY: "auto", padding: "10px 25px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px", scrollbarWidth: "none" }}>
            {v.lMoment ? (
              <div style={{ flex: "none", alignSelf: "center", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px 10px 10px", borderRadius: "14px", background: "#F6F6F6", maxWidth: "100%", boxSizing: "border-box" }}>
                <div style={css(`flex:none;width:44px;height:52px;background:url(${R(v.lMoment.photo)}) center / cover no-repeat;box-shadow:0 0 0 3px #FEFEFE,0 1px 3px #cecece;transform:rotate(-3deg)`)} />
                <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
                  <span style={{ fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>{I(v.t?.aboutMoment?.toUpperCase())}</span>
                  <span style={{ fontWeight: "500", fontSize: "var(--fs-caption-sm)", lineHeight: "19px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.lMoment.catName ? <>{"🐈 "}{I(v.lMoment.catName)}{" · "}</> : null}{I(v.lMoment.caption)}</span>
                </div>
              </div>
            ) : null}
            {each(v.thread, (l) => (
              <>
                {l?.them ? (
                  <>
                    <div style={{ flex: "none", alignSelf: "flex-start", position: "relative", width: "270px", minHeight: "92px", background: "#F9F4EB", padding: "14px 62px 14px 16px", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,.07)", transform: "rotate(-1deg)", animation: "cp-pop .45s cubic-bezier(.34,1.56,.64,1) both" }}>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>
                        {I(l?.who)}
                      </span>
                      {l?.hasPhoto ? (
                        <>
                          <div style={css(`margin-top:8px;height:150px;background:#EFE9DD url(${R(l?.photo)}) center / cover no-repeat;box-shadow:0 0 0 4px #FEFEFE,0 1px 3px #cecece`)} />
                        </>
                      ) : null}
                      <span style={{ display: "block", marginTop: "6px", fontWeight: "500", fontSize: "var(--fs-body)", lineHeight: "23px", textWrap: "pretty" }}>
                        {I(l?.text)}
                      </span>
                      <div style={css(`position:absolute;right:10px;top:10px;width:36px;height:49px;background:url(${R(l?.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))`)} />
                    </div>
                  </>
                ) : null}
                {l?.you ? (
                  <>
                    <div style={{ flex: "none", alignSelf: "flex-end", position: "relative", width: "270px", minHeight: "92px", background: "#fff", border: "1.5px solid #22304A", padding: "14px 62px 14px 16px", boxSizing: "border-box", transform: "rotate(1deg)", animation: "cp-fadeup .35s ease both" }}>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>
                        {I(l?.who)}
                      </span>
                      {l?.hasPhoto ? (
                        <>
                          <div style={css(`margin-top:8px;height:150px;background:#EFE9DD url(${R(l?.photo)}) center / cover no-repeat;box-shadow:0 0 0 4px #FEFEFE,0 1px 3px #cecece`)} />
                        </>
                      ) : null}
                      <span style={{ display: "block", marginTop: "6px", fontWeight: "500", fontSize: "var(--fs-body)", lineHeight: "23px", textWrap: "pretty" }}>
                        {I(l?.text)}
                      </span>
                      <div style={css(`position:absolute;right:10px;top:10px;width:36px;height:49px;background:url(${R(l?.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))`)} />
                    </div>
                  </>
                ) : null}
              </>
            ))}
            {v.inTransit ? (
              <>
                <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "16px", background: "#F6F6F6", animation: "cp-fade .25s ease" }}>
                  {/* the running cat carries the letter */}
                  <img src="./assets/cat-run.gif" alt="" style={{ width: "42px", height: "20px", objectFit: "contain", animation: "cp-float .6s ease-in-out infinite" }} />
                  <span style={{ fontWeight: "500", fontSize: "12px", color: "#746e63", animation: "cp-pulse 1.4s ease infinite" }}>
                    {I(v.t?.transit)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
          {/* writing here is the usual letter paper (the same as the first letter): one button to it */}
          {v.lWrite ? (
            <div style={{ position: "absolute", left: "25px", right: "25px", bottom: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div className="dc-hover-8" onClick={v.lWrite.go} role="button" style={{ width: "100%", maxWidth: "340px", height: "54px", borderRadius: "27px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", boxShadow: "0 10px 22px rgba(34,48,74,.2)", transition: "transform .15s ease" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 18.5c1.2-3.6 4-6.4 9.5-6.6V8.5L20 13l-6 4.6v-3.3c-3.9 0-6.9 1.3-9.5 4.2z" /></svg>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff", whiteSpace: "nowrap" }}>{I(v.lWrite.label)}</span>
              </div>
              <span style={{ fontWeight: 500, fontSize: "12px", color: "#7A8091" }}>{I(v.lWrite.sub)}</span>
            </div>
          ) : null}
        </div>
      </>
    ) : null}
    </>
  );
}
