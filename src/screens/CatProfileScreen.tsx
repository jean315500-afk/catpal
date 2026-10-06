// CAT PROFILE — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function CatProfileScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sProfile ? (
      <>
        <div data-screen-label="Cat Profile" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease", overflowY: "auto", scrollbarWidth: "none" }}>
          <div style={{ padding: "70px 30px 120px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "180px", height: "216px", boxShadow: "0 0 0 8px #FEFEFE,0 3px 10px rgba(0,0,0,.14)", overflow: "hidden", transform: "rotate(-2deg)" }}>
              {v.pfMePhoto ? (
                <>
                  <div style={css(`width:100%;height:100%;background:url(${R(v.myPhoto)}) center / cover no-repeat`)} />
                </>
              ) : null}
              {v.pfSlotShow ? (
                <>
                  <image-slot id={v.pf?.slot} src={v.pf?.img} shape="rect" placeholder="cat photo" />
                </>
              ) : null}
            </div>
            <span style={{ marginTop: "26px", fontWeight: "700", fontSize: "24px", lineHeight: "32px" }}>
              {I(v.pf?.name)}{", "}{I(v.pf?.age)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "14px", lineHeight: "22px" }}>
              {I(v.pf?.flag)}{" "}{I(v.pf?.city)}{", "}{I(v.pf?.country)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "20px", color: "#a89f8d" }}>
              {I(v.pf?.meta)}
            </span>
            <div style={{ alignSelf: "stretch", marginTop: "26px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: "700", fontSize: "14px", lineHeight: "22px" }}>
                {I(v.t?.personality)}
              </span>
              {v.pf?.isMe ? (
                <>
                  <span style={{ fontWeight: "500", fontSize: "11px", color: "#a89f8d" }}>
                    {I(v.t?.tapToEdit)}
                  </span>
                </>
              ) : null}
            </div>
            <div style={{ alignSelf: "stretch", marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {each(v.pfTags, (g) => (
                <>
                  <div onClick={g?.tap} style={css(`height:34px;padding:0 14px;border-radius:17px;background:${R(g?.bg)};display:flex;align-items:center;cursor:${R(g?.cursor)};transition:background .15s ease`)}>
                    <span style={css(`font-weight:500;font-size:13px;white-space:nowrap;color:${R(g?.color)}`)}>
                      {I(g?.label)}
                    </span>
                  </div>
                </>
              ))}
            </div>
            {v.pf?.isMe ? (
              <>
                <div style={{ alignSelf: "stretch", marginTop: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "2px solid #D9D9D9", paddingBottom: "8px" }}>
                    <span style={{ flex: "none", width: "60px", fontWeight: "500", fontSize: "14px" }}>
                      {I(v.t?.name)}
                    </span>
                    <input value={v.nameVal ?? ""} onChange={v.setName} style={{ flex: "1", minWidth: "0", border: "none", outline: "none", background: "transparent", fontWeight: "500", fontSize: "14px", color: "#010002", padding: "0" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "2px solid #D9D9D9", paddingBottom: "8px" }}>
                    <span style={{ flex: "none", width: "60px", fontWeight: "500", fontSize: "14px" }}>
                      {I(v.t?.age)}
                    </span>
                    <input value={v.ageVal ?? ""} onChange={v.setAge} style={{ flex: "1", minWidth: "0", border: "none", outline: "none", background: "transparent", fontWeight: "500", fontSize: "14px", color: "#010002", padding: "0" }} />
                  </div>
                </div>
              </>
            ) : null}
            {v.pf?.isPal ? (
              <>
                <div style={{ alignSelf: "stretch", marginTop: "24px", display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "#F9F4EB" }}>
                  <div style={css(`flex:none;width:40px;height:54px;background:url(${R(v.pf?.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
                  <span style={{ fontWeight: "500", fontSize: "12.5px", lineHeight: "19px", color: "#4a4438", textWrap: "pretty" }}>
                    {I(v.t?.pfStampNote)}
                  </span>
                </div>
                <div className="dc-hover-0" onClick={v.pfSend} style={{ alignSelf: "stretch", marginTop: "20px", height: "58px", borderRadius: "15px", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", color: "#fff" }}>
                    {I(v.t?.pfSend)}
                  </span>
                </div>
                <div className="dc-hover-12" onClick={v.pfLetters} style={{ alignSelf: "stretch", marginTop: "10px", height: "52px", borderRadius: "15px", border: "2px solid #010002", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .15s ease" }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "14px" }}>
                    {I(v.t?.letters)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
