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
    console.log('[check-geoblock] Geoblocked request from country:', countryCode, testCountry ? '(test mode)' : '')
    return res.status(403).json({ 
      error: 'geoblocked',
      message: 'Service not available in your region'
    })
  }

  // Not geoblocked
  return res.status(200).json({ 
    geoblocked: false
  })
}

