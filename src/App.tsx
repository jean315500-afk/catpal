import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DCHost } from './dc/DCHost';
import { WalletProvider } from './solana/WalletProvider';
import CatPalLogic from './CatPalLogic';
import IntroScreen from './screens/IntroScreen';
import OnboardScreen from './screens/OnboardScreen';
import FeedScreen from './screens/FeedScreen';
import ShareScreen from './screens/ShareScreen';
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

const DESIGN_W = 402, DESIGN_H = 874, MIN_H = 760;

/**
 * Desktop: the design's 402×874 phone frame, centred.
 * Phones: the frame fills the screen. It is scaled so it is at least 402 wide
 * and 760 tall (what the absolutely-placed screens need), and keeps its scale
 * while only the height changes (on-screen keyboard), so nothing jumps.
 */
function PhoneFrame({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const scale = useRef<{ w: number; s: number } | null>(null);
  const mobile = vp.w <= 520;
  useEffect(() => { document.body.style.background = mobile ? '#fff' : ''; }, [mobile]);
  const base = { position: 'relative', background: '#fff', overflow: 'clip', flex: 'none', fontFamily: 'Pretendard,-apple-system,sans-serif', color: '#010002' } as const;

  if (!mobile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', boxSizing: 'border-box' }}>
        <div style={{ ...base, width: DESIGN_W + 'px', height: DESIGN_H + 'px', borderRadius: '22px', boxShadow: '0 24px 60px rgba(30,26,18,.18),0 0 0 1px rgba(0,0,0,.06)' }}>{children}</div>
      </div>
    );
  }
  if (!scale.current || scale.current.w !== vp.w) scale.current = { w: vp.w, s: Math.min(vp.w / DESIGN_W, vp.h / MIN_H) };
  const s = scale.current.s;
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'clip', background: '#fff' }}>
      <div style={{ ...base, width: vp.w / s + 'px', height: vp.h / s + 'px', transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
    <div className="sc-host">
      <DCHost
        logic={CatPalLogic}
        props={PROTOTYPE_PROPS}
        render={(v) => (
          <PhoneFrame>
            <IntroScreen v={v} />
            <OnboardScreen v={v} />
            <FeedScreen v={v} />
            <ShareScreen v={v} />
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
          </PhoneFrame>
        )}
      />
    </div>
    </WalletProvider>
  );
}
