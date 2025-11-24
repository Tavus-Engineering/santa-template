// Window positioning utility functions

/**
 * Calculate centered position for desktop window
 */
export const calculateDesktopPosition = (mainContentRect, windowWidth, windowHeight) => {
  return {
    x: mainContentRect.left + (mainContentRect.width - windowWidth) / 2,
    y: mainContentRect.top + (mainContentRect.height - windowHeight) / 2
  }
}

/**
 * Calculate mobile position below hero text, extending to cover icons but stopping above powered image
 */
export const calculateMobilePosition = (heroText, iconsTop, windowWidth, windowHeight = null) => {
  let textBottom = 0
  if (heroText) {
    const textRect = heroText.getBoundingClientRect()
    textBottom = textRect.bottom + 120 // Even larger gap from text to ensure it doesn't cover hero text
  } else {
    // Fallback: estimate text height
    textBottom = window.innerHeight * 0.45
  }

  // Powered image is at bottom: 30px, with padding 30px and image height ~30px = ~90px from bottom
  // Leave some extra space, so stop at ~100px from bottom
  const poweredImageSpace = 100
  const endY = window.innerHeight - poweredImageSpace

  // Available height from hero text to above powered image
  const availableHeight = endY - textBottom

  // Ensure we have enough space
  if (availableHeight > 100) {
    // Position window starting right below hero text
    // Window will extend down to cover icons and stop above powered image
    const finalY = textBottom

    return {
      x: (window.innerWidth - windowWidth) / 2,
      y: finalY,
      windowSize: {
        width: windowWidth,
        height: availableHeight - 10 // Use available height minus small padding
      }
    }
  }

  return null
}

/**
 * Calculate minimized window position (right side)
 */
export const calculateMinimizedPosition = (mainContentRect) => {
  return {
    x: mainContentRect.right - 120 - 20, // Account for right margin
    y: mainContentRect.top + 20
  }
}

/**
 * Check if device is mobile
 */
export const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768

/**
 * Calculate window dimensions for desktop
 */
export const getDesktopWindowDimensions = (mainContentRect) => {
  const windowWidth = Math.min(750, mainContentRect.width - 80)
  const aspectRatio = 10 / 16
  const windowHeight = windowWidth * aspectRatio
  return { width: windowWidth, height: windowHeight }
}

/**
 * Calculate window dimensions for mobile (before answered)
 */
export const getMobileWindowDimensions = (availableHeight) => {
  const padding = 20
  const windowWidth = window.innerWidth * 0.9
  const calculatedHeight = availableHeight - (padding * 2)
  return { width: windowWidth, height: calculatedHeight }
}

