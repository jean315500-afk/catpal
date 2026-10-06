// BACK BUTTON — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import type { Vals } from '../dc/runtime';

export default function BackButton({ v }: { v: Vals }) {
  return (
    <>
    {v.showBack ? (
      <>
        <div className="dc-hover-12" onClick={v.back} style={{ position: "absolute", left: "12px", top: "50px", width: "40px", height: "40px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: "45", transition: "background .15s ease" }}>
          <div style={{ width: "10px", height: "10px", borderLeft: "2px solid #010002", borderBottom: "2px solid #010002", transform: "rotate(45deg)", marginLeft: "4px" }} />
        </div>
      </>
    ) : null}
    </>
  );
}
