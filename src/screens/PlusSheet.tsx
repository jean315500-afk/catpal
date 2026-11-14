// CATPAL PLUS — the paid plan, in a sheet over whatever you were doing. Not on it: its three things (choose your CatPal,
// your stamp, the Fast Bird), joining for a year or for good, and fast birds on their own. On it: no joining again —
// the plan looked after (a year: when it renews, and turning that off or on; for good: no recurring payments).
// No payment is connected: it says so, and joining costs nothing yet.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const INK = "#22304A", MUTED = "#5E6A80";

export default function PlusSheet({ v }: { v: Vals }) {
  const p = v.plus; if (!p || !p.open) return null;
  return (
    <div onClick={p.close} onKeyDown={(e) => { if (e.key === "Escape") p.close(); }} style={{ position: "absolute", inset: "0", zIndex: 60, background: "rgba(34,48,74,.36)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "cp-fade .2s ease" }}>
      <div role="dialog" aria-modal="true" aria-label={p.name} onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "460px", maxHeight: "92%", overflowY: "auto", boxSizing: "border-box", padding: "10px 20px 24px", background: "#FBF7EE", borderRadius: "26px 26px 0 0", boxShadow: "0 -10px 30px rgba(34,48,74,.18)", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ width: "38px", height: "4px", borderRadius: "2px", background: "#E2DACB", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "24px", lineHeight: "30px", letterSpacing: "var(--ls-heading)", color: INK }}>{I(p.name)}</span>
            <span style={{ fontWeight: 500, fontSize: "14px", lineHeight: "20px", color: MUTED }}>{I(p.on ? p.manage?.title : p.birds ? p.status : p.tagline)}</span>
          </span>
          <span onClick={p.close} role="button" tabIndex={0} aria-label={p.closeLabel} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.close(); } }} style={{ flex: "none", width: "32px", height: "32px", borderRadius: "16px", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", color: INK }}>✕</span>
        </div>
        {/* what it brings (not on it yet) */}
        {p.on ? null : <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {each(p.perks, (x: any) => (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "16px", background: "#fff", boxShadow: "0 1px 2px rgba(60,40,20,.08)" }}>
              <span aria-hidden="true" style={{ flex: "none", fontSize: "22px", lineHeight: "1" }}>{x.icon}</span>
              <span style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" }}>
                <b style={{ fontWeight: 700, fontSize: "14.5px", lineHeight: "20px", color: INK }}>{I(x.title)}</b>
                <span style={{ fontWeight: 400, fontSize: "12.5px", lineHeight: "18px", color: MUTED }}>{I(x.sub)}</span>
              </span>
            </div>
          ))}
        </div>}
        {p.on && p.manage ? (
          <>
            {/* the plan, looked after */}
            <div style={{ marginTop: "12px", padding: "14px 16px", borderRadius: "16px", background: "#fff", boxShadow: "inset 0 0 0 1.5px #E7C98F", display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <b style={{ fontWeight: 700, fontSize: "15px", color: INK }}>{I(p.name)}</b>
                <span style={{ padding: "1px 8px", borderRadius: "999px", background: "#FFF1DC", color: "#8A5A2B", fontWeight: 700, fontSize: "11px", lineHeight: "17px" }}>{I(p.manage.kind)}</span>
              </span>
              <span style={{ fontWeight: 500, fontSize: "13px", lineHeight: "18px", color: MUTED }}>{I(p.manage.line)}</span>
            </div>
            {p.manage.renewLabel ? (
              <div className="dc-hover-8" onClick={p.manage.toggleRenew} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.manage.toggleRenew(); } }} style={{ marginTop: "12px", height: "50px", borderRadius: "25px", boxShadow: "inset 0 0 0 1.5px " + INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: INK }}>{I(p.manage.renewLabel)}</span>
              </div>
            ) : null}
            {!p.sample ? <span onClick={p.leaveIt} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.leaveIt(); } }} style={{ display: "block", marginTop: "10px", textAlign: "center", fontWeight: 600, fontSize: "12.5px", color: MUTED, cursor: "pointer", textDecoration: "underline" }}>{I(p.leave)}</span> : null}
          </>
        ) : (
          <>
            {/* not on sale yet: "Coming soon", and nothing to press (no payment is connected) */}
            <div role="button" aria-disabled="true" style={{ marginTop: "16px", height: "54px", padding: "0 20px", borderRadius: "27px", background: "#DDD5C6", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "default" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "#5C5547" }}>{I(p.comingSoon)}</span>
            </div>
          </>
        )}
        <span style={{ display: "block", marginTop: "12px", textAlign: "center", fontWeight: 500, fontSize: "12px", lineHeight: "17px", color: MUTED }}>{I(p.freeNote)}</span>
      </div>
    </div>
  );
}
