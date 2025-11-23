export default async function handler(req, res) {
  // Set CORS headers
  // Cannot use '*' with credentials - must use specific origin
  let origin = req.headers.origin || process.env.FRONTEND_URL
  
  if (!origin && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    origin = `${protocol}://${req.headers.host}`
  }
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Test route to bypass/clear usage limits
  // Usage: 
  //   /api/test-bypass?action=clear - Clear current user's usage (uses cookie)
  //   /api/test-bypass?action=clear-all - Clear ALL usage for today
  //   /api/test-bypass?action=status - Get current user's usage status
  //   /api/test-bypass?action=clear&identifier=xxx - Clear specific identifier
  
  try {
    const usageStorage = await import('./usage-storage.js')
    const { getOrCreateUserId } = await import('./cookie-utils.js')
    const { action, identifier } = req.query
    
    // Get user identifier from cookie (or use provided identifier)
    const userIdentifier = identifier || getOrCreateUserId(req, res)
    
    if (action === 'clear') {
      // Clear today's usage for this identifier
      const today = new Date().toISOString().split('T')[0]
      const key = `${userIdentifier}:${today}`
      const { usageStore } = await import('./usage-storage.js')
      usageStore.delete(key)
      
      return res.status(200).json({
        success: true,
        message: `Cleared usage for ${userIdentifier} on ${today}`,
        identifier: userIdentifier
      })
    } else if (action === 'clear-all') {
      // Clear ALL usage for today
      const today = new Date().toISOString().split('T')[0]
      const { usageStore } = await import('./usage-storage.js')
      let cleared = 0
      
      for (const [key] of usageStore) {
        if (key.endsWith(`:${today}`)) {
          usageStore.delete(key)
          cleared++
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `Cleared all usage for ${today}`,
        clearedCount: cleared
      })
    } else if (action === 'status') {
      const usage = await usageStorage.getUsage(userIdentifier)
      return res.status(200).json({
        identifier: userIdentifier,
        ...usage,
        maxDailySeconds: usageStorage.MAX_DAILY_SECONDS
      })
    } else {
      return res.status(400).json({ 
        error: 'Invalid action',
        availableActions: ['clear', 'clear-all', 'status'],
        usage: {
          clear: 'Clear current user\'s usage (uses cookie)',
          'clear-all': 'Clear ALL usage for today',
          status: 'Get current user\'s usage status'
        }
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

