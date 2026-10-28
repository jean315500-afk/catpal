// /landing-preview — a first visit's first page: the words and "Send your first letter", beside an example of a letter
// exchange that plays by itself (Landing.tsx). The earlier story page stays at /onboarding-preview.
import { createRoot } from 'react-dom/client';
import Landing from './Landing';
import '../typography.css';
import './onboarding.css';
import './landing.css';

createRoot(document.getElementById('root')!).render(<Landing />);
