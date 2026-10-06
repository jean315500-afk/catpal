// MAILBOX — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function MailboxScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sMailbox ? (
      <>
        <div data-screen-label="Mailbox" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fade .25s ease", overflowY: "auto", scrollbarWidth: "none" }}>
          <div style={{ padding: "58px 25px 120px", display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "700", fontSize: "21px", lineHeight: "30px" }}>
              {I(v.t?.mailbox)}
            </span>
            <div style={{ marginTop: "14px", display: "flex", gap: "6px", padding: "4px", borderRadius: "22px", background: "#F6F6F6" }}>
              {each(v.mbTabs, (b) => (
                <>
                  <div onClick={b?.tap} style={css(`flex:1;height:36px;border-radius:18px;background:${R(b?.bg)};display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:background .15s ease;box-shadow:${R(b?.shadow)}`)}>
                    <span style={css(`font-weight:700;font-size:13px;white-space:nowrap;color:${R(b?.color)}`)}>
                      {I(b?.label)}
                    </span>
                    {b?.badge ? (
                      <>
                        <div style={{ minWidth: "18px", height: "18px", padding: "0 5px", boxSizing: "border-box", borderRadius: "9px", background: "#FF4800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontWeight: "700", fontSize: "10px", color: "#fff" }}>
                            {I(b?.count)}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </>
              ))}
            </div>
            {v.mbShowCards ? (
              <>
                <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: "20px", rowGap: "22px" }}>
                  {each(v.mbCards, (c) => (
                    <>
                      <div className="dc-hover-2" onClick={c?.open} style={{ display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer", transition: "transform .15s ease" }}>
                        <div style={{ position: "relative", height: "104px", background: "#F9F4EB", boxShadow: "0 1px 4px rgba(0,0,0,.1)", overflow: "hidden" }}>
                          <div style={css(`position:absolute;right:8px;top:7px;width:30px;height:40px;background:url(${R(c?.stamp)}) center / contain no-repeat;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))`)} />
                          <div style={css(`position:absolute;right:26px;top:5px;width:56px;height:41px;background:url(${R(c?.pm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.92;transform:rotate(-8deg)`)} />
                          <span style={{ position: "absolute", left: "10px", bottom: "8px", fontWeight: "700", fontSize: "13px", lineHeight: "18px" }}>
                            {I(c?.who)}
                          </span>
                          {c?.isNew ? (
                            <>
                              <div style={{ position: "absolute", left: "8px", top: "8px", padding: "1px 7px", borderRadius: "9px", background: "#FF4800" }}>
                                <span style={{ fontWeight: "700", fontSize: "9px", color: "#fff" }}>
                                  {I(v.t?.newTag)}
                                </span>
                              </div>
                            </>
                          ) : null}
                          {c?.locked ? (
                            <>
                              <div style={{ position: "absolute", left: "8px", top: "8px", padding: "1px 7px", borderRadius: "9px", background: "#010002" }}>
                                <span style={{ fontWeight: "700", fontSize: "9px", color: "#fff" }}>
                                  🔒
                                </span>
                              </div>
                            </>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
                          <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {I(c?.place)}
                          </span>
                          <span style={{ flex: "none", fontWeight: "500", fontSize: "12px", lineHeight: "20px", color: "#a89f8d" }}>
                            {I(c?.date)}
                          </span>
                        </div>
                      </div>
                    </>
                  ))}
                </div>
              </>
            ) : null}
            {v.mbShowPals ? (
              <>
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {each(v.palRows, (p) => (
                    <>
                      <div className="dc-hover-2" onClick={p?.open} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "#F9F4EB", cursor: "pointer", transition: "transform .15s ease" }}>
                        <div style={{ flex: "none", width: "48px", height: "58px", boxShadow: "0 0 0 4px #FEFEFE,0 1px 3px #cecece", overflow: "hidden", transform: "rotate(-2deg)" }}>
                          <image-slot id={p?.slot} src={p?.img} shape="rect" placeholder="🐱" />
                        </div>
                        <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "700", fontSize: "15px", lineHeight: "22px" }}>
                            {I(v.myName)}{" & "}{I(p?.name)}
                          </span>
                          <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#746e63" }}>
                            {I(p?.flag)}{" "}{I(p?.city)}{" · "}{I(p?.dist)}
                          </span>
                          <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#a89f8d" }}>
                            {I(p?.meta)}
                          </span>
                        </div>
                        <div className="dc-hover-10" onClick={p?.letters} style={{ flex: "none", height: "32px", padding: "0 12px", borderRadius: "16px", border: "1.5px solid #010002", boxSizing: "border-box", display: "flex", alignItems: "center", cursor: "pointer" }}>
                          <span style={{ fontWeight: "700", fontSize: "11px", whiteSpace: "nowrap" }}>
                            {I(v.t?.letters)}
                          </span>
                        </div>
                      </div>
                    </>
                  ))}
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
