import { useState, useEffect } from 'react'
import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './Background.module.css'

export const Background = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768
    }
    return false
  })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const videoSource = isMobile ? ASSET_PATHS.videos.backgroundMobile : ASSET_PATHS.videos.background

  return (
    <>
      <div className={styles.mobileTopWhitespace}></div>
      <video 
        key={videoSource}
        className={styles.backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoSource} type="video/mp4" />
      </video>
      <div className={styles.backgroundGradientOverlay}></div>
      <div className={styles.backgroundPattern}></div>
    </>
  )
}

