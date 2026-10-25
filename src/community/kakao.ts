// KakaoTalk sharing (Kakao JavaScript SDK): the invite as a KakaoTalk card — its title, a line, the postcard image and
// one button to the link. Only with a Kakao app's JavaScript key (VITE_KAKAO_JS_KEY, set in Vercel; the app's Web
// platform must list this site's domain). Without one, nothing is loaded and the callers share as before (the share
// sheet, or the link to copy).

const KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const SRI = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka';

export const kakaoConfigured = !!KEY;

let ready: Promise<any | null> | null = null;
/** the SDK, loaded and set up once (null: no key, or it couldn't load) */
export function loadKakao(): Promise<any | null> {
  if (!KEY || typeof document === 'undefined') return Promise.resolve(null);
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const done = () => { const K = (window as any).Kakao; try { if (K && !K.isInitialized()) K.init(KEY); resolve(K && K.Share ? K : null); } catch { resolve(null); } };
    if ((window as any).Kakao) { done(); return; }
    const s = document.createElement('script');
    s.src = SDK; s.integrity = SRI; s.crossOrigin = 'anonymous'; s.async = true;
    s.onload = done; s.onerror = () => { ready = null; resolve(null); };
    document.head.appendChild(s);
  });
  return ready;
}

/** a link as a KakaoTalk card: true if KakaoTalk's share opened, false if it can't be used here */
export async function shareKakao(card: { title: string; description: string; button: string; url: string; imageUrl: string }): Promise<boolean> {
  const K = await loadKakao(); if (!K) return false;
  const link = { mobileWebUrl: card.url, webUrl: card.url };
  try {
    K.Share.sendDefault({
      objectType: 'feed',
      content: { title: card.title, description: card.description, imageUrl: card.imageUrl, imageWidth: 800, imageHeight: 420, link },
      buttons: [{ title: card.button, link }],
    });
    return true;
  } catch { return false; }
}
