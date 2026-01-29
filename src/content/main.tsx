import { createRoot } from 'react-dom/client'
import App from './views/App.tsx'
import { setupContentScript } from '@/events/test'
import { log, Scope } from '@/events/logger'

log(Scope.CONTENT_SCRIPT, 'Hello world from content script!')

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(<App />)

setupContentScript()
