// 01 INTRO / 01 INTRO2 — first-time visitors only (no profile yet), design images in assets/onboarding:
// 1) a letter with today's cat slides into an open envelope and gets the Rome postmark;
// 2) "Let's Start!" turns the envelope over to its front (from Seoul → to Sydney, stamped);
// 3) the world map: letters fly from Seoul to cat lovers everywhere and back;
// 4) "Let's Start!" → nickname & country → Today's cat. Reduced motion shows the end states.
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

// Layers cut from the design's open-envelope image (669×654): back, letter, front pocket.
const A = "./assets/onboarding/";
const LETTER = { left: "16.44%", top: "3.06%", width: "65.17%", height: "71.25%" };

/** 01 Intro: today's letter slides into the open envelope, then the Rome postmark lands. */
function OpenEnvelope() {
  return (
    <div aria-hidden="true" style={{ position: "relative", width: "300px", height: "294px" }}>
      <img src={A + "env-back.webp"} alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }} />
      <img src={A + "letter.webp"} alt="" style={{ position: "absolute", ...LETTER, animation: "cp-letterin 1.15s cubic-bezier(.3,1.1,.5,1) .25s both" }} />
      <img src={A + "env-front.webp"} alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", right: "-26px", bottom: "-6px", width: "112px", height: "86px", background: "url(./assets/pm/roma.png) center / contain no-repeat", mixBlendMode: "multiply", animation: "cp-postmark .45s ease 1.45s both" }} />
    </div>
  );
}

/** 01 Intro2: the sealed envelope turns over — from Seoul to Sydney, stamped. */
function EnvelopeFront() {
  return (
    <div aria-hidden="true" style={{ position: "relative", width: "300px", height: "294px", display: "flex", alignItems: "center" }}>
      <img src={A + "envelope-front.webp"} alt="" style={{ width: "300px", height: "204px", filter: "drop-shadow(0 12px 22px rgba(80,60,30,.16))", animation: "cp-flipin .6s cubic-bezier(.2,.8,.2,1) .1s both" }} />
    </div>
  );
}

/** 01 Intro3: on the world map, letters fly from you to cat lovers everywhere and replies fly back. */
function WorldLetters({ src }: { src: string }) {
  return (
    <div aria-hidden="true" style={{ position: "relative", width: "100%", maxWidth: "346px", height: "236px", margin: "29px 0", borderRadius: "28px", overflow: "hidden", background: "#E8EFF3", animation: "cp-rise2 .5s cubic-bezier(.2,.8,.2,1) both" }}>
      <iframe src={src} title="" tabIndex={-1} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", border: "0", pointerEvents: "none", background: "#E8EFF3" }} />
    </div>
  );
}

export default function IntroScreen({ v }: { v: Vals }) {
  if (!v.sIntro) return null;
  return (
    <div data-screen-label="01 Intro" style={{ position: "absolute", inset: "0", background: "transparent", animation: "cp-fadeup .3s ease", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 28px", boxSizing: "border-box" }}>
      <div style={{ flex: "1.15", minHeight: "40px" }} />
      {(v.introStep || 0) === 0 ? <OpenEnvelope key="open" /> : v.introStep === 1 ? <EnvelopeFront key="front" /> : <WorldLetters key="world" src={v.introMapSrc} />}
      <div style={{ flex: "1", minHeight: "24px" }} />
      <span style={{ fontWeight: 700, fontSize: "var(--fs-h1)", lineHeight: "31px", letterSpacing: "var(--ls-heading)", textAlign: "center", color: "#22304A", fontFamily: "var(--font-heading)" }}>{I(v.introStep === 2 ? v.t?.obTitle3 : v.t?.obTitle)}</span>
      <span style={{ marginTop: "10px", maxWidth: "290px", fontWeight: 500, fontSize: "var(--fs-body)", lineHeight: "23px", textAlign: "center", color: "#6F6A63" }}>{I(v.introStep === 2 ? v.t?.obDesc3 : v.t?.obDesc)}</span>
      <div style={{ flex: "1", minHeight: "28px" }} />
      <div className="dc-hover-0" onClick={v.introNext} role="button" style={{ width: "100%", maxWidth: "320px", height: "56px", borderRadius: "28px", background: "#22304A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .15s ease", boxShadow: "0 10px 22px rgba(20,15,10,.16)" }}>
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-button)", color: "#fff" }}>{I(v.t?.start)}</span>
      </div>
      <div style={{ height: "max(44px, 7%)" }} />
    </div>
  );
}
