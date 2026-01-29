import { createRoot } from 'react-dom/client'
import App from './views/App.tsx'
import { setupContentScript } from '@/events/test'
import { log, Scope } from '@/events/logger'
import ErrorBoundary from '@/components/ErrorBoundary'
import { sayHelloFromOffToCS } from '@/events/config'

log(Scope.CONTENT_SCRIPT, 'Hello world from content script!')

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(
  <ErrorBoundary
    onError={(error) => {
      console.error('[Content Script] Error boundary caught:', error)
    }}
  >
    <App />
  </ErrorBoundary>
)

setupContentScript()

// Handle messages from offscreen document
sayHelloFromOffToCS.handle(async (message) => {
  console.log('[Content Script] Received message from offscreen:', message)
})
