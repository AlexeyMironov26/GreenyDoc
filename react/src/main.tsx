import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' //игнорировать ошибку, всё работает
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)