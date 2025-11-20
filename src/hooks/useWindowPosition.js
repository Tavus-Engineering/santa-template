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
        // Mobile: size and position window between hero text and icons
        setTimeout(() => {
          const heroText = document.querySelector('.hero-text')
          const iconsTop = window.innerHeight - 260
          const windowWidth = window.innerWidth * 0.9
          const availableHeight = iconsTop - (heroText ? heroText.getBoundingClientRect().bottom + 20 : window.innerHeight * 0.20)
          const padding = 20

          if (availableHeight > 100) {
            const calculatedHeight = availableHeight - (padding * 2)
            const result = calculateMobilePosition(heroText, iconsTop, windowWidth, calculatedHeight)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }
        }, 50)
      }
    }
  }, [isLoading, isMinimized, isAnswered])

  // Handle minimize/restore position changes
  useEffect(() => {
    if (isMinimized) {
      setHasBeenManuallyDragged(false)
      const mainContent = document.querySelector('.main-content')
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect()
        const pos = calculateMinimizedPosition(rect)
        setPosition(pos)
      }
    } else {
      setHasBeenManuallyDragged(false)
      const mobile = isMobile()
      const mainContent = document.querySelector('.main-content')

      if (mobile && isAnswered) {
        // On mobile, fill the screen only after answering
        setWindowSize(null)
        setPosition({ x: 0, y: 0 })
      } else if (mobile && !isAnswered) {
        // On mobile before answering, calculate available space
        setTimeout(() => {
          const heroText = document.querySelector('.hero-text')
          const iconsTop = window.innerHeight - 260
          const windowWidth = window.innerWidth * 0.9
          const textBottom = heroText ? heroText.getBoundingClientRect().bottom + 20 : window.innerHeight * 0.20
          const availableHeight = iconsTop - textBottom
          const padding = 20

          if (availableHeight > 100) {
            const calculatedHeight = availableHeight - (padding * 2)
            const result = calculateMobilePosition(heroText, iconsTop, windowWidth, calculatedHeight)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }
        }, 50)
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
        setTimeout(() => {
          const heroText = document.querySelector('.hero-text')
          const iconsTop = window.innerHeight - 260
          const textBottom = heroText ? heroText.getBoundingClientRect().bottom + 20 : window.innerHeight * 0.20
          const availableHeight = iconsTop - textBottom
          const padding = 20

          if (availableHeight > 100) {
            const windowWidth = window.innerWidth * 0.9
            const calculatedHeight = availableHeight - (padding * 2)
            const result = calculateMobilePosition(heroText, iconsTop, windowWidth, calculatedHeight)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }
        }, 50)
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
        setTimeout(() => {
          const heroText = document.querySelector('.hero-text')
          const iconsTop = window.innerHeight - 260
          const textBottom = heroText ? heroText.getBoundingClientRect().bottom + 20 : window.innerHeight * 0.20
          const availableHeight = iconsTop - textBottom
          const padding = 20

          if (availableHeight > 100) {
            const windowWidth = window.innerWidth * 0.9
            const calculatedHeight = availableHeight - (padding * 2)
            const result = calculateMobilePosition(heroText, iconsTop, windowWidth, calculatedHeight)
            if (result) {
              setWindowSize(result.windowSize)
              setPosition({ x: result.x, y: result.y })
            }
          }
        }, 50)
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

  // Handle mouse down for dragging
  const handleMouseDown = (e) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && windowRef.current) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        })
        setHasBeenManuallyDragged(true)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  return {
    position,
    windowSize,
    isDragging,
    handleMouseDown
  }
}

