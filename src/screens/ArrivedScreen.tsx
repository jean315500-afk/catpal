// 09 ARRIVED — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function ArrivedScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sArrived ? (
      <>
        <div data-screen-label="09 Arrived" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <img src="./assets/icon-map-160.png" alt="pin" style={{ position: "absolute", left: "171px", top: "96px", width: "60px", height: "60px", objectFit: "contain", animation: "cp-pop .5s cubic-bezier(.34,1.56,.64,1) both" }} />
          <div style={{ position: "absolute", left: "30px", right: "30px", top: "166px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <span style={{ fontWeight: "700", fontSize: "17px", lineHeight: "26px" }}>
              {I(v.t?.arr1)}
            </span>
            <span style={{ fontWeight: "700", fontSize: "17px", lineHeight: "26px" }}>
              {"Seoul → "}{I(v.destCity)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "13px", lineHeight: "22px", color: "#a89f8d" }}>
              {I(v.destKm)}{" km 🐾"}
            </span>
          </div>
          <div style={{ position: "absolute", left: "70px", top: "264px", width: "263px", height: "176px", background: "#F9F4EB", boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
            <span style={{ position: "absolute", left: "16px", top: "16px", fontFamily: "Inter,sans-serif", fontSize: "11px", whiteSpace: "nowrap" }}>
              {"To. "}{I(v.t?.toShort)}
            </span>
            <div style={css(`position:absolute;left:194px;top:12px;width:52px;height:70px;background:url(${R(v.stampMotif)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
            <div style={css(`position:absolute;left:116px;top:10px;width:100px;height:73px;background:url(${R(v.myPm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.92;transform:rotate(-8deg)`)} />
            <span style={{ position: "absolute", left: "0", right: "14px", bottom: "9px", textAlign: "right", fontWeight: "500", fontSize: "10.2px", lineHeight: "19.5px" }}>
              {I(v.t?.fromLine)}
            </span>
          </div>
          <span style={{ position: "absolute", left: "0", right: "0", top: "452px", textAlign: "center", fontWeight: "500", fontSize: "14px", lineHeight: "24px" }}>
            {I(v.todayDate)}
          </span>
          {v.isNewPal ? (
            <>
              <div className="dc-hover-2" onClick={v.openDestProfile} style={{ position: "absolute", left: "36px", right: "36px", top: "520px", height: "96px", background: "#F9F4EB", display: "flex", alignItems: "center", gap: "14px", padding: "0 16px", boxSizing: "border-box", cursor: "pointer", transition: "transform .15s ease", animation: "cp-fadeup .4s ease .2s both" }}>
                <div style={{ flex: "none", width: "52px", height: "62px", boxShadow: "0 0 0 4px #FEFEFE,0 2px 4px #cecece", overflow: "hidden", transform: "rotate(-3deg)" }}>
                  <image-slot id={v.destSlot} src={v.destImg} shape="rect" placeholder="🐱" />
                </div>
                <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: "700", fontSize: "15px", lineHeight: "22px" }}>
                    {I(v.t?.newPalTitle)}
                  </span>
                  <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#746e63" }}>
                    {I(v.t?.stampCollected)}
                  </span>
                </div>
                <div style={css(`flex:none;width:40px;height:54px;background:url(${R(v.destStamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18));animation:cp-pop .5s cubic-bezier(.34,1.56,.64,1) .5s both`)} />
              </div>
            </>
          ) : null}
        </div>
      </>
    ) : null}
    </>
  );
}
