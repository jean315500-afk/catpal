// 03 CAMERA — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

export default function CameraScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sCamera ? (
      <>
        <div data-screen-label="03 Camera" style={{ position: "absolute", inset: "0", background: "#161412", animation: "cp-fade .25s ease" }}>
          <div style={{ position: "absolute", left: "0", right: "0", top: "100px", height: "560px" }}>
            <video ref={v.videoRef} autoPlay={true} playsInline={true} muted={true} style={{ width: "100%", height: "100%", objectFit: "cover", background: "#161412" }} />
            {v.camErr ? (
              <>
                <div style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", padding: "0 40px", textAlign: "center" }}>
                  <span style={{ fontWeight: "500", fontSize: "14px", lineHeight: "22px", color: "#fff" }}>
                    {I(v.t?.camErr)}
                  </span>
                  <div onClick={v.pickAlbum} style={{ height: "44px", padding: "0 20px", borderRadius: "22px", background: "#fff", display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px" }}>
                      {I(v.t?.album)}
                    </span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div onClick={v.back} style={{ position: "absolute", left: "20px", top: "50px", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(60,58,54,.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ color: "#fff", fontSize: "15px", lineHeight: "1" }}>
              ✕
            </span>
          </div>
          <div onClick={v.pickAlbum} style={{ position: "absolute", right: "20px", top: "50px", width: "34px", height: "34px", borderRadius: "8px", background: "rgba(60,58,54,.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: "14px" }}>
              🖼
            </span>
          </div>
          <div style={{ position: "absolute", left: "0", right: "0", bottom: "36px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="dc-hover-3" onClick={v.capture} style={{ width: "66px", height: "66px", borderRadius: "50%", border: "4px solid #fff", boxSizing: "border-box", background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#fff" }} />
            </div>
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
