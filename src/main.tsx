import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LiveAPIProvider } from './lib/useLiveAPI';
import { ScreenShareProvider } from './lib/ScreenShareContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveAPIProvider>
      <ScreenShareProvider>
        <App />
      </ScreenShareProvider>
    </LiveAPIProvider>
  </StrictMode>,
);
