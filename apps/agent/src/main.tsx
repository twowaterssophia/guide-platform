import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AgentApp } from './app'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AgentApp />
  </StrictMode>,
)
