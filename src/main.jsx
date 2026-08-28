import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const rootEl = document.getElementById('root')

// If the page was statically prerendered (production build), hydrate the
// existing markup instead of wiping and re-rendering it — keeps the real
// content crawlers/no-JS clients see identical to what React then takes
// over. In dev (`npm run dev`), #root starts empty, so this just renders.
if (rootEl.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
