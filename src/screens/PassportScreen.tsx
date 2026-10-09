// PASSPORT — converted from the Claude Design prototype (Cat Pal v6.dc.html).
import { css, each, I, R } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import WalletSection from '../solana/WalletSection';
import CatStampSave from '../solana/CatStampSave';

export default function PassportScreen({ v }: { v: Vals }) {
  return (
    <>
    {v.sPassport ? (
      <>
        <div data-screen-label="Passport" style={{ position: "absolute", inset: "0", background: "#fff", animation: "cp-fade .25s ease", overflowY: "auto", scrollbarWidth: "none" }}>
          <div style={{ padding: "58px 25px 120px", display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "700", fontSize: "21px", lineHeight: "30px" }}>
              {I(v.t?.passportTitle)}
            </span>
            <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "18px", color: "#a89f8d" }}>
              {I(v.t?.passportSub)}
            </span>
            <div style={{ marginTop: "16px", background: "#F9F4EB", padding: "18px", display: "flex", gap: "16px", alignItems: "center" }}>
              <div onClick={v.openMe} style={{ flex: "none", width: "64px", height: "76px", boxShadow: "0 0 0 4px #FEFEFE,0 2px 4px #cecece", overflow: "hidden", transform: "rotate(-3deg)", cursor: "pointer" }}>
                {v.hasPhoto ? (
                  <>
                    <div style={css(`width:100%;height:100%;background:url(${R(v.myPhoto)}) center / cover no-repeat`)} />
                  </>
                ) : null}
                {v.noPhoto ? (
                  <>
                    <image-slot id="my-cat" shape="rect" placeholder="🐈" />
                  </>
                ) : null}
              </div>
              <div style={{ flex: "1", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "6px" }}>
                {each(v.ppStats, (s) => (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                      <span style={{ fontWeight: "700", fontSize: "22px", lineHeight: "28px" }}>
                        {I(s?.n)}
                      </span>
                      <span style={{ fontWeight: "500", fontSize: "11px", lineHeight: "15px", color: "#746e63", textAlign: "center" }}>
                        {I(s?.l)}
                      </span>
                    </div>
                  </>
                ))}
              </div>
            </div>
            <WalletSection />
            <div style={{ marginTop: "18px", display: "flex", gap: "6px", padding: "4px", borderRadius: "22px", background: "#F6F6F6" }}>
              {each(v.ppTabs, (b) => (
                <>
                  <div onClick={b?.tap} style={css(`flex:1;height:36px;border-radius:18px;background:${R(b?.bg)};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s ease;box-shadow:${R(b?.shadow)}`)}>
                    <span style={css(`font-weight:700;font-size:13px;color:${R(b?.color)}`)}>
                      {I(b?.label)}
                    </span>
                  </div>
                </>
              ))}
            </div>
            {v.ppShowStamps ? (
              <>
                <div style={{ marginTop: "20px", padding: "22px 16px 26px", background: "#F9F4EB", boxShadow: "inset 0 0 0 1px #EFE7D6", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", columnGap: "6px", rowGap: "18px" }}>
                  {each(v.stampBook, (s) => (
                    <>
                      <div className="dc-hover-11" onClick={s?.open} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "pointer", transition: "transform .15s ease" }}>
                        <div style={css(`position:relative;width:100%;height:76px;transform:translateY(${R(s?.dy)}px)`)}>
                          <div style={css(`position:absolute;inset:0;background:url(${R(s?.img)}) center / contain no-repeat;mix-blend-mode:multiply;opacity:${R(s?.opacity)};filter:${R(s?.filter)};transform:rotate(${R(s?.rot)}deg)`)} />
                          {s?.locked ? (
                            <>
                              <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontWeight: "700", fontSize: "22px", color: "#a89f8d" }}>
                                  ?
                                </span>
                              </div>
                            </>
                          ) : null}
                        </div>
                        <span style={{ fontWeight: "700", fontSize: "11px", lineHeight: "15px", textAlign: "center" }}>
                          {I(s?.label)}
                        </span>
                        <span style={{ marginTop: "-6px", fontWeight: "500", fontSize: "10px", lineHeight: "14px", color: "#a89f8d", textAlign: "center" }}>
                          {I(s?.sub)}
                        </span>
                        {/* Cat Stamp from the first opened letter of this pal: "Save on Solana" (Devnet) */}
                        {s?.catStamp ? <CatStampSave stamp={s.catStamp} /> : null}
                      </div>
                    </>
                  ))}
                </div>
              </>
            ) : null}
            {v.ppShowMine ? (
              <>
                {v.noMine ? (
                  <div style={{ marginTop: "20px", height: "124px", border: "2px dashed #E7E2D8", borderRadius: "14px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
                    <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "17px", color: "#a89f8d", textAlign: "center" }}>{I(v.t?.noMyMoments)}</span>
                    <span onClick={v.openShare} role="button" style={{ fontWeight: "700", fontSize: "13px", textDecoration: "underline", textUnderlineOffset: "3px", cursor: "pointer" }}>{I(v.t?.shareMoment)}</span>
                  </div>
                ) : null}
                <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: "16px", rowGap: "20px" }}>
                  {each(v.mineCards, (c) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ background: "#fff", padding: "5px", boxShadow: "0 2px 4px #cecece" }}>
                        <img src={c?.photo} alt={c?.caption} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 5", objectFit: "cover" }} />
                      </div>
                      <span style={{ fontWeight: "500", fontSize: "12px", lineHeight: "17px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{I(c?.caption)}</span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "700", fontSize: "12px", color: "#010002" }}>{"♥ "}{I(c?.likes)}<span style={{ fontWeight: "500", color: "#a89f8d" }}>{" · "}{I(c?.date)}</span></span>
                        <span onClick={c?.remove} role="button" style={{ fontWeight: "500", fontSize: "11px", color: "#a89f8d", textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer" }}>{I(v.t?.deleteMoment)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {v.ppShowJournal ? (
              <>
                <span style={{ marginTop: "20px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: "11px", color: "#a89f8d", letterSpacing: ".12em" }}>
                  {I(v.t?.month)}
                </span>
                <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
                  {each(v.weekDays, (w) => (
                    <>
                      <span style={{ textAlign: "center", fontWeight: "500", fontSize: "10px", color: "#a89f8d", lineHeight: "20px" }}>
                        {I(w)}
                      </span>
                    </>
                  ))}
                  {each(v.calCells, (d) => (
                    <>
                      <div style={{ position: "relative", height: "74px", borderTop: "1px solid #E7E2D8", boxSizing: "border-box" }}>
                        <span style={css(`position:absolute;left:4px;top:2px;font-weight:${R(d?.weight)};font-size:11px;color:${R(d?.color)}`)}>
                          {I(d?.n)}
                        </span>
                        {d?.sent ? (
                          <>
                            <div style={{ position: "absolute", left: "5px", top: "20px", width: "28px", height: "36px", boxShadow: "0 0 0 2.5px #FEFEFE,0 1px 2.3px #cecece", background: "repeating-linear-gradient(45deg,#efe9dd 0 4px,#e3dccb 4px 8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", transform: "rotate(-3deg)" }}>
                              🐈
                            </div>
                          </>
                        ) : null}
                        {d?.recv ? (
                          <>
                            <div style={{ position: "absolute", left: "12px", top: "26px", width: "28px", height: "36px", border: "2.5px solid #fff", boxSizing: "border-box", boxShadow: "0 2px 3.6px #cecece", background: "repeating-linear-gradient(45deg,#e9e0cd 0 4px,#dbd0b6 4px 8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", transform: "rotate(3deg)" }}>
                              🐱
                            </div>
                          </>
                        ) : null}
                      </div>
                    </>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </>
    ) : null}
    </>
  );
}
