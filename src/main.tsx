import { createRoot } from 'react-dom/client';
import App from './App';
import './typography.css';
import './styles.css';
import './hover.css';

/** Someone's first time here: the landing story first (once), which ends by coming back here, to Home ("Send your
 *  first letter"). Anyone who has been before — the story seen, signed in, or a letter begun — comes straight in.
 *  "?intro" plays it again; coming back from it ("?start=home") never goes round again, even if nothing could be saved.
 *  A letter by link ("?letter=…") always opens on the letter. */
const firstVisit = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('intro')) return true;
    if (q.get('start') === 'home' || q.get('start') === 'letter') return false;
    if (q.has('letter')) return false;   // a letter sent by link: straight to it (the story can wait)
    // a friend's "be my cat pal" link: kept, so it's waiting once the story (first time here) has brought you in
    const pal = q.get('pal'); if (pal && /^[0-9a-f]{64}$/.test(pal)) localStorage.setItem('cp-pal-token', pal);
    return !['cp-onboarded', 'catpal-auth', 'cp-cat-name', 'cp-letter-draft'].some((k) => localStorage.getItem(k));
  } catch { return false; }
})();

// No <StrictMode>: its double mount would register the logic's listeners and
// timers twice, which the prototype never did.
if (firstVisit) location.replace('/landing-preview/');
else createRoot(document.getElementById('root')!).render(<App />);
