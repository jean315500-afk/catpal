// /onboarding-preview — the interactive onboarding on its own page (the app itself is untouched).
import { createRoot } from 'react-dom/client';
import OnboardingPreview from './OnboardingPreview';
import '../typography.css';
import './onboarding.css';

createRoot(document.getElementById('root')!).render(<OnboardingPreview />);
