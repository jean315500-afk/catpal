// Cat Pal onboarding (/onboarding-preview, and /landing-preview): the letter story (./story) plays by
// itself on a fixed design canvas scaled to the screen — one screen, no scrolling. Each scene's title and
// line sit at the top with the progress dots; the CTA comes at the end. Reduced motion: the final frame.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { COPY, CTA_HREF, LANDING_LANG, LAYOUTS } from './config';
import { saveLang } from '../community/lang';
import { StoryStage, buildStory, geometry, globeStart, type StoryGlobe } from './story';

const forceReduce = new URLSearchParams(location.search).has('reduce');
/** the story has been seen: from now on the app opens straight on Home (see main.tsx) */
const seen = () => { try { localStorage.setItem('cp-onboarded', '1'); } catch { /* private mode: it shows again next time */ } };
/** someone who has watched it before (Replay is for them; a first-timer just sees Skip) */
const seenBefore = (() => { try { return !!localStorage.getItem('cp-onboarded'); } catch { return false; } })();
/** Skip: straight on to the app, the same hand-over as the story's own end (Home builds itself up on the sky) */
const skip = (e?: { preventDefault: () => void }) => {
  e?.preventDefault(); seen();
  try { sessionStorage.setItem('cp-enter', 'globe'); } catch { /* private mode: no hand-over, just go */ }
  document.querySelector('.ob-frame')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => { location.href = CTA_HREF; }, 260);
};

/** the other language (한국어 ⇄ English): kept for here and the app, and the story told again in it */
const switchLang = () => { saveLang(LANDING_LANG === 'ko' ? 'en' : 'ko'); location.reload(); };
try { document.documentElement.lang = LANDING_LANG; document.title = 'Cat Pal · ' + COPY.title; } catch { /* no document */ }

