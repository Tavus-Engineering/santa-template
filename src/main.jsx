import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CVIProvider } from './components/cvi/components/cvi-provider'
import { NaughtyNiceTest } from './components/NaughtyNiceTest/NaughtyNiceTest'

// Initialize BotID client-side protection (only in production)
// In development, BotID is disabled to avoid console warnings
// Error handling ensures app continues to work even if BotID isn't configured
if (import.meta.env.PROD) {
  try {
    import('botid/client/core').then(({ initBotId }) => {
      try {
        initBotId({
          protect: [
            {
              path: '/api/create-conversation',
              method: 'POST',
            },
          ],
        })
        console.log('[BotID] BotID initialized successfully')
      } catch (error) {
        console.warn('[BotID] Failed to initialize BotID:', error)
        // App continues to work without BotID
      }
    }).catch((error) => {
      console.warn('[BotID] BotID module failed to load (this is OK if BotID is not configured):', error.message)
      // App continues to work without BotID
    })
  } catch (error) {
    console.warn('[BotID] Error loading BotID module:', error)
    // App continues to work without BotID
  }
} else {
  console.log('[BotID] BotID disabled in development mode')
}

const isDev = import.meta.env.DEV;
const isTestRoute = window.location.pathname === '/test/naughty-nice';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CVIProvider>
      {isDev && isTestRoute ? <NaughtyNiceTest /> : <App />}
    </CVIProvider>
  </StrictMode>,
)
