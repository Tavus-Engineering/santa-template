import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../../utils/translations'
import { ASSET_PATHS } from '../../utils/assetPaths'
import { useSound } from '../../contexts/SoundContext'
import styles from './CallControls.module.css'

export const CallControls = ({ onAnswer, showIntroVideo, onIntroVideoEnd, selectedLanguage = 'en' }) => {
  const [videoStarted, setVideoStarted] = useState(false)
  const introVideoRef = useRef(null)
  const buttonRef = useRef(null)
  const t = useTranslation(selectedLanguage)
  const { playButtonClick } = useSound()

  // Start animation immediately or when video starts
  useEffect(() => {
    // Trigger animation after a short delay to ensure element is rendered
    const timer = setTimeout(() => {
      setVideoStarted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Ensure intro video properly handles ended event
  useEffect(() => {
    if (introVideoRef.current && showIntroVideo) {
      const video = introVideoRef.current
      const handleEnded = () => {
        console.log('Intro video ended, switching to loop video')
        onIntroVideoEnd()
      }
      
      video.addEventListener('ended', handleEnded)
      
      return () => {
        video.removeEventListener('ended', handleEnded)
      }
    }
  }, [showIntroVideo, onIntroVideoEnd])

  return (
    <>
      {showIntroVideo ? (
        <video 
          ref={introVideoRef}
          className={styles.santaVideo}
          autoPlay
          muted
          playsInline
          onError={(e) => {
            console.error('Intro video error:', e)
            onIntroVideoEnd()
          }}
        >
          <source src={ASSET_PATHS.videos.intro} type="video/mp4" />
        </video>
      ) : (
        <video 
          key="loop-video"
          className={styles.santaVideo}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={ASSET_PATHS.videos.loop} type="video/mp4" />
        </video>
      )}
      <div className={`${styles.callingText} ${videoStarted ? styles.animate : ''}`}>
        {t('santaIsCalling')}
      </div>
      <div className={styles.callControls}>
        <button 
          ref={buttonRef} 
          className={styles.unifiedButton}
          onClick={() => {
            playButtonClick()
            onAnswer()
          }}
        >
          <div className={styles.buttonLeft}>
            <div className={styles.answerIcon}></div>
            <span className={styles.answerText}>{t('answerHisCall')}</span>
          </div>
          <div className={styles.buttonDivider}></div>
          <div className={styles.buttonRight}>
            <img src={ASSET_PATHS.images.phoneIcon} alt="phone icon" className={styles.phoneIcon} />
          </div>
        </button>
      </div>
    </>
  )
}

