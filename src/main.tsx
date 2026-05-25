import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { registerServiceWorker } from './lib/swRegistration'

createRoot(document.getElementById("root")!).render(<App />);

// Register PWA service worker (guarded against preview iframes)
registerServiceWorker();
