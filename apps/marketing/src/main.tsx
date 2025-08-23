import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkAuthProvider } from './lib/clerk/ClerkProvider'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkAuthProvider>
        <App />
      </ClerkAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)