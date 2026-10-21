// LETTERS (thread) — converted from the Claude Design prototype (Cat Pal v6.dc.html).
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
                {I(v.lPal?.city)}{" "}{I(v.lPal?.flag)}{" · "}{I(v.lPal?.dist)}{" · "}{I(v.t?.letterCount)}
              </span>
            </div>
          </div>
          <div ref={v.threadRef} style={{ position: "absolute", left: "0", right: "0", top: "112px", bottom: "262px", overflowY: "auto", padding: "10px 25px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px", scrollbarWidth: "none" }}>
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
          <div style={{ position: "absolute", left: "25px", right: "25px", bottom: "40px", height: "210px", background: "#F9F4EB", padding: "16px 18px", boxSizing: "border-box", boxShadow: "0 -2px 14px rgba(0,0,0,.06)", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", minHeight: "14px" }}>
              <span style={{ fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>
                {I(v.t?.toUpper)}
              </span>
              <div className="dc-hover-5" onClick={v.nextStamp} role="button" aria-label="stamp" title={v.t?.tapStamp} style={css(`position:absolute;right:-4px;top:-6px;width:30px;height:40px;background:url(${R(v.draftStamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18));cursor:pointer;transition:transform .15s ease`)} />
            </div>
            <textarea value={v.draft ?? ""} onChange={v.setDraft} placeholder={v.t?.draftHint} maxLength={500} style={{ flex: "1", marginTop: "6px", border: "none", outline: "none", background: "transparent", resize: "none", fontWeight: "500", fontSize: "16px", lineHeight: "23px", color: "#22304A", padding: "0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              {v.noDraftPhoto ? (
                <>
                  <div className="dc-hover-9" onClick={v.pickReplyPhoto} style={{ flex: "none", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#fff", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", transition: "background .15s ease", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>
                    <span style={{ fontSize: "var(--fs-caption)" }}>
                      📷
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "var(--fs-caption-sm)", whiteSpace: "nowrap" }}>
                      {I(v.t?.photoShort)}
                    </span>
                  </div>
                </>
              ) : null}
              {v.hasDraftPhoto ? (
                <>
                  <div style={css(`flex:none;position:relative;width:52px;height:52px;background:url(${R(v.draftPhoto)}) center / cover no-repeat;box-shadow:0 0 0 3px #FEFEFE,0 1px 3px #cecece`)}>
                    <div onClick={v.clearReplyPhoto} role="button" aria-label="remove photo" style={{ position: "absolute", right: "-8px", top: "-8px", width: "20px", height: "20px", borderRadius: "50%", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <span style={{ fontSize: "11px", lineHeight: "1", color: "#fff" }}>
                        ✕
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
              {v.hasDraftPhoto ? (
                <div onClick={v.toggleDraftPublic} role="switch" aria-checked={!!v.draftPublic} title={v.t?.xShareHint}
                  style={css(`flex:none;height:34px;padding:0 10px 0 6px;border-radius:17px;display:flex;align-items:center;gap:6px;cursor:pointer;background:${v.draftPublic ? "#22304A" : "#fff"};box-shadow:0 1px 2px rgba(0,0,0,.06);transition:background .15s ease`)}>
                  <span style={css(`width:26px;height:16px;border-radius:8px;position:relative;background:${v.draftPublic ? "#E5483D" : "#D9D3C8"};transition:background .15s ease`)}>
                    <span style={css(`position:absolute;top:2px;left:${v.draftPublic ? "12px" : "2px"};width:12px;height:12px;border-radius:6px;background:#fff;transition:left .15s ease`)} />
                  </span>
                  <span style={css(`font-weight:700;font-size:11.5px;white-space:nowrap;color:${v.draftPublic ? "#fff" : "#4A443D"}`)}>{"🌍 "}{I(v.t?.xShare)}</span>
                </div>
              ) : null}
              {v.sendErr ? (
                <span style={{ flex: "1", minWidth: "0", fontWeight: "500", fontSize: "11px", lineHeight: "15px", color: "#FF4800" }}>{I(v.sendErr)}</span>
              ) : null}
              <div className="dc-hover-4" onClick={v.sendLetter} style={css(`flex:none;height:48px;padding:0 22px;border-radius:26px;background:${R(v.sendBg)};display:flex;align-items:center;gap:8px;cursor:pointer;transition:transform .15s ease,background .15s ease`)}>
                <span style={{ fontFamily: "var(--font-body)", fontWeight: "700", fontSize: "var(--fs-caption)", color: "#fff", whiteSpace: "nowrap" }}>
                  {I(v.t?.reply)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
