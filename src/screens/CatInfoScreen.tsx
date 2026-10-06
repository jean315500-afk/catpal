// 04 CAT INFO (first time) — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function CatInfoScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sInfo ? (
      <>
        <div data-screen-label="04 Cat info" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "134px", top: "120px", width: "134px", height: "166px", boxShadow: "0 0 0 7px #FEFEFE,0 2px 6px #cecece", overflow: "hidden" }}>
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
          <span style={{ position: "absolute", left: "0", right: "0", top: "310px", textAlign: "center", fontWeight: "500", fontSize: "12px", color: "#a89f8d" }}>
            {I(v.t?.infoHint)}
          </span>
          <div style={{ position: "absolute", left: "82px", top: "350px", width: "237px", height: "93px" }}>
            <span style={{ position: "absolute", left: "3px", top: "0", fontWeight: "500", fontSize: "14px", lineHeight: "24px" }}>
              {I(v.t?.name)}
            </span>
            {" "}
            <input value={v.nameVal ?? ""} onChange={v.setName} style={{ position: "absolute", left: "62px", top: "0", width: "171px", height: "24px", border: "none", outline: "none", background: "transparent", fontWeight: "500", fontSize: "14px", color: "#010002", padding: "0" }} />
            <div style={{ position: "absolute", left: "0", top: "33px", width: "237px", height: "2px", background: "#D9D9D9" }} />
            <span style={{ position: "absolute", left: "3px", top: "58px", fontWeight: "500", fontSize: "14px", lineHeight: "24px" }}>
              {I(v.t?.age)}
            </span>
            {" "}
            <input value={v.ageVal ?? ""} onChange={v.setAge} style={{ position: "absolute", left: "62px", top: "58px", width: "171px", height: "24px", border: "none", outline: "none", background: "transparent", fontWeight: "500", fontSize: "14px", color: "#010002", padding: "0" }} />
            <div style={{ position: "absolute", left: "0", top: "91px", width: "237px", height: "2px", background: "#D9D9D9" }} />
          </div>
          <span style={{ position: "absolute", left: "44px", top: "474px", fontWeight: "500", fontSize: "14px", lineHeight: "24px" }}>
            {I(v.t?.personality)}
          </span>
          <div style={{ position: "absolute", left: "44px", right: "44px", top: "506px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {each(v.myTagChips, (g) => (
              <>
                <div onClick={g?.tap} style={css(`height:34px;padding:0 14px;border-radius:17px;background:${R(g?.bg)};display:flex;align-items:center;cursor:pointer;transition:background .15s ease`)}>
                  <span style={css(`font-weight:500;font-size:13px;white-space:nowrap;color:${R(g?.color)}`)}>
                    {I(g?.label)}
                  </span>
                </div>
              </>
            ))}
          </div>
          <div className="dc-hover-4" onClick={v.infoNext} style={{ position: "absolute", left: "142px", top: "680px", width: "119px", height: "61px", borderRadius: "32px", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
            <span style={{ color: "#fff", fontSize: "22px", lineHeight: "1" }}>
              ✓
            </span>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
