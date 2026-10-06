// SEND-TO SHEET — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function SendToSheet({ v }: { v: Vals }) {
  return (
    <>
    {v.sheetTo ? (
      <>
        <div onClick={v.closeSheet} style={{ position: "absolute", inset: "0", background: "rgba(1,0,2,.35)", zIndex: "70", animation: "cp-fade .2s ease" }} />
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", maxHeight: "700px", overflowY: "auto", zIndex: "71", background: "#fff", borderRadius: "22px 22px 0 0", padding: "14px 22px 34px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "14px", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)", scrollbarWidth: "none" }}>
          <div style={{ alignSelf: "center", width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: "700", fontSize: "18px", lineHeight: "26px" }}>
              {I(v.t?.whoTo)}
            </span>
            {v.lockHint ? (
              <>
                <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#FF4800" }}>
                  {"🔒 "}{I(v.t?.lockHint)}
                </span>
              </>
            ) : null}
          </div>
          <div className="dc-hover-2" onClick={v.chooseSurprise} style={{ position: "relative", height: "96px", borderRadius: "16px", background: "#010002", padding: "18px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", cursor: "pointer", transition: "transform .15s ease", overflow: "hidden" }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "17px", color: "#fff" }}>
              {I(v.t?.surprise)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "12.5px", lineHeight: "18px", color: "rgba(255,255,255,.75)", maxWidth: "220px" }}>
              {I(v.t?.surpriseSub)}
            </span>
            <img src="./assets/icon-map-160.png" alt="" style={{ position: "absolute", right: "14px", top: "18px", width: "58px", height: "58px", objectFit: "contain", transform: "rotate(8deg)" }} />
          </div>
          <span style={{ marginTop: "4px", fontWeight: "700", fontSize: "13px", color: "#746e63" }}>
            {I(v.t?.yourPals)}
          </span>
          {each(v.palRows, (p) => (
            <>
              <div className="dc-hover-13" onClick={p?.choose} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "8px 6px", borderRadius: "12px", cursor: "pointer", transition: "background .15s ease" }}>
                <div style={{ flex: "none", width: "40px", height: "48px", boxShadow: "0 0 0 3px #FEFEFE,0 1px 3px #cecece", overflow: "hidden", transform: "rotate(-2deg)" }}>
                  <image-slot id={p?.slot} src={p?.img} shape="rect" placeholder="🐱" />
                </div>
                <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: "700", fontSize: "14px", lineHeight: "21px" }}>
                    {I(p?.name)}
                  </span>
                  <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#746e63" }}>
                    {I(p?.flag)}{" "}{I(p?.city)}{" · "}{I(p?.dist)}
                  </span>
                </div>
              </div>
            </>
          ))}
        </div>
      </>
    ) : null}
    </>
  );
}
