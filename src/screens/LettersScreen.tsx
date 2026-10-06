// LETTERS (thread) — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function LettersScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sLetters ? (
      <>
        <div data-screen-label="Letters" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "60px", right: "20px", top: "52px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
              <span style={{ fontWeight: "700", fontSize: "19px", lineHeight: "28px" }}>
                {I(v.t?.lettersWith)}
              </span>
              <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#a89f8d" }}>
                {I(v.lPal?.city)}{" "}{I(v.lPal?.flag)}{" · "}{I(v.lPal?.dist)}{" · "}{I(v.t?.letterCount)}
              </span>
            </div>
          </div>
          <div ref={v.threadRef} style={{ position: "absolute", left: "0", right: "0", top: "112px", bottom: "262px", overflowY: "auto", padding: "10px 25px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px", scrollbarWidth: "none" }}>
            {each(v.thread, (l) => (
              <>
                {l?.them ? (
                  <>
                    <div style={{ flex: "none", alignSelf: "flex-start", position: "relative", width: "270px", minHeight: "92px", background: "#F9F4EB", padding: "14px 62px 14px 16px", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,.07)", transform: "rotate(-1deg)", animation: "cp-pop .45s cubic-bezier(.34,1.56,.64,1) both" }}>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>
                        {I(l?.who)}
                      </span>
                      {" "}
                      <span style={{ display: "block", marginTop: "6px", fontWeight: "500", fontSize: "16px", lineHeight: "23px", textWrap: "pretty" }}>
                        {I(l?.text)}
                      </span>
                      <div style={css(`position:absolute;right:10px;top:10px;width:36px;height:49px;background:url(${R(l?.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))`)} />
                    </div>
                  </>
                ) : null}
                {l?.you ? (
                  <>
                    <div style={{ flex: "none", alignSelf: "flex-end", position: "relative", width: "270px", minHeight: "92px", background: "#fff", border: "1.5px solid #010002", padding: "14px 62px 14px 16px", boxSizing: "border-box", transform: "rotate(1deg)", animation: "cp-fadeup .35s ease both" }}>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>
                        {I(l?.who)}
                      </span>
                      {l?.hasPhoto ? (
                        <>
                          <div style={css(`margin-top:8px;height:150px;background:url(${R(l?.photo)}) center / cover no-repeat;box-shadow:0 0 0 4px #FEFEFE,0 1px 3px #cecece`)} />
                        </>
                      ) : null}
                      <span style={{ display: "block", marginTop: "6px", fontWeight: "500", fontSize: "16px", lineHeight: "23px", textWrap: "pretty" }}>
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
                  <span style={{ fontSize: "14px", animation: "cp-bob 1.2s ease infinite" }}>
                    ✈️
                  </span>
                  <span style={{ fontWeight: "500", fontSize: "12px", color: "#746e63", animation: "cp-pulse 1.4s ease infinite" }}>
                    {I(v.t?.transit)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
          <div style={{ position: "absolute", left: "25px", right: "25px", bottom: "40px", height: "210px", background: "#F9F4EB", padding: "16px 18px", boxSizing: "border-box", boxShadow: "0 -2px 14px rgba(0,0,0,.06)", display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", color: "#a89f8d" }}>
              {I(v.t?.toUpper)}
            </span>
            <textarea value={v.draft ?? ""} onChange={v.setDraft} placeholder={v.t?.draftHint} style={{ flex: "1", marginTop: "6px", border: "none", outline: "none", background: "transparent", resize: "none", fontWeight: "500", fontSize: "16px", lineHeight: "23px", color: "#010002", padding: "0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              {v.noDraftPhoto ? (
                <>
                  <div className="dc-hover-9" onClick={v.pickReplyPhoto} style={{ flex: "none", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#fff", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", transition: "background .15s ease", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>
                    <span style={{ fontSize: "14px" }}>
                      📷
                    </span>
                    <span style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>
                      {I(v.t?.photoShort)}
                    </span>
                  </div>
                </>
              ) : null}
              {v.hasDraftPhoto ? (
                <>
                  <div style={css(`flex:none;position:relative;width:52px;height:52px;background:url(${R(v.draftPhoto)}) center / cover no-repeat;box-shadow:0 0 0 3px #FEFEFE,0 1px 3px #cecece`)}>
                    <div onClick={v.clearReplyPhoto} role="button" aria-label="remove photo" style={{ position: "absolute", right: "-8px", top: "-8px", width: "20px", height: "20px", borderRadius: "50%", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <span style={{ fontSize: "11px", lineHeight: "1", color: "#fff" }}>
                        ✕
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
              <div className="dc-hover-4" onClick={v.sendLetter} style={css(`flex:none;height:48px;padding:0 22px;border-radius:26px;background:${R(v.sendBg)};display:flex;align-items:center;gap:8px;cursor:pointer;transition:transform .15s ease,background .15s ease`)}>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "14px", color: "#fff", whiteSpace: "nowrap" }}>
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
