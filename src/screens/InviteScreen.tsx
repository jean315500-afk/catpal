// A LETTER BY LINK ("?letter=<token>"): a letter a friend sent you before you had Cat Pal. No sign-in to read it:
// the sealed envelope (the Mailbox's, its stamp from where it was sent), tap it and it opens as any letter does
// (MailboxLetters' OpenLetter): the cat's photo, the words, and "Write back" — writing back is when you join (the
// usual letter, in reply; your name and country asked as it's sent). A link that's gone (cancelled, expired, already
// answered by someone else, or not valid) says so, quietly, with the way into the app.
import { useEffect, useState } from 'react';
import { I } from '../dc/runtime';
import type { Vals } from '../dc/runtime';
import { EnvelopeCard, InkDefs, OpenLetter, type MailItem } from './MailboxLetters';

const INK = "#22304A", MUTED = "#5E6A80";
const W = 292;

export default function InviteScreen({ v }: { v: Vals }) {
  const p = v.ivPage, T = p?.T || {};
  const [opened, setOpened] = useState<DOMRect | null>(null);
  useEffect(() => { if (!v.sInvite) setOpened(null); }, [v.sInvite]);
  if (!v.sInvite || !p) return null;
  const letter: (MailItem & { writeBackLabel?: string }) | null = p.letter;
  const action = { height: "50px", padding: "0 24px", borderRadius: "25px", background: INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 18px rgba(20,15,10,.14)", transition: "transform .15s ease" } as const;
  return (
    <>
      <InkDefs />
      <div data-screen-label="Letter by link" style={{ position: "absolute", inset: "0", background: "transparent", overflowY: "auto", scrollbarWidth: "none", animation: "cp-fade .3s ease" }}>
        <div style={{ minHeight: "100%", maxWidth: "420px", margin: "0 auto", boxSizing: "border-box", padding: "70px 22px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          {p.phase === "ready" && letter ? (
            <>
              <h1 className="cp-h2" style={{ margin: "0", color: INK, textWrap: "balance" } as any}>{I(T.ivTitle)}</h1>
              {p.from ? <p style={{ margin: "8px 0 0", fontWeight: 400, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: MUTED }}>{I(p.from)}</p> : null}
              {/* the envelope, sealed: tap to open */}
              <div onClick={(e) => setOpened((e.currentTarget as HTMLElement).getBoundingClientRect())} role="button" aria-label={T.mbTap} className="dc-hover-2"
                style={{ marginTop: "34px", cursor: "pointer", visibility: opened ? "hidden" : "visible", animation: "cp-rise2 .6s cubic-bezier(.2,.8,.2,1) .15s both" }}>
                <EnvelopeCard c={letter} w={W} tap={T.mbTap} />
              </div>
              <span style={{ marginTop: "26px", fontWeight: 500, fontSize: "12.5px", color: "#7A8091" }}>{I(T.ivNoSignup)}</span>
            </>
          ) : p.phase === "loading" ? (
            /* reading the link: the envelope, faint, while it comes */
            <img src="./assets/onboarding-preview/envelope-closed.png" alt="" aria-hidden="true" style={{ width: W + "px", opacity: 0.35, animation: "cp-bob 3.2s ease-in-out infinite" }} />
          ) : (
            /* gone (or couldn't be read): what happened, and on into the app — or, for a hiccup, again */
            <>
              <img src="./assets/onboarding-preview/envelope-closed.png" alt="" aria-hidden="true" style={{ width: "150px", opacity: 0.55, filter: "grayscale(.5)", transform: "rotate(-5deg)" }} />
              <span style={{ marginTop: "22px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--fs-title)", lineHeight: "24px", letterSpacing: "var(--ls-heading)", color: INK }}>{I(T.ivGoneTitle)}</span>
              <span style={{ marginTop: "6px", fontWeight: 400, fontSize: "var(--fs-caption)", lineHeight: "20px", color: "#4C5562", maxWidth: "280px" }}>{I(p.gone || p.err)}</span>
              {p.phase === "error" ? (
                <div className="dc-hover-8" onClick={p.retry} role="button" style={{ ...action, marginTop: "20px" }}><span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>{I(T.ivRetry)}</span></div>
              ) : null}
              <div className="dc-hover-8" onClick={p.leave} role="button" style={{ ...action, marginTop: p.phase === "error" ? "10px" : "20px", ...(p.phase === "error" ? { background: "transparent", boxShadow: "inset 0 0 0 1.5px " + INK } : {}) }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: p.phase === "error" ? INK : "#fff" }}>{I(T.ivVisit)}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {/* the letter, opened (as in the Mailbox): "Write back" — or, your own letter, nothing to answer */}
      {opened && letter ? <OpenLetter key={letter.key} c={letter} from={opened} onClose={() => setOpened(null)} onWriteBack={p.writeBack} t={T} /> : null}
    </>
  );
}
