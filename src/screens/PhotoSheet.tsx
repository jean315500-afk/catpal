// PHOTO SHEET — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

/** line icons in the bottom nav's style (24 × 24, 1.8 stroke, round ends) */
const icon = (color: string, d: JSX.Element) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
/** the album: a photo, a little hill and the sun */
const ALBUM = <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="9.5" r="1.6" /><path d="m4 17.5 4.6-4.6a1.5 1.5 0 0 1 2.1 0l1.8 1.8 2.6-2.6a1.5 1.5 0 0 1 2.1 0L20 15" /></>;
/** the camera: its body, the bump on top and the lens */
const CAMERA = <><path d="M4.5 8h2.6l1.5-2.2a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4L16.9 8h2.6A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8z" /><circle cx="12" cy="13.2" r="3.4" /></>;

export default function PhotoSheet({ v }: { v: Vals }) {
  return (
    <>
    {v.sheetPhoto ? (
      <>
        <div onClick={v.closeSheet} style={{ position: "absolute", inset: "0", background: "rgba(1,0,2,.35)", zIndex: "70", animation: "cp-fade .2s ease" }} />
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: "71", background: "#fff", borderRadius: "22px 22px 0 0", padding: "14px 22px 34px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "14px", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ alignSelf: "center", width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8" }} />
          <span style={{ fontWeight: 700, fontSize: "16px", lineHeight: "24px", fontFamily: "var(--font-heading)", letterSpacing: "var(--ls-heading)" }}>
            {I(v.t?.sheetTitle)}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="dc-hover-2" onClick={v.pickAlbum} style={{ height: "96px", borderRadius: "16px", background: "#F9F4EB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" }}>
              {icon("#22304A", ALBUM)}
              <span style={{ fontWeight: "700", fontSize: "var(--fs-caption)" }}>
                {I(v.t?.album)}
              </span>
            </div>
            <div className="dc-hover-2" onClick={v.pickCamera} style={{ height: "96px", borderRadius: "16px", background: "#22304A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" }}>
              {icon("#fff", CAMERA)}
              <span style={{ fontWeight: "700", fontSize: "var(--fs-caption)", color: "#fff" }}>
                {I(v.t?.camera)}
              </span>
            </div>
          </div>
          <div onClick={v.closeSheet} style={{ height: "48px", borderRadius: "14px", background: "#F6F6F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontWeight: "500", fontSize: "var(--fs-caption)", color: "#746e63" }}>
              {I(v.t?.cancel)}
            </span>
          </div>
        </div>
      </>
    ) : null}
    <input ref={v.albumRef} type="file" accept="image/*" onChange={v.onAlbum} style={{ display: "none" }} />
    <input ref={v.replyPhotoRef} type="file" accept="image/*" onChange={v.onReplyPhoto} style={{ display: "none" }} />
    </>
  );
}
