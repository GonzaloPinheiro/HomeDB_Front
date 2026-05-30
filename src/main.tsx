import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { StorageProvider } from './context/StorageContext';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StorageProvider>
          <App />
          <Toaster richColors position="top-right" />
        </StorageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