const useMedia = (q: string) => {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q), on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, [q]);
  return m;
};
const useViewport = () => {
  const [v, setV] = useState(() => ({ w: innerWidth, h: innerHeight }));
  useEffect(() => { const on = () => setV({ w: innerWidth, h: innerHeight }); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  return v;
};

export default function OnboardingPreview() {
  const mobile = useMedia('(max-width: 719.98px)'), reduce = useMedia('(prefers-reduced-motion: reduce)') || forceReduce;
  const vp = useViewport();
  const L = mobile ? LAYOUTS.mobile : LAYOUTS.desktop;
  const G = useMemo(() => geometry(L), [L]);
  const k = Math.min(vp.w / L.W, vp.h / L.H);
  const [run, setRun] = useState(0), [done, setDone] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const globe = useRef<StoryGlobe>(globeStart(G));
  const s3 = L.scene3;

  useLayoutEffect(() => {
    const root = stage.current!;
    setDone(false);
    const ctx = gsap.context(() => {
      const story = buildStory(root, L, G, globe.current);
      // at the end it goes on to the app by itself: the globe grows to fill the screen, then the app takes over
      story.tl.eventCallback('onComplete', () => { setDone(true); ctx.add(() => leave(root)); });
      if (reduce) {
        // the end state, at once; nothing keeps moving — and a button to go on, instead of the zoom
        story.tl.progress(1); story.still(); setDone(true);
        gsap.set('.ob-final', { opacity: 1, y: 0 });
        gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' });
      }
    }, root);
    return () => ctx.revert();
  }, [L, G, reduce, run]);

  const box = (x: number, y: number, w: number, extra?: object) => ({ left: x, top: y, width: w, ...extra });
  /** On to the app: the globe grows into a huge horizon across the lower part of the screen while the world
   *  keeps turning slowly, the last words come up over it, then it sinks away below the screen; the app's home
   *  then fades in on the same sky (EnterFromOnboarding in App.tsx). */
  function leave(root: HTMLElement) {
    seen();
    try { sessionStorage.setItem('cp-enter', 'globe'); } catch { /* private mode: no hand-over, just go */ }
    const go = () => { location.href = CTA_HREF; };
    const q = (sel: string) => [...root.querySelectorAll(sel)];
    const el = root.querySelector('.ob-globe') as HTMLElement, gs = globe.current, g = L.scene2.globe;
    // the globe's box now covers the whole window (in stage units, past the stage's own edges), and the sphere is
    // drawn in it where it was, as big as it was; from here it moves and grows by being drawn so (no stretching)
    const sr = root.getBoundingClientRect(), k = sr.width / L.W;
    const bx = -sr.left / k, by = -sr.top / k, VW = innerWidth / k, VH = innerHeight / k;
    gsap.set(el, { xPercent: 0, yPercent: 0, x: 0, y: 0, scale: 1, left: bx, top: by, width: VW, height: VH });
    const view = { x: g.x - bx, y: g.y - by, r: 0.4 * g.w };
    gs.box = { x: bx, y: by };
    const show = () => { gs.view = { ...view }; };
    show();
    // the horizon: a sphere much wider than the window, its top a little under a third of the way down the stage
    const Rt = Math.max(VW * 0.62, VH * 0.55), top = L.H * 0.3 - by;
    const spin = { phi: gs.phi };
    gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: go })
      // the cat friends stay on the globe and ride it into the horizon; the lines between them go
      .to(q('.ob-steps, .ob-dots, .ob-links, .ob-label-pin, .ob-pulse'), { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to(document.querySelectorAll('.ob-topbar'), { opacity: 0, duration: 0.4 }, 0)
      .to(view, { x: L.W / 2 - bx, y: top + Rt, r: Rt, duration: 1.9, ease: 'power2.inOut', onUpdate: show }, 0.2)
      // the world keeps turning, slowly, from rest — on until the end, never stopping again
      .to(spin, { phi: gs.phi - 0.32, duration: 5.2, ease: 'sine.in', onUpdate: () => { gs.phi = spin.phi; } }, 0)
      // the last words come up over the horizon
      .fromTo(q('.ob-outro'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.4)
      .fromTo(q('.ob-outro-brand'), { scale: 0.92 }, { scale: 1, duration: 0.9, ease: 'back.out(2)' }, 1.7)
      // and more cat lovers pop up all over the horizon, round you
      .to(q('.ob-local'), { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)', stagger: { each: 0.12, from: 'random' } }, 1.6)
      // then the horizon sinks away below the screen, growing a little as it goes, and the words go with it
      .to(view, { y: VH + Rt * 1.3 + 20, r: Rt * 1.3, duration: 1.4, ease: 'power2.in', onUpdate: show }, 3.8)
      .to(q('.ob-outro'), { opacity: 0, y: -10, duration: 0.6, ease: 'power2.in' }, 3.9);
  }

  return (
    <main className="ob-page">
      <div className="ob-frame" style={{ width: L.W * k, height: L.H * k }}>
        <div ref={stage} key={`${mobile}-${run}`} className={`ob-stage ${mobile ? 'ob-m' : ''}`} style={{ width: L.W, height: L.H, transform: `scale(${k})` }}>
          {/* one message per scene: its title and line, then the progress dots */}
          <div className="ob-steps" style={box(L.W / 2, L.text.y, L.W * 0.9)}>
            {COPY.scenes.map((s, i) => (
              <div key={i} className="ob-step"><h1 className="ob-step-title">{s.title}</h1>{s.line ? <p className="ob-step-line">{s.line}</p> : null}</div>
            ))}
          </div>
          {/* the last words, over the horizon at the very end */}
          <div className="ob-outro" style={box(L.W / 2, L.H * 0.17, L.W * 0.9)}>
            <p className="ob-outro-lead">{COPY.outro.lead}</p>
            <p className="ob-outro-brand">{COPY.outro.brand}</p>
          </div>
          <div className="ob-dots" style={box(L.W / 2, L.text.dots, 0)}>{COPY.scenes.map((_, i) => <span key={i} className="ob-dot" />)}</div>

          <StoryStage L={L} G={G} globe={globe} />

          {/* reduced motion only: no zoom into the app, so a button to go on */}
          {reduce ? (
            <div className="ob-final ob-final-center" style={box(s3.final.x, s3.final.y, mobile ? L.W * 0.86 : 460)}>
              <div className="ob-final-actions">
                <a className="ob-btn ob-btn-ink" href={CTA_HREF} onClick={seen} tabIndex={done ? 0 : -1}>{COPY.cta}</a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="ob-topbar">
        {reduce ? <a className="ob-note-link" href={forceReduce ? './' : undefined}>Reduced motion{forceReduce ? ' · play full ›' : ' (system setting)'}</a> : null}
        <button type="button" className="ob-btn ob-btn-small" onClick={switchLang} lang={LANDING_LANG === 'ko' ? 'en' : 'ko'}>{COPY.other}</button>
        {seenBefore ? <button type="button" className="ob-btn ob-btn-small" onClick={() => setRun((n) => n + 1)}>{COPY.replay}</button> : null}
        {!done || !reduce ? <a className="ob-btn ob-btn-small" href={CTA_HREF} onClick={skip}>{COPY.skip}</a> : null}
      </div>
    </main>
  );
}
