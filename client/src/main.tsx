import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Ensure we have a single clean render
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root')
  
  if (rootElement) {
    // Clear any existing content to prevent duplicates
    rootElement.innerHTML = ''
    
    // Create root and render once
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
  }
})