import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './hover.css';

// No <StrictMode>: its double mount would register the logic's listeners and
// timers twice, which the prototype never did.
createRoot(document.getElementById('root')!).render(<App />);
