import { useState, useEffect } from 'react'

/**
 * Custom hook to check if user is geoblocked
 * Makes a lightweight request to check geoblocking status
 */
export const useGeoblockCheck = () => {
  const [isGeoblocked, setIsGeoblocked] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkGeoblock = async () => {
      try {
        // For testing: add ?testCountry=XX to URL to simulate geoblocking
        // Example: http://localhost:5173?testCountry=CN
        const urlParams = new URLSearchParams(window.location.search)
        const testCountry = urlParams.get('testCountry')
        const apiUrl = testCountry 
          ? `/api/check-geoblock?testCountry=${testCountry}`
          : '/api/check-geoblock'
        
        // Make a lightweight GET request to check geoblocking
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.error === 'geoblocked') {
            setIsGeoblocked(true)
          }
        } else if (!response.ok) {
          // Log non-403 errors for debugging
          const errorText = await response.text().catch(() => 'Unknown error')
          console.warn('[useGeoblockCheck] API returned error:', response.status, errorText)
        }
      } catch (error) {
        // If check fails, assume not geoblocked (don't block user)
        // This is expected if running with `npm run dev` instead of `vercel dev`
        console.warn('[useGeoblockCheck] Failed to check geoblocking (API may not be available):', error.message)
      } finally {
        setIsChecking(false)
      }
    }

    checkGeoblock()
  }, [])

  return { isGeoblocked, isChecking }
}

