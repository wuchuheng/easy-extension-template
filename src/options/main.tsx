import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupExtensionPage } from '@/events/test'
import { log, Scope } from '@/events/logger'
import ErrorBoundary from '@/components/ErrorBoundary'

log(Scope.EXTENSION_PAGE, 'Options page loaded')

setupExtensionPage()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    onError={(error) => {
      console.error('[Options] Error boundary caught:', error)
    }}
  >
    <App />
  </ErrorBoundary>
)
