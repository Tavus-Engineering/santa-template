export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { conversationUrl } = req.query

    if (!conversationUrl) {
      return res.status(400).json({ error: 'conversationUrl is required' })
    }

    // Extract room name from Daily.co URL
    // URL format: https://tavus.daily.co/ROOM_NAME
    const urlMatch = conversationUrl.match(/daily\.co\/([^/?]+)/)
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid Daily.co URL format' })
    }

    const roomName = urlMatch[1]
    const dailyApiKey = process.env.DAILY_API_KEY

    if (!dailyApiKey) {
      console.error('[check-room-participants] Daily API key not found')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Check if room exists using Daily REST API
    // Since replica joins automatically when conversation is created (before user clicks JOIN),
    // we can verify the room exists and assume replica is present
    let hasReplica = false

    try {
      const roomInfoResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (roomInfoResponse.ok) {
        const roomData = await roomInfoResponse.json()
        // Room exists - since replica joins automatically when conversation is created,
        // and there's a delay (hair check) before user clicks JOIN, replica should be there
        hasReplica = true
        console.log('[check-room-participants] Room exists - replica should be present (joins automatically on conversation creation)')
      } else if (roomInfoResponse.status === 404) {
        // Room doesn't exist yet - replica hasn't joined
        hasReplica = false
        console.log('[check-room-participants] Room not found - replica may not have joined yet')
      } else {
        // Other error - assume replica is there as fallback
        hasReplica = true
        console.warn('[check-room-participants] Could not verify room status, assuming replica is present')
      }
    } catch (error) {
      console.warn('[check-room-participants] Error checking room, assuming replica is present:', error.message)
      // Fallback: assume replica is there since it joins automatically
      hasReplica = true
    }

    return res.status(200).json({
      hasReplica,
      participantCount: 0, // Daily REST API doesn't expose participant list without joining
      participants: []
    })
  } catch (error) {
    console.error('[check-room-participants] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

