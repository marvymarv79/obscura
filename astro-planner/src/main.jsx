import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import Hub from './Hub.jsx'
import App from './App.jsx'
import Apertura from './Apertura.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/obscura" element={<App />} />
          <Route path="/apertura" element={<Apertura />} />
        </Routes>
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
)
