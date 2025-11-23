import { useState, useEffect } from 'react'
import { getRandomGreeting } from '../utils/santaGreetings'

/**
 * Custom hook for generating Tavus conversation URL
 * Starts preloading when window is visible to optimize join times
 */
export const useTavusConversation = (isAnswered, shouldPreload = false, selectedLanguage = 'en', isConversationStarted = false) => {
  const [conversationUrl, setConversationUrl] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [lastLanguage, setLastLanguage] = useState(selectedLanguage)

  // Reset conversationUrl and conversationId when call is not answered
  useEffect(() => {
    if (!isAnswered) {
      setConversationUrl(null)
      setConversationId(null)
      setIsGenerating(false)
      setError(null)
      setLastLanguage(selectedLanguage)
    }
  }, [isAnswered])

  // Reset conversation if language changes, but only if conversation hasn't started yet
  useEffect(() => {
    if (lastLanguage !== selectedLanguage && !isConversationStarted) {
      if (conversationUrl) {
        console.log('[useTavusConversation] Language changed from', lastLanguage, 'to', selectedLanguage, '- resetting conversation')
        setConversationUrl(null)
        setConversationId(null)
        setError(null)
      }
      setLastLanguage(selectedLanguage)
    } else if (lastLanguage !== selectedLanguage) {
      // Language changed but conversation already started - just update lastLanguage without resetting
      console.log('[useTavusConversation] Language changed from', lastLanguage, 'to', selectedLanguage, '- conversation already started, not resetting')
      setLastLanguage(selectedLanguage)
    }
  }, [selectedLanguage, lastLanguage, conversationUrl, isConversationStarted])

  useEffect(() => {
    // Start generating if we should preload (window visible) or if call is answered
    // Only generate once - if already generating or already have URL, skip
    // Don't retry if there's an error (prevents infinite loops)
    if ((shouldPreload || isAnswered) && !conversationUrl && !isGenerating && !error) {
      console.log('[useTavusConversation] Starting conversation generation (preload:', shouldPreload, 'answered:', isAnswered, ')')
      setIsGenerating(true)
      const generateConversationUrl = async () => {
        try {
          const customGreeting = getRandomGreeting(selectedLanguage)
          console.log('[useTavusConversation] Selected language code:', selectedLanguage)
          console.log('[useTavusConversation] Generated greeting (first 100 chars):', customGreeting.substring(0, 100) + '...')

          console.log('[useTavusConversation] Making API request to serverless function...')
          
          // For testing: add ?testCountry=XX to URL to simulate geoblocking
          // Add ?bypassUsage=true to bypass daily usage limits
          const urlParams = new URLSearchParams(window.location.search)
          const testCountry = urlParams.get('testCountry')
          const bypassUsage = urlParams.get('bypassUsage') === 'true'
          const apiUrlParams = new URLSearchParams()
          if (testCountry) apiUrlParams.set('testCountry', testCountry)
          if (bypassUsage) apiUrlParams.set('bypassUsage', 'true')
          const apiUrl = apiUrlParams.toString() 
            ? `/api/create-conversation?${apiUrlParams.toString()}`
            : '/api/create-conversation'
          
          // Call serverless function instead of Tavus API directly
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              custom_greeting: customGreeting
            })
          })

          console.log('[useTavusConversation] API Response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log('[useTavusConversation] API Response data:', data)
            const url = data.conversation_url
            const id = data.conversation_id
            console.log('[useTavusConversation] Setting conversation URL:', url)
            console.log('[useTavusConversation] Setting conversation ID:', id)
            if (url) {
              setConversationUrl(url)
            } else {
              console.error('[useTavusConversation] No conversation_url in response:', data)
            }
            if (id) {
              setConversationId(id)
            } else {
              console.warn('[useTavusConversation] No conversation_id in response:', data)
            }
          } else {
            const errorText = await response.text().catch(() => 'Failed to read error response')
            let errorData
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { error: errorText }
            }
            console.error('[useTavusConversation] Failed to generate conversation URL:', response.status, errorData)
            
            // Handle geoblocking (403 with geoblocked error)
            if (response.status === 403 && errorData.error === 'geoblocked') {
              setError('geoblocked')
              return
            }
            
            // Handle daily limit (429 with daily_limit_reached error)
            if (response.status === 429 && errorData.error === 'daily_limit_reached') {
              setError('dailyLimitReached')
              return
            }
            
            // Handle 400 status code - check if it's max concurrency or another error
            if (response.status === 400) {
              // Parse error details - might be a JSON string that needs parsing
              let errorDetails = errorData.details || errorData.message || errorText || ''
              
              // If details is a JSON string, try to parse it
              if (typeof errorDetails === 'string') {
                try {
                  const parsedDetails = JSON.parse(errorDetails)
                  errorDetails = parsedDetails.message || parsedDetails.error || errorDetails
                } catch {
                  // Not JSON, use as-is
                }
              }
              
              // Check if it's a concurrency error
              const errorDetailsStr = String(errorDetails).toLowerCase()
              const isConcurrencyError = 
                errorDetailsStr.includes('concurrent') ||
                errorDetailsStr.includes('max') ||
                errorDetailsStr.includes('limit') ||
                errorDetailsStr.includes('capacity') ||
                errorDetailsStr.includes('busy')
              
              if (isConcurrencyError) {
                setError('maxConcurrency')
              } else {
                // Other 400 errors (like invalid persona_id, etc.)
                setError('apiError')
              }
            } else {
              setError('unknown')
            }
          }
        } catch (error) {
          console.error('[useTavusConversation] Error generating conversation URL:', error)
          console.error('[useTavusConversation] Error stack:', error.stack)
          setError('unknown')
        } finally {
          setIsGenerating(false)
        }
      }

      generateConversationUrl()
    }
  }, [isAnswered, shouldPreload, conversationUrl, isGenerating, selectedLanguage])

  return { conversationUrl, conversationId, error }
}

