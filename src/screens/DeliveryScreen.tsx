// DELIVERY (globe) — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function DeliveryScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sDelivery ? (
      <>
        <div data-screen-label="07 Delivery" style={{ position: "absolute", inset: "0", background: "#F9F4EB", animation: "cp-fade .35s ease", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "0", right: "0", top: "172px", display: "flex", justifyContent: "center", alignItems: "baseline", gap: "2px" }}>
            <span style={{ fontWeight: "700", fontSize: "20px", lineHeight: "30px" }}>
              {I(v.t?.finding)}
            </span>
            <span style={{ fontWeight: "700", fontSize: "20px", animation: "cp-pulse 1s ease infinite" }}>
              .
            </span>
            <span style={{ fontWeight: "700", fontSize: "20px", animation: "cp-pulse 1s ease .2s infinite" }}>
              .
            </span>
            <span style={{ fontWeight: "700", fontSize: "20px", animation: "cp-pulse 1s ease .4s infinite" }}>
              .
            </span>
          </div>
          <div style={{ position: "absolute", left: "71px", top: "280px", width: "260px", height: "260px" }}>
            <div style={{ position: "absolute", inset: "0", borderRadius: "50%", background: "#fff", border: "2px solid #010002", overflow: "hidden" }}>
              <div style={css(`position:absolute;left:0;top:0;width:1040px;height:260px;animation:cp-drift ${R(v.globeDur)} linear infinite`)}>
                <div style={{ position: "absolute", left: "30px", top: "52px", width: "96px", height: "64px", background: "#E7E2D8", borderRadius: "58% 42% 55% 45% / 55% 60% 40% 45%" }} />
                <div style={{ position: "absolute", left: "150px", top: "140px", width: "70px", height: "88px", background: "#E7E2D8", borderRadius: "45% 55% 48% 52% / 60% 40% 58% 42%" }} />
                <div style={{ position: "absolute", left: "262px", top: "40px", width: "120px", height: "70px", background: "#E7E2D8", borderRadius: "52% 48% 60% 40% / 48% 55% 45% 52%" }} />
                <div style={{ position: "absolute", left: "330px", top: "150px", width: "56px", height: "52px", background: "#E7E2D8", borderRadius: "50% 50% 45% 55% / 55% 45% 50% 50%" }} />
                <div style={{ position: "absolute", left: "430px", top: "88px", width: "78px", height: "60px", background: "#E7E2D8", borderRadius: "60% 40% 50% 50% / 45% 60% 40% 55%" }} />
                <div style={{ position: "absolute", left: "550px", top: "52px", width: "96px", height: "64px", background: "#E7E2D8", borderRadius: "58% 42% 55% 45% / 55% 60% 40% 45%" }} />
                <div style={{ position: "absolute", left: "670px", top: "140px", width: "70px", height: "88px", background: "#E7E2D8", borderRadius: "45% 55% 48% 52% / 60% 40% 58% 42%" }} />
                <div style={{ position: "absolute", left: "782px", top: "40px", width: "120px", height: "70px", background: "#E7E2D8", borderRadius: "52% 48% 60% 40% / 48% 55% 45% 52%" }} />
                <div style={{ position: "absolute", left: "850px", top: "150px", width: "56px", height: "52px", background: "#E7E2D8", borderRadius: "50% 50% 45% 55% / 55% 45% 50% 50%" }} />
                <div style={{ position: "absolute", left: "950px", top: "88px", width: "78px", height: "60px", background: "#E7E2D8", borderRadius: "60% 40% 50% 50% / 45% 60% 40% 55%" }} />
              </div>
              <div style={{ position: "absolute", left: "50%", top: "0", width: "132px", height: "256px", transform: "translateX(-50%)", border: "1.4px solid rgba(1,0,2,.22)", borderRadius: "50%" }} />
              <div style={{ position: "absolute", left: "50%", top: "0", width: "224px", height: "257px", transform: "translateX(-50%)", border: "1.4px solid rgba(1,0,2,.14)", borderRadius: "50%" }} />
              <div style={{ position: "absolute", left: "0", right: "0", top: "33%", height: "1.4px", background: "rgba(1,0,2,.18)" }} />
              <div style={{ position: "absolute", left: "0", right: "0", top: "50%", height: "1.4px", background: "rgba(1,0,2,.25)" }} />
              <div style={{ position: "absolute", left: "0", right: "0", top: "67%", height: "1.4px", background: "rgba(1,0,2,.18)" }} />
            </div>
            {v.phFly ? (
              <>
                <div style={{ position: "absolute", left: "98px", top: "112px", width: "64px", height: "44px", background: "#F9F4EB", border: "1.5px solid #010002", borderRadius: "4px", animation: "cp-fly 1.4s ease-in-out forwards", boxShadow: "0 3px 8px rgba(0,0,0,.15)" }}>
                  <div style={{ position: "absolute", right: "5px", top: "5px", width: "11px", height: "12px", background: "repeating-linear-gradient(45deg,#efe9dd 0 3px,#dcd2ba 3px 6px)" }} />
                  <div style={{ position: "absolute", left: "6px", top: "18px", width: "26px", height: "2px", background: "#D9D9D9" }} />
                  <div style={{ position: "absolute", left: "6px", top: "25px", width: "34px", height: "2px", background: "#D9D9D9" }} />
                </div>
              </>
            ) : null}
            {v.phPin ? (
              <>
                <img src="./assets/icon-map-160.png" alt="pin" style={{ position: "absolute", left: "180px", top: "28px", width: "46px", height: "46px", objectFit: "contain", animation: "cp-pin .55s cubic-bezier(.34,1.56,.64,1) both" }} />
              </>
            ) : null}
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
