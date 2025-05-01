import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Ledger from './Ledger.jsx'
import Login from './LoginPage.jsx'
import EstimatePage from './EstimatePage.jsx'
import BillingComponent from './BillingComponent.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/invoice" element={<BillingComponent />} />
        <Route path="/app" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
