// 02 UPLOAD — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function UploadScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sUpload ? (
      <>
        <div data-screen-label="02 Upload" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fadeup .3s ease" }}>
          <div style={{ position: "absolute", left: "0", right: "0", top: "150px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: "12px", color: "#746e63" }}>
              To.
            </span>
            <span style={{ fontWeight: "700", fontSize: "18px", lineHeight: "27px" }}>
              {I(v.t?.toName)}
            </span>
          </div>
          <div style={{ position: "absolute", left: "46px", top: "240px", width: "310px", height: "220px", background: "#F9F4EB" }} />
          <div className="dc-hover-0" onClick={v.openPhotoSheet} style={{ position: "absolute", left: "126px", top: "262px", width: "150px", height: "176px", background: "#D9D9D9", border: "5px solid #fff", boxSizing: "border-box", boxShadow: "0 2px 3.6px #cecece", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", cursor: "pointer", transition: "transform .15s ease" }}>
            <span style={{ fontWeight: "500", fontSize: "36px", lineHeight: "1" }}>
              +
            </span>
            <span style={{ fontWeight: "500", fontSize: "13px", lineHeight: "22px", textAlign: "center", whiteSpace: "pre-line" }}>
              {I(v.t?.upload)}
            </span>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
