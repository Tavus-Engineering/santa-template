import { useState, useEffect } from 'react'
import { getAllVideoPaths, getAllImagePaths } from '../utils/assetPaths'

/**
 * Custom hook for preloading videos and images
 * Ensures minimum loading time of 1 second
 */
export const useAssetPreloader = () => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const startTime = Date.now()
    const minLoadTime = 1000 // Minimum 1 second loading screen

    const videos = getAllVideoPaths()
    const images = getAllImagePaths()

    // Preload videos - ensure they're fully buffered
    const videoPromises = videos.map(src => {
      return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'auto'
        video.muted = true
        video.playsInline = true
        
        let resolved = false
        let readyStateCheck = null
        let timeout = null
        
        const cleanup = () => {
          if (readyStateCheck) {
            clearInterval(readyStateCheck)
            readyStateCheck = null
          }
          if (timeout) {
            clearTimeout(timeout)
            timeout = null
          }
          video.removeEventListener('canplaythrough', handleCanPlayThrough)
          video.removeEventListener('progress', handleProgress)
          video.onerror = null
        }
        
        const doResolve = () => {
          if (!resolved) {
            resolved = true
            cleanup()
            resolve()
          }
        }
        
        const checkReadyState = () => {
          // readyState 4 = HAVE_ENOUGH_DATA (can play through)
          if (video.readyState >= 4 && !resolved) {
            // Give it a moment to ensure buffering is complete
            setTimeout(() => doResolve(), 100)
          }
        }
        
        const handleCanPlayThrough = () => {
          if (!resolved) {
            // Double check readyState and wait a bit more for full buffering
            setTimeout(() => {
              if (video.readyState >= 4) {
                doResolve()
              } else {
                // If not ready, continue checking
                checkReadyState()
              }
            }, 200)
          }
        }
        
        const handleProgress = () => {
          checkReadyState()
        }
        
        const handleError = () => {
          // Resolve even on error to not block loading
          doResolve()
        }
        
        // Listen for canplaythrough (most reliable)
        video.addEventListener('canplaythrough', handleCanPlayThrough, { once: true })
        
        // Also listen for progress to catch when enough data is loaded
        video.addEventListener('progress', handleProgress)
        
        // Check readyState periodically
        readyStateCheck = setInterval(() => {
          checkReadyState()
          if (resolved) {
            cleanup()
          }
        }, 100)
        
        // Timeout fallback (10 seconds max per video)
        timeout = setTimeout(() => {
          doResolve() // Resolve anyway after timeout
        }, 10000)
        
        video.onerror = handleError
        video.src = src
        video.load() // Force load
      })
    })

    // Preload images
    const imagePromises = images.map(src => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve() // Resolve even on error to not block loading
        img.src = src
      })
    })

    // Wait for all assets to load, then ensure minimum 1 second has passed
    Promise.all([...videoPromises, ...imagePromises]).then(() => {
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadTime - elapsed)
      
      setTimeout(() => {
        setIsLoading(false)
      }, remainingTime)
    })
  }, [])

  return isLoading
}

