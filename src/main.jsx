import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Package CSS Imports
import 'katex/dist/katex.min.css'
import 'mathlive/static.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
