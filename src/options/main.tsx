import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupExtensionPage } from '@/events/test'
import { log, Scope } from '@/events/logger'

log(Scope.EXTENSION_PAGE, 'Options page loaded')

setupExtensionPage()

createRoot(document.getElementById('root')!).render(<App />)
