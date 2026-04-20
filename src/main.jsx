import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 20, right: 20 }}
          toastOptions={{
            duration: 4000,
            style: {
              maxWidth: '420px',
              background: '#ffffff',
              color: '#1a1a2e',
              borderRadius: '14px',
              padding: '14px 18px',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: '"Inter", system-ui, sans-serif',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.06)',
              lineHeight: '1.5',
            },
            success: {
              style: {
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
              },
              iconTheme: {
                primary: '#25D366',
                secondary: '#ffffff',
              },
            },
            error: {
              style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            loading: {
              style: {
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#075985',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
