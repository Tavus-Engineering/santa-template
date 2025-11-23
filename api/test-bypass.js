export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Test route to bypass usage limits
  // Usage: /api/test-bypass?action=clear&identifier=xxx
  // Actions: clear (clear usage), status (get status)
  
  try {
    const usageStorage = await import('./usage-storage.js')
    const { action, identifier } = req.query
    
    // Get user identifier
    const userIdentifier = identifier || 
                          req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                          req.headers['x-vercel-ip'] || 
                          'unknown'
    
    if (action === 'clear') {
      // Clear today's usage for this identifier
      const today = new Date().toISOString().split('T')[0]
      const key = `${userIdentifier}:${today}`
      const { usageStore } = await import('./usage-storage.js')
      usageStore.delete(key)
      
      return res.status(200).json({
        success: true,
        message: `Cleared usage for ${userIdentifier} on ${today}`
      })
    } else if (action === 'status') {
      const usage = usageStorage.getUsage(userIdentifier)
      return res.status(200).json({
        identifier: userIdentifier,
        ...usage,
        maxDailySeconds: usageStorage.MAX_DAILY_SECONDS
      })
    } else {
      return res.status(400).json({ 
        error: 'Invalid action',
        availableActions: ['clear', 'status']
      })
    }
  } catch (error) {
    console.error('[test-bypass] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

