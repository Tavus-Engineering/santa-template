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
  const foundUserId = cookies[cookieName]
  console.log('[cookie-utils] Cookie header present:', hasCookieHeader, 'Parsed cookies:', cookieCount, 'Found userId:', !!foundUserId, 'Host:', req.headers.host, 'Origin:', req.headers.origin)
  if (hasCookieHeader && cookieCount > 0) {
    console.log('[cookie-utils] Cookie keys:', Object.keys(cookies).join(', '))
  }
  
  let userId = foundUserId
  
  // Debug: Log what we found
  if (hasCookieHeader && !foundUserId) {
    console.warn('[cookie-utils] Cookie header exists but santa_user_id not found. Available cookies:', Object.keys(cookies))
  }
  
  // If no user ID exists, generate one and set it in a cookie
  if (!userId) {
    userId = generateUserId()
    
    // Set httpOnly cookie for security (prevents client-side JavaScript access)
    // Vercel uses VERCEL_ENV to indicate environment (production, preview, development)
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
    
    // Detect HTTPS - check multiple sources for Vercel
    const protocol = req.headers['x-forwarded-proto'] || (req.headers['x-forwarded-ssl'] === 'on' ? 'https' : 'http')
    const isHttps = protocol === 'https' || process.env.VERCEL_ENV === 'production' || req.url?.startsWith('https://')
    
    // For Vercel production: Always use SameSite=None with Secure (required for cross-origin/serverless)
    // For local development: Use SameSite=Lax (works with HTTP localhost)
    // Note: SameSite=None REQUIRES Secure flag
    const useSecureCookie = isHttps || isProduction
    
    const cookieOptions = [
      `${cookieName}=${encodeURIComponent(userId)}`,
      'HttpOnly',
      useSecureCookie ? 'SameSite=None' : 'SameSite=Lax',
      ...(useSecureCookie ? ['Secure'] : []), // Secure required when SameSite=None
      'Path=/',
      `Max-Age=${60 * 60 * 24 * 365}`, // 1 year
    ].join('; ')
    
    console.log('[cookie-utils] Cookie config - Protocol:', protocol, 'isHttps:', isHttps, 'isProduction:', isProduction, 'useSecureCookie:', useSecureCookie)
    
    // Set cookie header - MUST be set before res.json() is called
    // Use appendHeader to ensure it's added even if other headers exist
    try {
    res.setHeader('Set-Cookie', cookieOptions)
      
      // Also set a response header to help debug
      res.setHeader('X-Cookie-Set', 'true')
      res.setHeader('X-User-ID', userId.substring(0, 20) + '...')
      
      // Verify the header was set
      const verifyHeader = res.getHeader('Set-Cookie')
      if (!verifyHeader) {
        console.error('[cookie-utils] ERROR: Set-Cookie header was not set!')
      } else {
        console.log('[cookie-utils] Created new user ID:', userId.substring(0, 20) + '...', 'Production:', isProduction, 'HTTPS:', isHttps, 'Cookie set:', !!verifyHeader)
      }
    } catch (headerError) {
      console.error('[cookie-utils] Error setting cookie header:', headerError)
    }
  } else {
    console.log('[cookie-utils] Using existing user ID:', userId.substring(0, 20) + '...')
  }
  
  return userId
}

