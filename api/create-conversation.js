export default async function handler(req, res) {
  // Set CORS headers
  // Cannot use '*' with credentials - must use specific origin
  // For localhost/same-origin: derive from request URL if origin header is missing
  let origin = req.headers.origin || process.env.FRONTEND_URL
  
  // If no origin header (same-origin request), try to derive from request
  if (!origin && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    origin = `${protocol}://${req.headers.host}`
  }
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    // Last resort: don't set credentials if we can't determine origin
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Geoblocking check
  // Vercel provides country code in headers: x-vercel-ip-country or x-vercel-ip-country-code
  // For testing: add ?testCountry=XX to simulate a country (e.g., ?testCountry=CN)
  const testCountry = req.query.testCountry
  const countryCode = testCountry || req.headers['x-vercel-ip-country'] || req.headers['x-vercel-ip-country-code']
  const blockedCountries = process.env.BLOCKED_COUNTRIES 
    ? process.env.BLOCKED_COUNTRIES.split(',').map(c => c.trim().toUpperCase())
    : []
  
  // For testing: if testCountry is provided, check if it's in blocked list OR use TEST_BLOCKED_COUNTRIES
  const testBlockedCountries = process.env.TEST_BLOCKED_COUNTRIES 
    ? process.env.TEST_BLOCKED_COUNTRIES.split(',').map(c => c.trim().toUpperCase())
    : ['CN', 'RU', 'KP'] // Default test countries if no env var set
  
  const countriesToCheck = testCountry ? testBlockedCountries : blockedCountries
  
  if (countryCode && countriesToCheck.length > 0 && countriesToCheck.includes(countryCode.toUpperCase())) {
    console.log('[create-conversation] Geoblocked request from country:', countryCode, testCountry ? '(test mode)' : '')
    return res.status(403).json({ 
      error: 'geoblocked',
      message: 'Service not available in your region'
    })
  }

  // BotID verification
  // Error handling ensures API continues to work even if BotID isn't configured
  // In development, checkBotId() always returns { isBot: false } by default
  // Use developmentOptions.bypass: 'BAD-BOT' to test bot detection locally
  try {
    const { checkBotId } = await import('botid/server')
    const verification = await checkBotId({
      // Uncomment the line below to test bot detection in development:
      // developmentOptions: { bypass: 'BAD-BOT' }, // Options: 'HUMAN' (default) or 'BAD-BOT'
    })
    if (verification.isBot) {
      return res.status(403).json({ error: 'Access denied' })
    }
  } catch (error) {
    // BotID check failed - log warning but continue processing
    // This is expected if BotID isn't configured in Vercel
    console.warn('[create-conversation] BotID check failed, continuing without bot protection:', error.message)
    // Continue without BotID protection if it's not properly configured
  }

  // Daily usage limit check
  // Check if bypass is enabled via query parameter (for testing)
  const bypassUsage = req.query.bypassUsage === 'true'
  
  if (!bypassUsage) {
    try {
      const usageStorage = await import('./usage-storage.js')
      const { getOrCreateUserId } = await import('./cookie-utils.js')
      
      // Get user identifier from cookie (generates new one if doesn't exist)
      const identifier = getOrCreateUserId(req, res)
      
      const canStart = await usageStorage.canStartSession(identifier)
      const usage = await usageStorage.getUsage(identifier)
      
      if (!canStart) {
        console.log('[create-conversation] Daily usage limit reached for:', identifier, 'Used:', usage.usedSeconds, 'seconds')
        return res.status(429).json({
          error: 'daily_limit_reached',
          message: "Sorry - Santa had to go back to his workshop. Come back again and he'll be ready to chat",
          usedSeconds: usage.usedSeconds,
          remainingSeconds: 0,
          maxDailySeconds: usageStorage.MAX_DAILY_SECONDS
        })
      }
      
      console.log('[create-conversation] Usage check passed for:', identifier, 'Remaining:', usage.remainingSeconds, 'seconds')
    } catch (error) {
      // If usage check fails, log but continue (fail open for reliability)
      console.warn('[create-conversation] Usage check failed, continuing:', error.message)
    }
  } else {
    console.log('[create-conversation] Usage check bypassed (test mode)')
  }

  try {
    const { custom_greeting, language } = req.body

    // Log the greeting being received (first 100 chars for debugging)
    console.log('[create-conversation] Custom greeting received:', custom_greeting ? `${custom_greeting.substring(0, 100)}... (length: ${custom_greeting.length})` : 'none')
    console.log('[create-conversation] Language received:', language || 'not provided')

    // Get API key from server-side environment variable (not exposed to client)
    const apiKey = process.env.TAVUS_API_KEY

    if (!apiKey) {
      console.error('[create-conversation] Tavus API key not found')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Map language codes to Tavus API language format
    // Only includes languages supported by Tavus API
    const languageMap = {
      'en': 'english',
      'fr': 'french',
      'de': 'german',
      'es': 'spanish',
      'pt': 'portuguese',
      'zh': 'chinese',
      'ja': 'japanese',
      'hi': 'hindi',
      'it': 'italian',
      'ko': 'korean',
      'nl': 'dutch',
      'pl': 'polish',
      'ru': 'russian',
      'sv': 'swedish',
      'tr': 'turkish',
      'id': 'indonesian',
      'fil': 'filipino',
      'bg': 'bulgarian',
      'ro': 'romanian',
      'ar': 'arabic',
      'cs': 'czech',
      'el': 'greek',
      'fi': 'finnish',
      'hr': 'croatian',
      'ms': 'malay',
      'sk': 'slovak',
      'da': 'danish',
      'ta': 'tamil',
      'uk': 'ukrainian',
      'hu': 'hungarian',
      'no': 'norwegian',
      'vi': 'vietnamese'
    }

    // Prepare request body for Tavus API
    // Only include custom_greeting if it's provided and not empty
    const requestBody = {
      enable_dynamic_greeting: false,
      persona_id: 'p32d644e910d',
      replica_id: 'r37a2f67f26a',
      conversation_name: 'Santa Call'
    }
    
    // Only add custom_greeting if it's provided and not empty
    if (custom_greeting && custom_greeting.trim().length > 0) {
      requestBody.custom_greeting = custom_greeting
    }

    // Add language to properties if provided
    if (language) {
      const tavusLanguage = languageMap[language.toLowerCase()] || languageMap['en']
      requestBody.properties = {
        language: tavusLanguage
      }
    }

    // Log the request body being sent (first 100 chars of greeting)
    console.log('[create-conversation] Sending to Tavus API:', {
      ...requestBody,
      custom_greeting: requestBody.custom_greeting ? `${requestBody.custom_greeting.substring(0, 100)}... (length: ${requestBody.custom_greeting.length})` : 'not included'
    })

    // Make request to Tavus API
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[create-conversation] Tavus API error:', response.status, errorText)
      return res.status(response.status).json({ 
        error: 'Failed to create conversation',
        details: errorText
      })
    }

    const data = await response.json()
    
    // Log full response for debugging
    console.log('[create-conversation] Tavus API response:', JSON.stringify(data, null, 2))
    
    const conversationUrl = data.conversation_url || data.url
    const conversationId = data.conversation_id || data.id
    
    console.log('[create-conversation] Conversation created - URL:', conversationUrl, 'ID:', conversationId)
    console.log('[create-conversation] Replica should automatically join Daily room when conversation is created')
    
    return res.status(200).json({
      conversation_url: conversationUrl,
      conversation_id: conversationId
    })
  } catch (error) {
    console.error('[create-conversation] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

