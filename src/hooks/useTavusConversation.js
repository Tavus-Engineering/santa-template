import { useState, useEffect } from 'react'

/**
 * Custom hook for generating Tavus conversation URL
 */
export const useTavusConversation = (isHairCheckComplete) => {
  const [conversationUrl, setConversationUrl] = useState(null)

  // Reset conversationUrl when isHairCheckComplete becomes false
  useEffect(() => {
    if (!isHairCheckComplete) {
      setConversationUrl(null)
    }
  }, [isHairCheckComplete])

  useEffect(() => {
    if (isHairCheckComplete && !conversationUrl) {
      console.log('[useTavusConversation] Hair check complete, generating conversation URL...')
      const generateConversationUrl = async () => {
        try {
          // Try multiple ways to get the API key
          const apiKey = import.meta.env.VITE_TAVUS_API_KEY || 
                        import.meta.env.TAVUS_API_KEY ||
                        'a1e1daafc143449b8c8c07dea5a56482' // Fallback to hardcoded key
          
          console.log('[useTavusConversation] API Key exists:', !!apiKey)
          console.log('[useTavusConversation] API Key value (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'none')
          console.log('[useTavusConversation] All env vars:', Object.keys(import.meta.env).filter(k => k.includes('TAVUS')))
          
          if (!apiKey) {
            console.error('[useTavusConversation] Tavus API key not found')
            return
          }

          console.log('[useTavusConversation] Making API request to Tavus...')
          const requestBody = {
            persona_id: 'p3bb4745d4f9',
            conversation_name: 'Santa Call'
          }
          console.log('[useTavusConversation] Request body:', requestBody)
          
          // Generate conversation URL using Tavus API
          const response = await fetch('https://tavusapi.com/v2/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            body: JSON.stringify(requestBody)
          })

          console.log('[useTavusConversation] API Response status:', response.status)
          console.log('[useTavusConversation] API Response headers:', Object.fromEntries(response.headers.entries()))
          
          if (response.ok) {
            const data = await response.json()
            console.log('[useTavusConversation] API Response data:', data)
            const url = data.conversation_url || data.url
            console.log('[useTavusConversation] Setting conversation URL:', url)
            if (url) {
              setConversationUrl(url)
            } else {
              console.error('[useTavusConversation] No conversation_url in response:', data)
            }
          } else {
            const errorText = await response.text()
            console.error('[useTavusConversation] Failed to generate conversation URL:', response.status, errorText)
            try {
              const errorJson = JSON.parse(errorText)
              console.error('[useTavusConversation] Error details:', errorJson)
            } catch (e) {
              // Not JSON, already logged as text
            }
          }
        } catch (error) {
          console.error('[useTavusConversation] Error generating conversation URL:', error)
          console.error('[useTavusConversation] Error stack:', error.stack)
        }
      }

      generateConversationUrl()
    }
  }, [isHairCheckComplete, conversationUrl])

  return conversationUrl
}

