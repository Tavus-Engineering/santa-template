export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')

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
    const usageStorage = await import('./usage-storage.js')
    const { durationSeconds } = req.body
    
    if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
      return res.status(400).json({ error: 'Invalid durationSeconds' })
    }
    
    // Get user identifier from IP address
    const identifier = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.headers['x-vercel-ip'] || 
                      req.connection?.remoteAddress || 
                      'unknown'
    
    const result = usageStorage.recordSession(identifier, durationSeconds)
    
    return res.status(200).json({
      success: true,
      usedSeconds: result.usedSeconds,
      remainingSeconds: result.remainingSeconds,
      maxDailySeconds: usageStorage.MAX_DAILY_SECONDS
    })
  } catch (error) {
    console.error('[record-usage] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

