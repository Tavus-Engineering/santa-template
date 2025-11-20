import { useState, useEffect } from 'react'

/**
 * Custom hook for Christmas countdown timer
 * Calculates time until Christmas from local datetime
 */
export const useCountdown = () => {
  const getTimeUntilChristmas = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const christmas = new Date(currentYear, 11, 25, 0, 0, 0, 0) // December 25 at midnight local time
    
    // If Christmas has passed this year, calculate for next year
    if (now > christmas) {
      christmas.setFullYear(currentYear + 1)
    }
    
    const diffTime = christmas - now
    
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffTime % (1000 * 60)) / 1000)
    
    return { days, hours, minutes, seconds }
  }

  const [timeUntilChristmas, setTimeUntilChristmas] = useState(getTimeUntilChristmas())

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      setTimeUntilChristmas(getTimeUntilChristmas())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  return timeUntilChristmas
}

