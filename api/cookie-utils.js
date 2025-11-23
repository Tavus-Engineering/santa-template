// Utility functions for managing user ID cookies

function generateUserId() {
  // Generate a simple unique ID (not cryptographically secure, but sufficient for usage tracking)
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export function getOrCreateUserId(req, res) {
  const cookieName = 'santa_user_id'
  
  // Parse cookies from request
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const trimmed = cookie.trim()
    const equalIndex = trimmed.indexOf('=')
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex)
      const value = trimmed.substring(equalIndex + 1)
      if (key && value) {
        acc[key] = decodeURIComponent(value)
      }
    }
    return acc
  }, {}) || {}
  
  let userId = cookies[cookieName]
  
  // If no user ID exists, generate one and set it in a cookie
  if (!userId) {
    userId = generateUserId()
    
    // Set httpOnly cookie for security (prevents client-side JavaScript access)
    // SameSite=Strict for CSRF protection
    // Secure flag should be set in production (HTTPS only)
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = [
      `${cookieName}=${encodeURIComponent(userId)}`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${60 * 60 * 24 * 365}`, // 1 year
      ...(isProduction ? ['Secure'] : [])
    ].join('; ')
    
    res.setHeader('Set-Cookie', cookieOptions)
  }
  
  return userId
}

