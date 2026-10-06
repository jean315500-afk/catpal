// HOME — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function HomeScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sHome ? (
      <>
        <div data-screen-label="Home" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fade .25s ease", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
          <div style={{ padding: "58px 25px 120px", display: "flex", flexDirection: "column" }}>
            {/* SEND */}
            <span style={{ fontWeight: "700", fontSize: "21px", lineHeight: "29px", textWrap: "pretty" }}>
              {I(v.t?.homeQ)}
            </span>
            <div style={{ position: "relative", marginTop: "16px", height: "232px", borderRadius: "6px", background: "#F9F4EB", boxShadow: "0 3px 12px rgba(0,0,0,.08)", overflow: "hidden" }}>
              {/* envelope flap */}
              <div style={{ position: "absolute", left: "0", right: "0", top: "0", height: "92px", background: "#F3ECDD", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
              <div style={css(`position:absolute;right:22px;top:20px;width:60px;height:80px;background:url(${R(v.heroStamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
              <div style={{ position: "absolute", right: "62px", top: "18px", width: "108px", height: "80px", background: "url(./assets/pm/seoul.png) center / contain no-repeat", mixBlendMode: "multiply", opacity: ".92", transform: "rotate(-8deg)" }} />
              <div className="dc-hover-1" onClick={v.openMe} style={{ position: "absolute", left: "24px", top: "62px", width: "116px", height: "92px", boxShadow: "0 0 0 4px #FEFEFE,0 2px 4px #cecece", transform: "rotate(-4deg)", overflow: "hidden", cursor: "pointer", transition: "transform .15s ease" }}>
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
              <div style={{ position: "absolute", left: "24px", right: "20px", bottom: "20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", lineHeight: "21px", whiteSpace: "nowrap" }}>
                  {I(v.t?.heroTo)}
                </span>
                <span style={css(`text-align:right;font-weight:500;font-size:12px;line-height:18px;color:${R(v.heroStatusColor)}`)}>
                  {I(v.t?.heroStatus)}
                </span>
              </div>
            </div>
            <div className="dc-hover-0" onClick={v.openSendSheet} style={{ marginTop: "12px", height: "56px", borderRadius: "15px", background: "#010002", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontWeight: "700", fontSize: "15px", color: "#fff" }}>
                {I(v.t?.sendCatMail)}
              </span>
            </div>
            {/* RECEIVE */}
            <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "700", fontSize: "16px", lineHeight: "24px" }}>
                {I(v.t?.newMail)}
              </span>
              {v.hasNewMail ? (
                <>
                  <div style={{ minWidth: "20px", height: "20px", padding: "0 6px", boxSizing: "border-box", borderRadius: "10px", background: "#FF4800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontWeight: "700", fontSize: "11px", color: "#fff" }}>
                      {I(v.newMailCount)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ margin: "10px -25px 0", padding: "4px 25px 10px", display: "flex", gap: "12px", overflowX: "auto", scrollSnapType: "x mandatory", scrollPadding: "0 25px", scrollbarWidth: "none" }}>
              {each(v.newMailCards, (m) => (
                <>
                  <div className="dc-hover-2" onClick={m?.open} style={{ flex: "none", position: "relative", width: "148px", height: "124px", borderRadius: "5px", background: "#F9F4EB", boxShadow: "0 2px 8px rgba(0,0,0,.08)", cursor: "pointer", transition: "transform .15s ease", overflow: "hidden", scrollSnapAlign: "start" }}>
                    <div style={{ position: "absolute", left: "0", right: "0", top: "0", height: "46px", background: "#F3ECDD", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
                    <div style={css(`position:absolute;right:10px;top:10px;width:32px;height:43px;background:url(${R(m?.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))`)} />
                    <div style={css(`position:absolute;right:30px;top:8px;width:56px;height:41px;background:url(${R(m?.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.92;transform:rotate(-8deg)`)} />
                    <div style={{ position: "absolute", left: "10px", top: "10px", padding: "1px 7px", borderRadius: "8px", background: "#FF4800" }}>
                      <span style={{ fontWeight: "700", fontSize: "9px", color: "#fff" }}>
                        {I(v.t?.newTag)}
                      </span>
                    </div>
                    <div style={{ position: "absolute", left: "12px", right: "10px", bottom: "10px", display: "flex", flexDirection: "column", gap: "1px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", lineHeight: "19px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {I(m?.title)}
                      </span>
                      <span style={{ fontWeight: "500", fontSize: "11px", lineHeight: "16px", color: "#746e63", whiteSpace: "nowrap" }}>
                        {I(m?.flag)}{" "}{I(m?.city)}
                      </span>
                      {m?.locked ? (
                        <>
                          <span style={{ marginTop: "3px", fontWeight: "600", fontSize: "10.5px", lineHeight: "15px", color: "#010002", whiteSpace: "nowrap" }}>
                            {"🔒 "}{I(v.t?.locked)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              ))}
            </div>
            <div>
              {v.noNewMail ? (
                <>
                  {/* empty state: dashed box, same height as a mail card */}
                  <div style={{ marginTop: "-12px", height: "124px", border: "2px dashed #E7E2D8", borderRadius: "14px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
                    <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "17px", color: "#a89f8d", textAlign: "center" }}>
                      {I(v.t?.noMail)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
