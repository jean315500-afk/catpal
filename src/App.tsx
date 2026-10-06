import { DCHost } from './dc/DCHost';
import { WalletProvider } from './solana/WalletProvider';
import CatPalLogic from './CatPalLogic';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import UploadScreen from './screens/UploadScreen';
import CameraScreen from './screens/CameraScreen';
import CatInfoScreen from './screens/CatInfoScreen';
import MessageScreen from './screens/MessageScreen';
import StampScreen from './screens/StampScreen';
import SendScreen from './screens/SendScreen';
import DeliveryScreen from './screens/DeliveryScreen';
import DeliveryMapScreen from './screens/DeliveryMapScreen';
import ArrivedScreen from './screens/ArrivedScreen';
import OpenMailScreen from './screens/OpenMailScreen';
import LettersScreen from './screens/LettersScreen';
import MailboxScreen from './screens/MailboxScreen';
import WorldMapScreen from './screens/WorldMapScreen';
import PassportScreen from './screens/PassportScreen';
import CatProfileScreen from './screens/CatProfileScreen';
import BackButton from './screens/BackButton';
import BottomNav from './screens/BottomNav';
import SendToSheet from './screens/SendToSheet';
import PhotoSheet from './screens/PhotoSheet';
import TopBar from './screens/TopBar';

// Defaults of the prototype's editable props (data-props in Cat Pal v6.dc.html).
const PROTOTYPE_PROPS = {
  language: 'English',
  startScreen: 'Intro',
  sendToUnlock: true,
  surpriseCity: 'Random',
};

export default function App() {
  return (
    <WalletProvider>
    <div className="sc-host">
      <DCHost
        logic={CatPalLogic}
        props={PROTOTYPE_PROPS}
        render={(v) => (
          <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 12px", boxSizing: "border-box" }}>
            {/* phone frame */}
            <div style={{ position: "relative", width: "402px", height: "874px", background: "#fff", borderRadius: "22px", boxShadow: "0 24px 60px rgba(30,26,18,.18),0 0 0 1px rgba(0,0,0,.06)", overflow: "hidden", flex: "none", fontFamily: "Pretendard,-apple-system,sans-serif", color: "#010002" }}>
            <IntroScreen v={v} />
            <HomeScreen v={v} />
            <UploadScreen v={v} />
            <CameraScreen v={v} />
            <CatInfoScreen v={v} />
            <MessageScreen v={v} />
            <StampScreen v={v} />
            <SendScreen v={v} />
            <DeliveryScreen v={v} />
            <DeliveryMapScreen v={v} />
            <ArrivedScreen v={v} />
            <OpenMailScreen v={v} />
            <LettersScreen v={v} />
            <MailboxScreen v={v} />
            <WorldMapScreen v={v} />
            <PassportScreen v={v} />
            <CatProfileScreen v={v} />
            <BackButton v={v} />
            <BottomNav v={v} />
            <SendToSheet v={v} />
            <PhotoSheet v={v} />
            <TopBar v={v} />
            </div>
          </div>
        )}
      />
    </div>
    </WalletProvider>
  );
}
