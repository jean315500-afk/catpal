// 01 INTRO — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function IntroScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sIntro ? (
      <>
        <div data-screen-label="01 Intro" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "46px", top: "210px", width: "310px", height: "190px", borderRadius: "14px", background: "#F9F4EB", boxShadow: "0 2px 10px rgba(0,0,0,.05)" }}>
            <span style={{ position: "absolute", left: "22px", top: "22px", fontFamily: "Inter,sans-serif", fontSize: "12px", whiteSpace: "nowrap" }}>
              To. Momo
            </span>
            {" "}
            <img src="./assets/stamp-1.png" alt="stamp" style={{ position: "absolute", left: "218px", top: "14px", width: "62px", height: "84px", objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.18))" }} />
            <div style={{ position: "absolute", left: "100px", top: "14px", width: "118px", height: "86px", background: "url(./assets/pm/seoul.png) center / contain no-repeat", mixBlendMode: "multiply", opacity: ".92", transform: "rotate(-8deg)" }} />
          </div>
          <div style={{ position: "absolute", left: "0", right: "0", top: "540px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", padding: "0 40px" }}>
            <span style={{ fontWeight: "700", fontSize: "20px", lineHeight: "30px", textAlign: "center" }}>
              {I(v.t?.introTitle)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "14px", lineHeight: "23px", textAlign: "center", whiteSpace: "pre-line" }}>
              {I(v.t?.introSub)}
            </span>
          </div>
          <div className="dc-hover-0" onClick={v.goHome} style={{ position: "absolute", left: "78px", top: "700px", width: "245px", height: "61px", borderRadius: "15px", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", color: "#fff" }}>
              {I(v.t?.start)}
            </span>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
