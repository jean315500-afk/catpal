// ONBOARDING — nickname + country, then anonymous sign-in (Supabase).
// Reuses the Intro envelope: the stamp and the chosen country's postmark.
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export const field = { height: "52px", borderRadius: "14px", background: "#F6F6F6", border: "none", outline: "none", padding: "0 16px", boxSizing: "border-box", fontFamily: "Pretendard,sans-serif", fontWeight: 500, fontSize: "16px", color: "#010002", width: "100%" } as const;
export const label = { fontWeight: 700, fontSize: "12px", lineHeight: "18px", color: "#746e63" } as const;

export default function OnboardScreen({ v }: { v: Vals }) {
  if (!v.sOnboard) return null;
  return (
    <div data-screen-label="Onboard" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ padding: "96px 25px 40px", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        {/* envelope preview */}
        <div style={{ position: "relative", alignSelf: "center", width: "310px", maxWidth: "100%", height: "170px", borderRadius: "14px", background: "#F9F4EB", boxShadow: "0 2px 10px rgba(0,0,0,.05)" }}>
          <span style={{ position: "absolute", left: "22px", top: "22px", fontFamily: "Inter,sans-serif", fontSize: "12px", whiteSpace: "nowrap" }}>
            {"To. "}{v.onbNick ? I(v.onbNick) : "CatPal"}
          </span>
          <img src="./assets/stamp-1.png" alt="stamp" style={{ position: "absolute", right: "30px", top: "14px", width: "62px", height: "84px", objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.18))" }} />
          <div key={v.onbPm} style={css(`position:absolute;right:84px;top:14px;width:118px;height:86px;background:url(${R(v.onbPm)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:.92;transform:rotate(-8deg);animation:cp-postmark .5s ease both`)} />
          <span style={{ position: "absolute", left: "22px", bottom: "18px", fontWeight: 700, fontSize: "26px", lineHeight: "1" }}>{I(v.onbFlag)}</span>
        </div>
        <span style={{ marginTop: "30px", fontWeight: 700, fontSize: "20px", lineHeight: "30px" }}>{I(v.t?.onbTitle)}</span>
        <span style={{ fontWeight: 500, fontSize: "14px", lineHeight: "22px", color: "#746e63" }}>{I(v.t?.onbSub)}</span>

        <label style={{ marginTop: "22px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={label}>{I(v.t?.onbNick)}</span>
          <input value={v.onbNick ?? ""} onChange={v.setOnbNick} placeholder={v.t?.onbNickPh} maxLength={24} autoComplete="nickname" style={field} />
        </label>
        <label style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={label}>{I(v.t?.onbCountry)}</span>
          <select value={v.onbCountry ?? ""} onChange={v.setOnbCountry} style={{ ...field, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
            <option value="" disabled>{v.t?.onbPick}</option>
            {each(v.countryOpts, (o: any) => <option value={o.cc}>{o.label}</option>)}
          </select>
        </label>
        {v.onbErr ? <span style={{ marginTop: "12px", fontWeight: 500, fontSize: "13px", lineHeight: "19px", color: "#FF4800" }}>{I(v.onbErr)}</span> : null}
        <div className="dc-hover-0" onClick={v.join} role="button" style={css(`margin-top:26px;height:61px;border-radius:15px;background:${v.onbReady || v.onbBusy ? "#010002" : "#B9B2A4"};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s ease,background .15s ease`)}>
          <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: "15px", color: "#fff", animation: v.onbBusy ? "cp-pulse 1.4s ease infinite" : "none" }}>{I(v.t?.onbGo)}</span>
        </div>
      </div>
    </div>
  );
}
