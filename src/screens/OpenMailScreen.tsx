// OPEN CAT MAIL — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function OpenMailScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sMail ? (
      <>
        <div data-screen-label="Cat Mail" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={css(`position:absolute;left:126px;top:84px;width:150px;height:260px;background:#fff;padding:5px;box-sizing:border-box;box-shadow:0 2px 8px rgba(0,0,0,.16);animation:${R(v.mWiggle)}`)}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <image-slot id={v.mSlot} src={v.mImg} shape="rect" placeholder="pal’s cat 🐈" />
            </div>
          </div>
          <div style={{ position: "absolute", left: "66px", top: "290px", width: "270px", height: "120px", background: "#F9F4EB", boxShadow: "0 -4px 14px rgba(0,0,0,.06)" }}>
            <div style={{ position: "absolute", left: "0", right: "0", top: "0", height: "44px", background: "#F3ECDD", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
            <div style={css(`position:absolute;right:12px;bottom:10px;width:40px;height:54px;background:url(${R(v.mStamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
            <div style={css(`position:absolute;right:40px;bottom:6px;width:76px;height:56px;background:url(${R(v.mPm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.92;transform:rotate(-8deg)`)} />
          </div>
          <div style={{ position: "absolute", left: "25px", right: "25px", top: "430px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", textAlign: "center" }}>
            <span style={{ fontWeight: "700", fontSize: "20px", lineHeight: "30px" }}>
              {I(v.t?.mailTitle)}
            </span>
            <span onClick={v.openMailProfile} style={{ fontWeight: "500", fontSize: "13px", lineHeight: "20px", color: "#746e63", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", textDecorationColor: "#D9D9D9" }}>
              {I(v.mPlace)}{" · "}{I(v.mDist)}
            </span>
            <div style={{ marginTop: "8px", maxWidth: "300px", padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "#F9F4EB", alignSelf: "center" }}>
              <span style={{ fontWeight: "500", fontSize: "15px", lineHeight: "22px", textWrap: "pretty" }}>
                {"“"}{I(v.mNote)}{"”"}
              </span>
            </div>
          </div>
          <div style={{ position: "absolute", left: "68px", top: "620px", width: "265px", height: "46px", borderRadius: "29px", background: "#EDEBEB", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 10px", boxSizing: "border-box" }}>
            {each(v.reactions, (r) => (
              <>
                <div className="dc-hover-7" onClick={r?.pick} style={css(`width:34px;height:34px;border-radius:50%;background:${R(r?.bg)};animation:${R(r?.anim)};display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:transform .15s ease,background .15s ease`)}>
                  {I(r?.e)}
                </div>
              </>
            ))}
          </div>
          <div style={{ position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden", zIndex: "5" }}>
            {each(v.reactBurst, (b) => (
              <>
                <span style={css(`position:absolute;left:${R(b?.left)}px;top:622px;font-size:26px;line-height:1;opacity:0;animation:${R(b?.anim)}`)}>
                  {I(b?.e)}
                </span>
              </>
            ))}
          </div>
          <div style={{ position: "absolute", left: "25px", right: "25px", top: "690px", display: "flex", justifyContent: "center", gap: "12px" }}>
            <div className="dc-hover-8" onClick={v.openMailLetters} style={{ height: "58px", padding: "0 44px", borderRadius: "32px", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", color: "#fff", whiteSpace: "nowrap" }}>
                {I(v.t?.reply)}
              </span>
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
