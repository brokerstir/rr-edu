import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Package CSS Imports
import 'katex/dist/katex.min.css'
import 'mathlive/static.css'
import './index.css'
import App from './App.jsx'

// AWS Amplify
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-exports';

Amplify.configure(awsConfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
