// LANGUAGE — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function TopBar({ v }: { v: Vals }) {
  return (
    <>
    {v.langOpen ? (
      <>
        <div onClick={v.closeLang} style={{ position: "absolute", inset: "0", zIndex: "59" }} />
      </>
    ) : null}
    {v.showLogo ? (
      <>
        <img src="./assets/catpal-logo.png" alt="CatPal" onClick={v.goHome} style={{ position: "absolute", left: "16px", top: "9px", height: "36px", width: "auto", zIndex: "55", cursor: "pointer" }} />
      </>
    ) : null}
    <div style={{ position: "absolute", right: "16px", top: "12px", zIndex: "60", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
      <div className="dc-hover-12" onClick={v.toggleLang} style={{ height: "30px", padding: "0 10px 0 9px", borderRadius: "15px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.14)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", transition: "background .15s ease" }}>
        <span style={{ fontSize: "13px", lineHeight: "1" }}>
          🌐
        </span>
        <span style={{ fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap", color: "#010002" }}>
          {I(v.langCurrent)}
        </span>
        <div style={css(`width:6px;height:6px;border-left:1.5px solid #010002;border-bottom:1.5px solid #010002;transform:${R(v.langCaret)};margin-left:1px;transition:transform .2s ease`)} />
      </div>
      {v.langOpen ? (
        <>
          <div style={{ minWidth: "180px", maxHeight: "300px", overflowY: "auto", padding: "6px", borderRadius: "14px", background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.04)", display: "flex", flexDirection: "column", flexWrap: "nowrap", animation: "cp-fadeup .18s ease", scrollbarWidth: "thin" }}>
            {each(v.langOpts, (o) => (
              <>
                <div className="dc-hover-12" onClick={o?.pick} style={css(`flex:none;height:40px;padding:0 12px;border-radius:9px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;background:${R(o?.bg)}`)}>
                  <span style={{ fontWeight: "500", fontSize: "14px", whiteSpace: "nowrap", color: "#010002" }}>
                    {I(o?.label)}
                  </span>
                  <span style={css(`font-weight:700;font-size:13px;color:#010002;opacity:${R(o?.checkOpacity)}`)}>
                    ✓
                  </span>
                </div>
              </>
            ))}
          </div>
        </>
      ) : null}
    </div>
    </>
  );
}
