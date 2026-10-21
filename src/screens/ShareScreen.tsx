// TODAY'S CAT / SHARE A CAT MOMENT — the photo goes onto a real-looking postcard:
// before: a blank postcard with a photo slot and an empty stamp box;
// after: the photo sits in the slot, the stamp lands and your country's postmark is struck,
// and you write a short note on it. Same data as before (photo, caption, cat name, category, country).
// After joining it opens in "today" mode (no back button, "Skip for now").
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const PAPER = "#FBF6EC", LINE = "#E6DCC9", INK = "#2F2A26";

export default function ShareScreen({ v }: { v: Vals }) {
  if (!v.sShare) return null;
  const has = v.hasSharePhoto, today = v.todayMode;
  return (
    <>
    <div data-screen-label="Share" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fadeup .3s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ padding: today ? "64px 24px 36px" : "56px 24px 36px", display: "flex", flexDirection: "column" }}>
        <span style={{ paddingLeft: today ? "0" : "36px", fontWeight: 700, fontSize: "var(--fs-h2)", lineHeight: "31px", letterSpacing: "var(--ls-heading)", color: "#22304A", fontFamily: "var(--font-heading)" }}>{I(today ? v.t?.tcTitle : v.t?.shareTitle)}</span>
        {today ? <span style={{ marginTop: "6px", fontWeight: 500, fontSize: "var(--fs-caption)", lineHeight: "21px", color: "#6F6A63" }}>{I(v.t?.tcSub)}</span> : null}

        {/* the postcard */}
        <div style={{ position: "relative", marginTop: "22px", borderRadius: "12px", background: PAPER, boxShadow: "0 1px 2px rgba(80,60,30,.06), 0 12px 30px rgba(80,60,30,.10)", padding: "16px 16px 14px" }}>
          {/* stamp box → stamp + postmark once a photo is in */}
          <div style={{ position: "absolute", right: "16px", top: "16px", width: "46px", height: "60px", borderRadius: "3px", border: has ? "none" : "1.5px dashed #D3C6AE", zIndex: 2 }}>
            {has ? <div key={v.sharePhoto} style={{ width: "100%", height: "100%", background: "url(./assets/stamp-1.png) center / contain no-repeat", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.18))", animation: "cp-stampin .5s cubic-bezier(.3,1.2,.5,1) .35s both" }} /> : null}
          </div>
          {has ? <div key={"pm" + v.sharePhoto} style={css(`position:absolute;right:38px;top:30px;width:84px;height:62px;z-index:3;background:url(${R(v.myPm)}) center / contain no-repeat;mix-blend-mode:multiply;animation:cp-postmark .45s ease .8s both`)} /> : null}

          {/* photo slot */}
          <div className={has ? "" : "dc-hover-8"} onClick={v.openPhotoSheet} role="button" aria-label={v.t?.tcPick}
            style={{ position: "relative", marginRight: "60px", aspectRatio: "4 / 5", maxHeight: "330px", borderRadius: "6px", overflow: "hidden", cursor: "pointer", transition: "transform .15s ease",
              background: has ? "#fff" : "repeating-linear-gradient(135deg, #F3ECDE 0 10px, #F7F1E5 10px 20px)", border: has ? "5px solid #fff" : "1.5px dashed #D3C6AE", boxSizing: "border-box", boxShadow: has ? "0 2px 6px rgba(80,60,30,.16)" : "none" }}>
            {has ? (
              <>
                <div key={v.sharePhoto} style={css(`position:absolute;inset:0;background:url(${R(v.sharePhoto)}) center / cover no-repeat;animation:cp-pop .45s cubic-bezier(.34,1.56,.64,1) both`)} />
                <span style={{ position: "absolute", right: "8px", bottom: "8px", padding: "4px 10px", borderRadius: "12px", background: "rgba(255,255,255,.9)", fontWeight: 500, fontSize: "11.5px", color: "#4A443D" }}>{I(v.t?.changePhoto)}</span>
              </>
            ) : (
              <div style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "28px", background: "#fff", boxShadow: "0 6px 16px rgba(80,60,30,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 400, color: "#22304A" }}>+</div>
                <span style={{ fontWeight: 500, fontSize: "var(--fs-body)", lineHeight: "22px", textAlign: "center", whiteSpace: "pre-line", color: "#4A443D" }}>{I(v.t?.upload)}</span>
              </div>
            )}
          </div>

          {/* note on the card */}
          <div style={{ marginTop: "12px", backgroundImage: `repeating-linear-gradient(transparent 0 27px, ${LINE} 27px 28px)`, backgroundPosition: "0 2px" }}>
            <textarea value={v.shareCaption ?? ""} onChange={v.setShareCaption} placeholder={v.t?.tcNotePh} maxLength={200} rows={2} aria-label={v.t?.caption}
              className="cp-hand" style={{ display: "block", width: "100%", border: "none", outline: "none", background: "transparent", resize: "none", padding: "0", fontSize: "21px", lineHeight: "28px", color: INK, fontFamily: '"Caveat","Gaegu","Klee One",cursive' }} />
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <label style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "var(--fs-caption)" }}>🐈</span>
              <input value={v.shareCatName ?? ""} onChange={v.setShareCatName} placeholder={v.t?.catName} maxLength={30} aria-label={v.t?.catName}
                style={{ flex: "1", minWidth: "0", border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "var(--fs-caption)", color: INK, padding: "6px 0" }} />
            </label>
            <span style={{ flex: "none", fontWeight: 500, fontSize: "11.5px", color: "#A89F8D" }}>{I(v.captionCount)}{"/200"}</span>
          </div>
        </div>

        {/* small options: category + where */}
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          {each(v.shareCats, (b: any) => (
            <div onClick={b.tap} role="button" aria-pressed={b.color === "#22304A"} style={css(`height:36px;padding:0 14px;border-radius:18px;display:flex;align-items:center;cursor:pointer;background:${b.color === "#22304A" ? "#22304A" : "#F4F1EC"};transition:background .15s ease`)}>
              <span style={css(`font-weight:700;font-size:12.5px;white-space:nowrap;color:${b.color === "#22304A" ? "#fff" : "#6F6A63"}`)}>{I(b.label)}</span>
            </div>
          ))}
          <label style={{ position: "relative", height: "36px", padding: "0 30px 0 12px", borderRadius: "18px", background: "#F4F1EC", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <span style={{ fontSize: "var(--fs-caption-sm)" }}>📍</span>
            <select value={v.shareCountry ?? ""} onChange={v.setShareCountry} aria-label={v.t?.where} style={{ appearance: "none", WebkitAppearance: "none", border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "12.5px", color: "#4A443D", maxWidth: "150px", cursor: "pointer" }}>
              {each(v.countryOpts, (o: any) => <option value={o.cc}>{o.label}</option>)}
            </select>
            <span style={{ position: "absolute", right: "12px", fontSize: "10px", color: "#8E8A84", pointerEvents: "none" }}>▾</span>
          </label>
        </div>

        {v.shareErr ? <span role="alert" style={{ marginTop: "12px", fontWeight: 500, fontSize: "var(--fs-caption-sm)", lineHeight: "19px", color: "#E5483D" }}>{I(v.shareErr)}</span> : null}
        <div className="dc-hover-0" onClick={v.postMoment} role="button" aria-disabled={!v.shareReady}
          style={css(`position:relative;overflow:hidden;margin-top:20px;height:56px;border-radius:28px;background:${v.shareBusy ? "#FBF5EA" : v.shareReady ? "#22304A" : "#C9C3B8"};box-shadow:${v.shareBusy ? "inset 0 0 0 1.5px #EADFCB" : "none"};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s ease,background .2s ease`)}>
          {v.shareBusy ? <span className="cp-catrun" aria-hidden="true"><img src="./assets/cat-run.gif" alt="" /></span> : null}
          <span style={{ position: "relative", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: v.shareBusy ? "#7A5A43" : "#fff" }}>{I(v.shareBusy ? v.t?.post : today ? v.t?.tcSend : v.t?.post)}</span>
        </div>
        {today ? (
          <span onClick={v.skipToday} role="button" style={{ marginTop: "14px", alignSelf: "center", padding: "8px 12px", fontWeight: 500, fontSize: "var(--fs-caption)", color: "#8E8A84", cursor: "pointer" }}>{I(v.t?.tcSkip)}</span>
        ) : null}
      </div>
    </div>

      {v.sharedFx ? (
        <div style={{ position: "absolute", inset: "0", zIndex: 50, background: "#fff", animation: "cp-fade .2s ease" }}>
          {/* the postcard drops into the envelope (Stamp screen motion) */}
          <div style={{ position: "absolute", left: "50%", top: "150px", width: "290px", marginLeft: "-145px", height: "110px", background: "#F3ECDD", clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
          <div style={{ position: "absolute", left: "50%", top: "258px", width: "290px", marginLeft: "-145px", height: "170px", background: "#F3ECDD", boxShadow: "0 3px 12px rgba(0,0,0,.07)", transformOrigin: "50% 100%", animation: "cp-gulp .35s ease .62s" }} />
          <div style={{ position: "absolute", left: "50%", top: "186px", marginLeft: "-59px", width: "118px", height: "150px", background: "#fff", padding: "5px", boxSizing: "border-box", boxShadow: "0 2px 6px rgba(0,0,0,.14)", animation: "cp-tuck .95s cubic-bezier(.3,1.1,.5,1) .1s both" }}>
            <div style={css(`width:100%;height:100%;background:url(${R(v.sharePhoto)}) center / cover no-repeat`)} />
          </div>
          <div style={{ position: "absolute", left: "50%", top: "258px", width: "290px", marginLeft: "-145px", height: "170px", transformOrigin: "50% 100%", animation: "cp-gulp .35s ease .62s", filter: "drop-shadow(0 -2px 3px rgba(0,0,0,.08))", pointerEvents: "none" }}>
            <div style={{ width: "100%", height: "100%", background: "#F9F4EB", clipPath: "polygon(0 0,50% 34%,100% 0,100% 100%,0 100%)" }} />
          </div>
          <span style={{ position: "absolute", left: "0", right: "0", top: "470px", textAlign: "center", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "26px", animation: "cp-fadeup .4s ease .9s both", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>{I(v.t?.shared)}</span>
        </div>
      ) : null}
    </>
  );
}
