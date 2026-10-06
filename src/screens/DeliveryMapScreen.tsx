// DELIVERY MAP — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function DeliveryMapScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sDeliveryMap ? (
      <>
        <div data-screen-label="08 Delivery map" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fade .4s ease", overflow: "hidden" }}>
          <iframe src={v.globeDeliverySrc} title="globe" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", border: "0", pointerEvents: "none" }} />
          {" "}
          <span style={{ position: "absolute", left: "0", right: "0", top: "56px", textAlign: "center", fontWeight: "700", fontSize: "14px", color: "#010002" }}>
            {I(v.t?.mapTitle)}
          </span>
          <div className="dc-hover-6" onClick={v.tapDeliveryCard} style={{ position: "absolute", left: "26px", top: "600px", width: "350px", height: "150px", borderRadius: "24px", background: "rgba(255,255,255,.96)", cursor: "pointer", transition: "transform .2s ease", boxShadow: "0 10px 30px rgba(0,20,40,.25)" }}>
            <span style={{ position: "absolute", left: "28px", top: "28px", right: "28px", fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", lineHeight: "21px" }}>
              {I(v.t?.deliveryCard)}
            </span>
            <div style={{ position: "absolute", left: "27px", top: "96px", width: "296px", height: "6px", borderRadius: "3px", background: "#E7E2D8", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "3px", background: "#010002", animation: "cp-progress 7s cubic-bezier(.4,0,.35,1) both" }} />
            </div>
            <div style={{ position: "absolute", left: "-5px", top: "62px", width: "64px", height: "28px", animation: "cp-run 7s cubic-bezier(.4,0,.35,1) both", pointerEvents: "none" }}>
              <img src="./assets/cat-run.gif" alt="" style={{ width: "64px", height: "28px", objectFit: "contain", animation: "cp-float 1.4s ease-in-out infinite" }} />
            </div>
            <span style={{ position: "absolute", left: "0", right: "0", top: "110px", textAlign: "center", fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px" }}>
              {I(v.destKm)}{" km"}
            </span>
            {v.mapDone ? (
              <>
                <span style={{ position: "absolute", left: "0", right: "0", bottom: "6px", textAlign: "center", fontWeight: "500", fontSize: "11px", color: "#8a8272", animation: "cp-pulse 1.6s ease infinite" }}>
                  {I(v.t?.tapContinue)}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
