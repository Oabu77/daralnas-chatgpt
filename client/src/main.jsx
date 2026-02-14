import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { StripeProvider } from './contexts/StripeContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StripeProvider>
      <App />
    </StripeProvider>
  </React.StrictMode>,
)