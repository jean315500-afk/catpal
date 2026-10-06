// WORLD MAP — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function WorldMapScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sMap ? (
      <>
        <div data-screen-label="World Map" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fade .3s ease", overflow: "hidden" }}>
          <iframe src={v.globeMapSrc} title="globe" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", border: "0" }} />
          <div style={{ position: "absolute", left: "0", right: "0", top: "54px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", pointerEvents: "none" }}>
            <span style={{ fontWeight: "700", fontSize: "16px", color: "#010002" }}>
              {I(v.t?.mapTitle)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "12px", color: "#746e63" }}>
              {I(v.t?.mapSub)}
            </span>
          </div>
          <div style={{ position: "absolute", right: "18px", top: "110px", display: "flex", flexDirection: "column", gap: "2px", pointerEvents: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF4B3E", boxShadow: "0 0 0 2px #fff" }} />
              <span style={{ fontWeight: "700", fontSize: "12px", lineHeight: "22px", color: "#010002" }}>
                {I(v.t?.legendSent)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src="./assets/icon-map-160.png" alt="" style={{ width: "14px", height: "14px", objectFit: "contain" }} />
              <span style={{ fontWeight: "700", fontSize: "12px", lineHeight: "22px", color: "#010002" }}>
                {I(v.t?.legendMet)}
              </span>
            </div>
          </div>
          <div style={{ position: "absolute", left: "0", right: "0", bottom: "104px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ padding: "0 25px", fontWeight: "700", fontSize: "13px", color: "#010002" }}>
              {I(v.t?.mapStats)}
            </span>
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 25px 4px", scrollbarWidth: "none" }}>
              {each(v.palRows, (p) => (
                <>
                  <div className="dc-hover-2" onClick={p?.open} style={{ flex: "none", display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px 8px 8px", borderRadius: "14px", background: "#fff", cursor: "pointer", transition: "transform .15s ease", boxShadow: "0 4px 12px rgba(0,0,0,.1),0 0 0 1px #EFEBE2" }}>
                    <div style={{ flex: "none", width: "34px", height: "40px", boxShadow: "0 0 0 3px #FEFEFE,0 1px 2px #cecece", overflow: "hidden" }}>
                      <image-slot id={p?.slot} src={p?.img} shape="rect" placeholder="🐱" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: "700", fontSize: "13px", lineHeight: "18px", whiteSpace: "nowrap" }}>
                        {I(p?.flag)}{" "}{I(p?.name)}
                      </span>
                      <span style={{ fontWeight: "500", fontSize: "11px", lineHeight: "16px", color: "#746e63", whiteSpace: "nowrap" }}>
                        {I(p?.city)}{" · "}{I(p?.dist)}
                      </span>
                    </div>
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
