import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// App-Updates automatisch installieren: beim Öffnen, beim Zurückkehren und stündlich prüfen
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => document.visibilityState === 'visible' && reg.update().catch(() => {});
    document.addEventListener('visibilitychange', check);
    setInterval(check, 60 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
