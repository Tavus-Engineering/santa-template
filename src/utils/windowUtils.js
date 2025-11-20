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
 * Calculate mobile position between hero text and icons
 */
export const calculateMobilePosition = (heroText, iconsTop, windowWidth, windowHeight) => {
  let textBottom = 0
  if (heroText) {
    const textRect = heroText.getBoundingClientRect()
    textBottom = textRect.bottom + 20 // Small gap from text
  } else {
    // Fallback: estimate text height
    textBottom = window.innerHeight * 0.20
  }

  // Icons are at bottom: 140px, plus icon height (~120px) = ~260px from bottom
  const calculatedIconsTop = iconsTop || (window.innerHeight - 260)

  // Available space between text and icons
  const availableHeight = calculatedIconsTop - textBottom
  const padding = 20 // Padding on both sides for spacing

  // Ensure we have enough space
  if (availableHeight > 100) {
    // Center the window vertically between hero text and icons
    const centerY = textBottom + (availableHeight / 2)
    const finalY = centerY - (windowHeight / 2) // Center the window

    return {
      x: (window.innerWidth - windowWidth) / 2,
      y: finalY,
      windowSize: {
        width: windowWidth,
        height: windowHeight
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

