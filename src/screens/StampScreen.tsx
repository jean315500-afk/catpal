// 05 STAMP — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function StampScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sStamp ? (
      <>
        <div data-screen-label="05 Stamp" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "56px", top: "150px", width: "290px", height: "110px", background: "#F3ECDD", clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
          {/* envelope back (inside) */}
          <div style={{ position: "absolute", left: "56px", top: "258px", width: "290px", height: "170px", background: "#F3ECDD", boxShadow: "0 3px 12px rgba(0,0,0,.07)", transformOrigin: "50% 100%", animation: "cp-gulp .35s ease .62s" }} />
          {/* photo drops into the envelope */}
          <div style={{ position: "absolute", left: "142px", top: "186px", width: "118px", height: "150px", background: "#fff", padding: "5px", boxSizing: "border-box", boxShadow: "0 2px 6px rgba(0,0,0,.14)", animation: "cp-tuck .95s cubic-bezier(.3,1.1,.5,1) .1s both" }}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
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
          </div>
          {/* envelope front: V-shaped pocket over the photo */}
          <div style={{ position: "absolute", left: "56px", top: "258px", width: "290px", height: "170px", transformOrigin: "50% 100%", animation: "cp-gulp .35s ease .62s", filter: "drop-shadow(0 -2px 3px rgba(0,0,0,.08))", pointerEvents: "none" }}>
            <div style={{ width: "100%", height: "100%", background: "#F9F4EB", clipPath: "polygon(0 0,50% 34%,100% 0,100% 100%,0 100%)" }} />
          </div>
          <span style={{ position: "absolute", left: "44px", top: "506px", fontWeight: "500", fontSize: "14px", lineHeight: "24px" }}>
            {I(v.t?.pickStamp)}
          </span>
          <div style={{ position: "absolute", left: "0", right: "0", top: "534px", display: "flex", gap: "12px", overflowX: "auto", padding: "6px 40px 10px", boxSizing: "border-box", scrollbarWidth: "none" }}>
            {each(v.stampsGo, (st) => (
              <>
                <div className="dc-hover-5" onClick={st?.pick} role="img" aria-label="stamp" style={css(`flex:none;width:52px;height:70px;background:url(${R(st?.m)}) center / contain no-repeat;outline:${R(st?.border)};outline-offset:2px;border-radius:2px;cursor:pointer;transition:transform .15s ease;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
              </>
            ))}
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
