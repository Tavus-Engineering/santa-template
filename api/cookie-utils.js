// Utility functions for managing user ID cookies

function generateUserId() {
  // Generate a simple unique ID (not cryptographically secure, but sufficient for usage tracking)
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export function getOrCreateUserId(req, res) {
  const cookieName = 'santa_user_id'
  
  // Parse cookies from request with better error handling
  let cookies = {}
  try {
    if (req.headers.cookie) {
      cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const trimmed = cookie.trim()
        if (!trimmed) return acc
        
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim()
          const value = trimmed.substring(equalIndex + 1).trim()
          if (key && value) {
            try {
              acc[key] = decodeURIComponent(value)
            } catch (e) {
              // If decoding fails, use raw value
              acc[key] = value
            }
          }
        }
        return acc
      }, {})
    }
  } catch (error) {
    console.warn('[cookie-utils] Failed to parse cookies:', error.message)
    cookies = {}
  }
  
  // Log cookie debugging info
  const hasCookieHeader = !!req.headers.cookie
  const cookieCount = Object.keys(cookies).length
  console.log('[cookie-utils] Cookie header present:', hasCookieHeader, 'Parsed cookies:', cookieCount, 'Host:', req.headers.host, 'Origin:', req.headers.origin)
  
  let userId = cookies[cookieName]
  
  // If no user ID exists, generate one and set it in a cookie
  if (!userId) {
    userId = generateUserId()
    
    // Set httpOnly cookie for security (prevents client-side JavaScript access)
    // SameSite=Lax allows cookies to be sent in top-level navigations (better than Strict)
    // Secure flag should be set in production (HTTPS only)
    // Vercel uses VERCEL_ENV to indicate environment (production, preview, development)
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL_ENV === 'production'
    
    // Build cookie options - don't set Domain to allow it to work for current domain
    // For Vercel: use SameSite=None with Secure for cross-origin, or SameSite=Lax for same-origin
    // Try Lax first (works for same domain), fall back to None if needed
    const useSameSiteNone = false // Set to true if cookies still don't work (requires Secure)
    
    const cookieOptions = [
      `${cookieName}=${encodeURIComponent(userId)}`,
      'HttpOnly',
      useSameSiteNone ? 'SameSite=None' : 'SameSite=Lax',
      'Path=/',
      `Max-Age=${60 * 60 * 24 * 365}`, // 1 year
      ...(isProduction && isHttps ? ['Secure'] : [])
    ].join('; ')
    
    // Set cookie header - ensure it's set before other headers
    res.setHeader('Set-Cookie', cookieOptions)
    
    // Also set a response header to help debug
    res.setHeader('X-Cookie-Set', 'true')
    res.setHeader('X-User-ID', userId.substring(0, 20) + '...')
    
    console.log('[cookie-utils] Created new user ID:', userId.substring(0, 20) + '...', 'Production:', isProduction, 'HTTPS:', isHttps, 'SameSite:', useSameSiteNone ? 'None' : 'Lax')
  } else {
    console.log('[cookie-utils] Using existing user ID:', userId.substring(0, 20) + '...')
  }
  
  return userId
}

