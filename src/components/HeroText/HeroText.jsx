import { useEffect, useRef } from 'react'
import { useTranslation } from '../../utils/translations'
import styles from './HeroText.module.css'

export const HeroText = ({ selectedLanguage = 'en' }) => {
  const t = useTranslation(selectedLanguage)
  const textRef = useRef(null)
  const containerRef = useRef(null)
  const heroText = t('heroMeet')
  
  useEffect(() => {
    const adjustFontSize = () => {
      if (!textRef.current || !containerRef.current) return
      
      const container = containerRef.current
      const text = textRef.current
      const padding = window.innerWidth <= 768 ? 100 : 120
      const maxWidth = container.offsetWidth - padding
      
      const baseSize = window.innerWidth <= 768 
        ? Math.min(150, Math.max(56, window.innerWidth * 0.14))
        : Math.min(150, Math.max(56, window.innerWidth * 0.10))
      
      text.style.fontSize = `${baseSize}px`
      
      let iterations = 0
      while (text.scrollWidth > maxWidth && iterations < 10) {
        const scale = maxWidth / text.scrollWidth
        const currentSize = parseFloat(text.style.fontSize)
        const newSize = currentSize * scale * 0.95
        text.style.fontSize = `${Math.max(24, newSize)}px`
        iterations++
      }
    }
    
    const timeoutId = setTimeout(() => {
      adjustFontSize()
    }, 0)
    
    window.addEventListener('resize', adjustFontSize)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', adjustFontSize)
    }
  }, [selectedLanguage, heroText])
  
  return (
    <div ref={containerRef} className={styles.heroText}>
      <span ref={textRef} className={styles.heroTextMeet}>
        {heroText}
      </span>
    </div>
  )
}

