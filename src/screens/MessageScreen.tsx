// 04b MESSAGE — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function MessageScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sMessage ? (
      <>
        <div data-screen-label="04b Message" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fadeup .3s ease" }}>
          <span style={{ position: "absolute", left: "60px", right: "60px", top: "56px", textAlign: "center", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "28px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>
            {I(v.t?.toLine)}
          </span>
          <div style={{ position: "absolute", left: "121px", top: "104px", width: "160px", height: "196px", boxShadow: "0 0 0 6px #FEFEFE,0 2px 6px #cecece", overflow: "hidden", transform: "rotate(-2deg)" }}>
            {v.hasPhoto ? (
              <>
                <div style={css(`width:100%;height:100%;background:url(${R(v.myPhoto)}) center / cover no-repeat`)} />
              </>
            ) : null}
            {v.noPhoto ? (
              <>
                <image-slot id="my-cat" shape="rect" placeholder="cat pic" />
              </>
            ) : null}
          </div>
          <div style={{ position: "absolute", left: "25px", right: "25px", top: "330px", height: "104px", background: "#F9F4EB", padding: "14px 16px 10px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <textarea value={v.msgVal ?? ""} onChange={v.setMsg} maxLength={120} placeholder={v.t?.msgPh} style={{ flex: "1", border: "none", outline: "none", background: "transparent", resize: "none", fontWeight: "500", fontSize: "16px", lineHeight: "23px", color: "#22304A", padding: "0" }} />
            <span style={{ alignSelf: "flex-end", fontWeight: "500", fontSize: "11px", color: "#a89f8d" }}>
              {I(v.msgCount)}{"/120"}
            </span>
          </div>
          <div className="dc-hover-0" onClick={v.msgNext} style={{ position: "absolute", left: "25px", right: "25px", top: "452px", height: "56px", borderRadius: "15px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" }}>
              {I(v.t?.sendMail)}
            </span>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
