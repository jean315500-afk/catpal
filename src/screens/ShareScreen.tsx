// SHARE A CAT MOMENT — category, photo (album/camera sheet), caption, cat name, country.
// The upload polaroid comes from the Upload screen; the "shared" moment replays
// the Stamp screen's photo-into-envelope animation.
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { field, label } from './OnboardScreen';

export default function ShareScreen({ v }: { v: Vals }) {
  if (!v.sShare) return null;
  return (
    <>
    <div data-screen-label="Share" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ padding: "56px 25px 40px", display: "flex", flexDirection: "column" }}>
        <span style={{ paddingLeft: "36px", fontWeight: 700, fontSize: "19px", lineHeight: "28px" }}>{I(v.t?.shareTitle)}</span>
        <div style={{ marginTop: "18px", display: "flex", gap: "6px", padding: "4px", borderRadius: "22px", background: "#F6F6F6" }}>
          {each(v.shareCats, (b: any) => (
            <div onClick={b.tap} role="button" style={css(`flex:1;height:36px;border-radius:18px;background:${R(b.bg)};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s ease;box-shadow:${R(b.shadow)}`)}>
              <span style={css(`font-weight:700;font-size:13px;white-space:nowrap;color:${R(b.color)}`)}>{I(b.label)}</span>
            </div>
          ))}
        </div>

        {/* photo */}
        <div style={{ position: "relative", marginTop: "16px", height: v.hasSharePhoto ? "330px" : "220px", background: "#F9F4EB", display: "flex", alignItems: "center", justifyContent: "center", transition: "height .25s ease" }}>
          {v.hasSharePhoto ? (
            <div className="dc-hover-1" onClick={v.openPhotoSheet} style={{ width: "236px", height: "290px", background: "#fff", padding: "6px", boxSizing: "border-box", boxShadow: "0 2px 3.6px #cecece", transform: "rotate(-2deg)", cursor: "pointer", transition: "transform .15s ease", animation: "cp-pop .4s cubic-bezier(.34,1.56,.64,1) both" }}>
              <div style={css(`width:100%;height:100%;background:url(${R(v.sharePhoto)}) center / cover no-repeat`)} />
            </div>
          ) : (
            <div className="dc-hover-0" onClick={v.openPhotoSheet} role="button" style={{ width: "150px", height: "176px", background: "#D9D9D9", border: "5px solid #fff", boxSizing: "border-box", boxShadow: "0 2px 3.6px #cecece", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", cursor: "pointer", transition: "transform .15s ease" }}>
              <span style={{ fontWeight: 500, fontSize: "36px", lineHeight: "1" }}>+</span>
              <span style={{ fontWeight: 500, fontSize: "13px", lineHeight: "22px", textAlign: "center", whiteSpace: "pre-line" }}>{I(v.t?.addPhoto)}</span>
            </div>
          )}
          {v.hasSharePhoto ? (
            <span onClick={v.openPhotoSheet} role="button" style={{ position: "absolute", right: "12px", bottom: "10px", fontWeight: 600, fontSize: "12px", color: "#746e63", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(v.t?.changePhoto)}</span>
          ) : null}
        </div>

        <label style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ ...label, display: "flex", justifyContent: "space-between" }}><span>{I(v.t?.caption)}</span><span style={{ fontWeight: 500, color: "#a89f8d" }}>{I(v.captionCount)}{"/200"}</span></span>
          <textarea value={v.shareCaption ?? ""} onChange={v.setShareCaption} placeholder={v.t?.captionPh} maxLength={200} rows={3} style={{ ...field, height: "auto", minHeight: "88px", padding: "14px 16px", lineHeight: "23px", resize: "none" }} />
        </label>
        <label style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={label}>{I(v.t?.catName)}</span>
          <input value={v.shareCatName ?? ""} onChange={v.setShareCatName} placeholder={v.t?.catNamePh} maxLength={30} style={field} />
        </label>
        <label style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={label}>{I(v.t?.where)}</span>
          <select value={v.shareCountry ?? ""} onChange={v.setShareCountry} style={{ ...field, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
            {each(v.countryOpts, (o: any) => <option value={o.cc}>{o.label}</option>)}
          </select>
        </label>
        {v.shareErr ? <span style={{ marginTop: "12px", fontWeight: 500, fontSize: "13px", lineHeight: "19px", color: "#FF4800" }}>{I(v.shareErr)}</span> : null}
        <div className="dc-hover-0" onClick={v.postMoment} role="button" style={css(`margin-top:22px;height:56px;border-radius:15px;background:${v.shareReady || v.shareBusy ? "#010002" : "#B9B2A4"};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s ease,background .15s ease`)}>
          <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: "15px", color: "#fff", animation: v.shareBusy ? "cp-pulse 1.4s ease infinite" : "none" }}>{I(v.t?.post)}</span>
        </div>
      </div>
    </div>

      {v.sharedFx ? (
        <div style={{ position: "absolute", inset: "0", zIndex: 50, background: "#fff", animation: "cp-fade .2s ease" }}>
          {/* Stamp screen: the photo drops into the envelope */}
          <div style={{ position: "absolute", left: "50%", top: "150px", width: "290px", marginLeft: "-145px", height: "110px", background: "#F3ECDD", clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
          <div style={{ position: "absolute", left: "50%", top: "258px", width: "290px", marginLeft: "-145px", height: "170px", background: "#F3ECDD", boxShadow: "0 3px 12px rgba(0,0,0,.07)", transformOrigin: "50% 100%", animation: "cp-gulp .35s ease .62s" }} />
          <div style={{ position: "absolute", left: "50%", top: "186px", marginLeft: "-59px", width: "118px", height: "150px", background: "#fff", padding: "5px", boxSizing: "border-box", boxShadow: "0 2px 6px rgba(0,0,0,.14)", animation: "cp-tuck .95s cubic-bezier(.3,1.1,.5,1) .1s both" }}>
            <div style={css(`width:100%;height:100%;background:url(${R(v.sharePhoto)}) center / cover no-repeat`)} />
          </div>
          <div style={{ position: "absolute", left: "50%", top: "258px", width: "290px", marginLeft: "-145px", height: "170px", transformOrigin: "50% 100%", animation: "cp-gulp .35s ease .62s", filter: "drop-shadow(0 -2px 3px rgba(0,0,0,.08))", pointerEvents: "none" }}>
            <div style={{ width: "100%", height: "100%", background: "#F9F4EB", clipPath: "polygon(0 0,50% 34%,100% 0,100% 100%,0 100%)" }} />
          </div>
          <span style={{ position: "absolute", left: "0", right: "0", top: "470px", textAlign: "center", fontWeight: 700, fontSize: "17px", lineHeight: "26px", animation: "cp-fadeup .4s ease .9s both" }}>{I(v.t?.shared)}</span>
        </div>
      ) : null}
    </>
  );
}
