// NAV — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function BottomNav({ v }: { v: Vals }) {
  return (
    <>
    {v.showNav ? (
      <>
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "94px", background: "#fff", borderTop: "1px solid #F1EDE5", zIndex: "40", display: "flex", justifyContent: "space-around", alignItems: "flex-start", padding: "10px 14px 0", boxSizing: "border-box" }}>
          {each(v.navItems, (n) => (
            <>
              <div className="dc-hover-2" onClick={n?.tap} style={{ position: "relative", width: "78px", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer", transition: "transform .15s ease" }}>
                <div style={css(`width:${R(n?.iconW)}px;height:${R(n?.iconH)}px;margin-top:${R(n?.iconMt)}px;background:url(${R(n?.icon)}) center / contain no-repeat;opacity:${R(n?.opacity)};transition:opacity .15s ease`)} />
                <span style={css(`font-weight:${R(n?.weight)};font-size:12px;line-height:16px;white-space:nowrap;color:${R(n?.color)}`)}>
                  {I(n?.label)}
                </span>
                {n?.badge ? (
                  <>
                    <div style={{ position: "absolute", right: "12px", top: "-4px", minWidth: "18px", height: "18px", padding: "0 5px", boxSizing: "border-box", borderRadius: "9px", background: "#FF4800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontWeight: "700", fontSize: "10px", color: "#fff" }}>
                        {I(n?.count)}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ))}
        </div>
      </>
    ) : null}
    </>
  );
}
