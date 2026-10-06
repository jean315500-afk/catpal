// 06 SEND — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function SendScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sSend ? (
      <>
        <div data-screen-label="06 Send" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "46px", top: "220px", width: "310px", height: "200px", background: "#F9F4EB", boxShadow: "0 3px 12px rgba(0,0,0,.07)" }}>
            <span style={{ position: "absolute", left: "20px", top: "20px", fontFamily: "Inter,sans-serif", fontSize: "12px", whiteSpace: "nowrap" }}>
              {"To. "}{I(v.t?.toShort)}
            </span>
            <div style={css(`position:absolute;left:228px;top:14px;width:58px;height:78px;background:url(${R(v.stampMotif)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
            <div style={css(`position:absolute;left:140px;top:10px;width:118px;height:86px;background:url(${R(v.myPm)}) center / contain no-repeat;mix-blend-mode:multiply;animation:cp-postmark .55s cubic-bezier(.3,1.4,.5,1) .35s both`)} />
            <span style={{ position: "absolute", right: "16px", bottom: "12px", fontWeight: "500", fontSize: "12px", lineHeight: "23px" }}>
              {I(v.t?.fromLine)}
            </span>
          </div>
          <span style={{ position: "absolute", left: "44px", top: "506px", fontWeight: "500", fontSize: "14px", lineHeight: "24px" }}>
            {I(v.t?.pickStamp)}
          </span>
          <div style={{ position: "absolute", left: "0", right: "0", top: "534px", display: "flex", gap: "12px", overflowX: "auto", padding: "6px 40px 10px", boxSizing: "border-box", scrollbarWidth: "none" }}>
            {each(v.stamps, (st) => (
              <>
                <div className="dc-hover-5" onClick={st?.pick} role="img" aria-label="stamp" style={css(`flex:none;width:52px;height:70px;background:url(${R(st?.m)}) center / contain no-repeat;outline:${R(st?.border)};outline-offset:2px;border-radius:2px;cursor:pointer;transition:transform .15s ease;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
              </>
            ))}
          </div>
          <div className="dc-hover-4" onClick={v.sendNow} style={{ position: "absolute", left: "124px", top: "665px", width: "153px", height: "61px", borderRadius: "32px", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", cursor: "pointer", transition: "transform .15s ease" }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", color: "#fff" }}>
              {I(v.t?.send)}
            </span>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
