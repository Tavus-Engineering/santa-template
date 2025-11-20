import { useState, useEffect, useRef } from 'react'
import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './CallControls.module.css'

export const CallControls = ({ onAnswer, showIntroVideo, onIntroVideoEnd }) => {
  const [videoStarted, setVideoStarted] = useState(false)
  const introVideoRef = useRef(null)
  const buttonRef = useRef(null)

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
          onPlay={() => {
            console.log('Loop video started playing')
            setVideoStarted(true)
          }}
        >
          <source src={ASSET_PATHS.videos.loop} type="video/mp4" />
        </video>
      )}
      <div className={`${styles.callingText} ${videoStarted ? styles.animate : ''}`}>
        Santa is calling you
      </div>
      <div className={styles.callControls}>
        <button 
          ref={buttonRef} 
          className={styles.unifiedButton}
          onClick={onAnswer}
        >
          <div className={styles.buttonLeft}>
            <div className={styles.answerIcon}></div>
            <span className={styles.answerText}>ANSWER HIS CALL</span>
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

