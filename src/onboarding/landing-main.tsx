// /landing-preview — the original onboarding UI: one screen, no scrolling, the story plays by itself
// (the same page as /onboarding-preview).
import { createRoot } from 'react-dom/client';
import OnboardingPreview from './OnboardingPreview';
import '../typography.css';
import './onboarding.css';

createRoot(document.getElementById('root')!).render(<OnboardingPreview />);
