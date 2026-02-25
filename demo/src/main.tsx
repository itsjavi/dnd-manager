import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import './styles.css'

const rootElement = document.querySelector<HTMLDivElement>('#app')

if (!rootElement) {
  throw new Error('Missing #app element')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
