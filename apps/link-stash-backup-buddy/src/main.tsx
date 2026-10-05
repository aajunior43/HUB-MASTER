import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './lib/registerServiceWorker'

// Pointer tracker removed — spotlight effect was too heavy on lists with many cards.


createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorker();
