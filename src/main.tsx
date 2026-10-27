import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Police servie par le site lui-même : la politique de sécurité de la
// production (font-src 'self') bloquerait une police chargée depuis Google.
import '@fontsource-variable/inter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
