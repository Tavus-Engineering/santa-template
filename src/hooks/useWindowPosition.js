import { useState, useEffect, useRef } from 'react'
import {
  calculateDesktopPosition,
  calculateMobilePosition,
  calculateMinimizedPosition,
  isMobile,
  getDesktopWindowDimensions,
  getMobileWindowDimensions
} from '../utils/windowUtils'

/**
 * Custom hook for window positioning and dragging
 * Handles both desktop and mobile positioning, dragging, and resizing
 */
export const useWindowPosition = ({
  isLoading,
  isMinimized,
  isAnswered,
  windowRef
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [windowSize, setWindowSize] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasBeenManuallyDragged, setHasBeenManuallyDragged] = useState(false)
  const isFirstOpenRef = useRef(true)
  const hasBeenMinimizedRef = useRef(false)

  // Initialize position for centered window on mount (after loading)
  useEffect(() => {
    if (isLoading) return

    const mainContent = document.querySelector('.main-content')
    if (mainContent && !isMinimized) {
      const rect = mainContent.getBoundingClientRect()
      const mobile = isMobile()

      if (!mobile) {
        // Desktop: center the window
        const { width, height } = getDesktopWindowDimensions(rect)
        const pos = calculateDesktopPosition(rect, width, height)
        setPosition(pos)
      } else if (mobile && !isAnswered) {
        // Mobile: only use custom positioning on first open (before any minimize)
        // After being minimized, use fullscreen
        if (!hasBeenMinimizedRef.current) {
          // First open: position window below hero text, extending to cover icons but stopping above powered image
        setTimeout(() => {
          const heroText = document.querySelector('[data-hero-text="true"]')
          const windowWidth = window.innerWidth * 0.9
            const result = calculateMobilePosition(heroText, null, windowWidth, null)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }, 50)
        } else {
          // After being minimized: use fullscreen
          setWindowSize(null)
          setPosition({ x: 0, y: 0 })
          }
      }
    }
  }, [isLoading, isMinimized, isAnswered])

  // Handle minimize/restore position changes
  useEffect(() => {
    if (isMinimized) {
      hasBeenMinimizedRef.current = true
      setHasBeenManuallyDragged(false)
      const mainContent = document.querySelector('.main-content')
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect()
        const pos = calculateMinimizedPosition(rect)
        setPosition(pos)
      }
    } else {
      // When restoring, if window has been minimized before on mobile, use fullscreen
      if (isMobile() && !isAnswered && hasBeenMinimizedRef.current) {
        setWindowSize(null)
        setPosition({ x: 0, y: 0 })
        return
      }
      setHasBeenManuallyDragged(false)
      const mobile = isMobile()
      const mainContent = document.querySelector('.main-content')

      if (mobile && isAnswered) {
        // On mobile, fill the screen only after answering
        setWindowSize(null)
        setPosition({ x: 0, y: 0 })
      } else if (mobile && !isAnswered) {
        // On mobile before answering, only use custom positioning on first open (before any minimize)
        if (!hasBeenMinimizedRef.current) {
          // First open: position window below hero text, extending to cover icons but stopping above powered image
        setTimeout(() => {
          const heroText = document.querySelector('[data-hero-text="true"]')
          const windowWidth = window.innerWidth * 0.9
            const result = calculateMobilePosition(heroText, null, windowWidth, null)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }, 50)
        } else {
          // After being minimized: use fullscreen
          setWindowSize(null)
          setPosition({ x: 0, y: 0 })
          }
      } else if (mainContent) {
        // On desktop, center the window
        setWindowSize(null)
        const rect = mainContent.getBoundingClientRect()
        const { width, height } = getDesktopWindowDimensions(rect)
        const pos = calculateDesktopPosition(rect, width, height)
        setPosition(pos)
      }
    }
  }, [isMinimized, isAnswered])

  // Auto-resize and reposition window on viewport resize (only if not manually dragged)
  useEffect(() => {
    if (isMinimized || hasBeenManuallyDragged) return

    const handleResize = () => {
      const mobile = isMobile()
      const mainContent = document.querySelector('.main-content')

      if (!mainContent) return

      if (mobile && !isAnswered) {
        // Only use custom positioning on first open (before any minimize)
        if (!hasBeenMinimizedRef.current) {
        setTimeout(() => {
          const heroText = document.querySelector('[data-hero-text="true"]')
            const windowWidth = window.innerWidth * 0.9
            const result = calculateMobilePosition(heroText, null, windowWidth, null)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }, 50)
        } else {
          // After being minimized: use fullscreen
          setWindowSize(null)
          setPosition({ x: 0, y: 0 })
          }
      } else if (!mobile) {
        // Desktop: center the window
        setWindowSize(null)
        const rect = mainContent.getBoundingClientRect()
        const { width, height } = getDesktopWindowDimensions(rect)
        const pos = calculateDesktopPosition(rect, width, height)
        setPosition(pos)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMinimized, isAnswered, hasBeenManuallyDragged])

  // Recalculate window size on resize (mobile only)
  useEffect(() => {
    if (!isMinimized && !isAnswered && isMobile()) {
      const handleResize = () => {
        // Only use custom positioning on first open (before any minimize)
        if (!hasBeenMinimizedRef.current) {
        setTimeout(() => {
          const heroText = document.querySelector('[data-hero-text="true"]')
            const windowWidth = window.innerWidth * 0.9
            const result = calculateMobilePosition(heroText, null, windowWidth, null)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }, 50)
        } else {
          // After being minimized: use fullscreen
          setWindowSize(null)
          setPosition({ x: 0, y: 0 })
          }
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [isMinimized, isAnswered])

  // Update position when answered state changes (for mobile fullscreen)
  useEffect(() => {
    if (!isMinimized && isAnswered && isMobile()) {
      setWindowSize(null)
      setPosition({ x: 0, y: 0 })
    }
  }, [isAnswered, isMinimized])

  // Helper function to extract coordinates from mouse or touch events
  const getEventCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      // Touch event
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    }
    // Mouse event
    return {
      x: e.clientX,
      y: e.clientY
    }
  }

  // Handle drag start (mouse or touch)
  const handleDragStart = (e) => {
    if (windowRef.current) {
      // Prevent default to avoid scrolling on touch devices
      if (e.type === 'touchstart') {
        e.preventDefault()
      }
      
      const rect = windowRef.current.getBoundingClientRect()
      const coords = getEventCoordinates(e)
      setDragStart({
        x: coords.x - rect.left,
        y: coords.y - rect.top
      })
      setIsDragging(true)
    }
  }

  // Handle dragging (mouse or touch)
  useEffect(() => {
    const handleMove = (e) => {
      if (isDragging && windowRef.current) {
        // Prevent default to avoid scrolling on touch devices
        if (e.type === 'touchmove') {
          e.preventDefault()
        }
        
        const windowRect = windowRef.current.getBoundingClientRect()
        const windowWidth = windowRect.width
        const windowHeight = windowRect.height
        
        const coords = getEventCoordinates(e)
        
        // Calculate desired position (viewport coordinates since window is position: fixed)
        let newX = coords.x - dragStart.x
        let newY = coords.y - dragStart.y
        
        // Constrain to viewport bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth))
        newY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight))
        
        setPosition({
          x: newX,
          y: newY
        })
        setHasBeenManuallyDragged(true)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      // Add both mouse and touch event listeners
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
      document.addEventListener('touchcancel', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      document.removeEventListener('touchcancel', handleEnd)
    }
  }, [isDragging, dragStart])

  return {
    position,
    windowSize,
    isDragging,
    handleDragStart,
    shouldBeFullscreen: isMobile() && hasBeenMinimizedRef.current && !isAnswered
  }
}

