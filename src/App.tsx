import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DCHost } from './dc/DCHost';
import { WalletProvider } from './solana/WalletProvider';
import CatPalLogic from './CatPalLogic';
import IntroScreen from './screens/IntroScreen';
import OnboardScreen from './screens/OnboardScreen';
import HomeMailScreen, { OpenLetter } from './screens/HomeMailScreen';
import ShareScreen from './screens/ShareScreen';
import ComposeScreen from './screens/ComposeScreen';
import CatMapScreen from './screens/CatMapScreen';
import ExploreScreen from './screens/ExploreScreen';
import CameraScreen from './screens/CameraScreen';
import DeliveryMapScreen from './screens/DeliveryMapScreen';
import ArrivedScreen from './screens/ArrivedScreen';
import LettersScreen from './screens/LettersScreen';
import MailboxScreen from './screens/MailboxScreen';
import WorldMapScreen from './screens/WorldMapScreen';
import PassportScreen from './screens/PassportScreen';
import BackButton from './screens/BackButton';
import BottomNav from './screens/BottomNav';
import PhotoSheet from './screens/PhotoSheet';
import TopBar from './screens/TopBar';

// Defaults of the prototype's editable props (data-props in Cat Pal v6.dc.html).
const PROTOTYPE_PROPS = {
  language: 'English',
  startScreen: 'Intro',
};

const DESIGN_W = 402, MIN_H = 760, MAX_W = 680;

/**
 * Responsive, full-window (no phone mock-up): the sky fills the window and the app's screens fill its
 * height in a centred column — the full width on phones, at most MAX_W wide on bigger screens, so
 * cards and lines stay a comfortable size. The column is scaled down only when the window is too small
 * for what the absolutely-placed screens need (402 wide, 760 tall); on phones the scale is kept while
 * only the height changes (on-screen keyboard), so nothing jumps.
 */
function PhoneFrame({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const scale = useRef<{ w: number; s: number } | null>(null);
  // the page wears the onboarding's sky (see .cp-sky-page in styles.css)
  useEffect(() => { document.body.classList.add('cp-sky-page'); }, []);
  const base = { position: 'relative', overflow: 'clip', flex: 'none', fontFamily: 'var(--font-body)', lineHeight: 'var(--lh-body)', color: '#22304A' } as const;

  if (!scale.current || scale.current.w !== vp.w) scale.current = { w: vp.w, s: Math.min(1, vp.w / DESIGN_W, vp.h / MIN_H) };
  const s = scale.current.s, w = Math.min(vp.w / s, MAX_W), h = vp.h / s;
  return (
    <div className="cp-sky" style={{ position: 'fixed', inset: 0, overflow: 'clip' }}>
      <div style={{ ...base, position: 'absolute', top: 0, left: (vp.w - w * s) / 2 + 'px', width: w + 'px', height: h + 'px', transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
}

/** Coming from the onboarding's end (its globe has sunk away below the screen): on the same sky, Home builds itself
 *  up — the red envelope rising from where the globe went, the mailbox dropping in, the words and the button, the
 *  nav sliding up (`cp-arrive` on the page, see styles.css) — and the address loses its "?start=home". */
function EnterFromOnboarding() {
  const [on, setOn] = useState(() => { try { return !!sessionStorage.getItem('cp-enter'); } catch { return false; } });
  useEffect(() => {
    if (!on) return;
    try { sessionStorage.removeItem('cp-enter'); } catch { /* private mode */ }
    const root = document.documentElement; root.classList.add('cp-arrive');
    try { const u = new URL(location.href); if (u.searchParams.get('start') === 'home') { u.searchParams.delete('start'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } } catch { /* leave the address */ }
    // (`cp-arrive` stays until you leave Home — see HomeMailScreen — so the build-up never replays as it's taken off)
    const t = setTimeout(() => setOn(false), 900);
    return () => clearTimeout(t);
  }, [on]);
  return on ? <div className="cp-enter cp-sky" aria-hidden="true" /> : null;
}

export default function App() {
  return (
    <WalletProvider>
    <EnterFromOnboarding />
    <div className="sc-host">
      <DCHost
        logic={CatPalLogic}
        props={PROTOTYPE_PROPS}
        render={(v) => (
          <PhoneFrame>
            <IntroScreen v={v} />
            <OnboardScreen v={v} />
            <HomeMailScreen v={v} />
            <ShareScreen v={v} />
            <ComposeScreen v={v} />
            <CatMapScreen v={v} />
            <ExploreScreen v={v} />
            <CameraScreen v={v} />
            <DeliveryMapScreen v={v} />
            <ArrivedScreen v={v} />
            <LettersScreen v={v} />
            <MailboxScreen v={v} />
            <WorldMapScreen v={v} />
            <PassportScreen v={v} />
            <BackButton v={v} />
            <BottomNav v={v} />
            <PhotoSheet v={v} />
            <TopBar v={v} />
            <OpenLetter v={v} />
          </PhoneFrame>
        )}
      />
    </div>
    </WalletProvider>
  );
}
