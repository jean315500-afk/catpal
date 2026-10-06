// PHOTO SHEET — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function PhotoSheet({ v }: { v: Vals }) {
  return (
    <>
    {v.sheetPhoto ? (
      <>
        <div onClick={v.closeSheet} style={{ position: "absolute", inset: "0", background: "rgba(1,0,2,.35)", zIndex: "70", animation: "cp-fade .2s ease" }} />
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", zIndex: "71", background: "#fff", borderRadius: "22px 22px 0 0", padding: "14px 22px 34px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "14px", animation: "cp-sheet .28s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ alignSelf: "center", width: "38px", height: "4px", borderRadius: "2px", background: "#E7E2D8" }} />
          <span style={{ fontWeight: "700", fontSize: "16px", lineHeight: "24px" }}>
            {I(v.t?.sheetTitle)}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="dc-hover-2" onClick={v.pickAlbum} style={{ height: "96px", borderRadius: "16px", background: "#F9F4EB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" }}>
              <span style={{ fontSize: "28px", lineHeight: "1" }}>
                🖼
              </span>
              <span style={{ fontWeight: "700", fontSize: "14px" }}>
                {I(v.t?.album)}
              </span>
            </div>
            <div className="dc-hover-2" onClick={v.pickCamera} style={{ height: "96px", borderRadius: "16px", background: "#010002", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "transform .15s ease" }}>
              <span style={{ fontSize: "28px", lineHeight: "1" }}>
                📷
              </span>
              <span style={{ fontWeight: "700", fontSize: "14px", color: "#fff" }}>
                {I(v.t?.camera)}
              </span>
            </div>
          </div>
          <div onClick={v.closeSheet} style={{ height: "48px", borderRadius: "14px", background: "#F6F6F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontWeight: "500", fontSize: "14px", color: "#746e63" }}>
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
