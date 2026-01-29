import { createRoot } from 'react-dom/client'
import App from './views/App.tsx'
import { setUpTest } from '@/events/contentScript/contentScript-test.ts'

console.log('[CRXJS] Hello world from content script!')

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(<App />)

setUpTest()
