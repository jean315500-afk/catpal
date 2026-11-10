// NAV — floating pill with three tabs: Mail (an envelope: your first letter, then your letters — unread ones counted on it), Map (the globe, countries, the feed), Passport.
// The icons are drawn by hand, as with a black pen: a few loose strokes each, a little uneven (lines bow, ends overrun
// or stop just short), the same weight throughout so they read as one set; the active tab becomes a dark pill with its label.
import { each, I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';

const dot = (x: number, y: number) => <circle cx={x} cy={y} r="1.05" fill="currentColor" stroke="none" />;
const ICONS: Record<string, JSX.Element> = {
  // an envelope (your mail): its body in one loose stroke (the end running past the start), the flap's V
  home: <>
    <path d="M4.6 6.1c4.9-.4 9.9-.4 14.9.1.5 3.9.5 7.9.1 11.8-5 .4-10 .4-15 0-.5-3.9-.5-7.9 0-11.9.8-.1 1.6-.1 2.4-.1" />
    <path d="M4.9 6.6c2.3 2.1 4.6 4 7 5.6 2.5-1.6 4.9-3.5 7.2-5.7" />
  </>,
  // the earth: a hand-drawn round (its end running past the start), two coastlines running in from its edge (the
  // land on one side of each, the sea on the other) and a little island
  world: <>
    <path d="M12.6 3.6c4.6.1 8 3.9 7.9 8.6-.1 4.7-3.9 8.4-8.6 8.3-4.7-.1-8.4-3.9-8.3-8.6.1-4.4 3.7-8.1 8.2-8.2.6 0 1.2.1 1.7.3" />
    <path d="M3.8 12.6c1.7.2 3.1-.6 3.4-2 .3-1.3 1.5-1.9 2.6-1.6 1.2.3 1.9-.8 1.4-1.9-.4-.9-1-1.9-1.8-2.9" />
    <path d="M20.3 10.6c-1.5-.5-2.9.1-3.3 1.4-.4 1.1.4 2.1-.3 3-.6.8-1.9.9-2.5 1.8-.5.8-.6 2-.8 3.5" />
    <path d="M8.3 16.4c.8-.5 1.8-.3 2.2.5" />
  </>,
  // a round cat face: ears and cheeks in one stroke, two dot eyes, a little ω mouth
  mycat: <>
    <path d="M5.4 10.1c-.5-2-.3-4.2.4-5.8 1.5.8 2.8 1.8 3.8 2.9 1.6-.4 3.3-.4 4.8 0 1-1.2 2.3-2.2 3.8-2.9.7 1.7.9 3.8.5 5.9.9 1.3 1.3 2.8 1.2 4.3-.3 3.8-3.8 5.9-7.9 5.9s-7.6-2.1-7.9-5.9c-.1-1.5.3-3.1 1.3-4.4" />
    {dot(9.2, 13.1)}{dot(14.8, 13.1)}
    <path d="M10.5 15.3c.4.7 1.1.7 1.5 0 .4.7 1.1.7 1.5 0" />
  </>,
};
/** each drawn a touch askew, as by hand */
const TILT: Record<string, number> = { home: -2, world: 1.5, mycat: 2 };

export default function BottomNav({ v }: { v: Vals }) {
  if (!v.showNav) return null;
  return (
    <nav aria-label="CatPal" className="cp-arr-nav" style={{ position: "absolute", left: "50%", bottom: "18px", transform: "translateX(-50%)", zIndex: 40, display: "flex", alignItems: "center", gap: "4px", padding: "6px", borderRadius: "32px", background: "rgba(255,255,255,.97)", boxShadow: "0 10px 30px rgba(30,25,20,.14), 0 1px 3px rgba(30,25,20,.08)" }}>
      {each(v.tabs, (n: any) => (
        <div className="dc-hover-4" onClick={n.tap} role="button" aria-label={n.label} aria-current={n.on ? "page" : undefined}
          style={{ position: "relative", height: "52px", minWidth: "54px", padding: n.on ? "0 18px 0 14px" : "0 12px", borderRadius: "26px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", background: n.on ? "#22304A" : "transparent", transition: "background .2s ease, padding .2s ease, transform .15s ease" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ color: n.on ? "#fff" : "#2E2B28", transform: `rotate(${TILT[n.id] || 0}deg)`, flex: "none" }}>{ICONS[n.id]}</svg>
          {n.on ? <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--fs-caption)", color: "#fff", whiteSpace: "nowrap" }}>{I(n.label)}</span> : null}
          {n.badge ? <span style={{ position: "absolute", right: n.on ? "3px" : "8px", top: "4px", minWidth: "16px", height: "16px", padding: "0 4px", boxSizing: "border-box", borderRadius: "8px", background: "#E5483D", border: "2px solid #fff", color: "#fff", fontWeight: 700, fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>{I(n.count)}</span> : null}
        </div>
      ))}
    </nav>
  );
}
