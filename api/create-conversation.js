export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
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

  try {
    const { custom_greeting } = req.body

    // Get API key from server-side environment variable (not exposed to client)
    const apiKey = process.env.TAVUS_API_KEY

    if (!apiKey) {
      console.error('[create-conversation] Tavus API key not found')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Prepare request body for Tavus API
    const requestBody = {
      custom_greeting: custom_greeting || '',
      enable_dynamic_greeting: true,
      persona_id: 'p5d219ef4ec5',
      replica_id: 'r69a7ee6ca38',
      conversation_name: 'Santa Call'
    }

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
    
    return res.status(200).json({
      conversation_url: data.conversation_url || data.url,
      conversation_id: data.conversation_id || data.id
    })
  } catch (error) {
    console.error('[create-conversation] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

