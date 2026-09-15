import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useGame } from './state/gameStore';
import './styles/global.css';

// Dev hook for scripted playtesting from the console.
if (import.meta.env.DEV) (window as unknown as { __mahery: typeof useGame }).__mahery = useGame;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
