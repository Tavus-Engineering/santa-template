import { useState, useRef, useEffect } from 'react'
import { useWindowPosition } from '../../hooks/useWindowPosition'
import { HairCheck } from '../cvi/components/hair-check'
import { Conversation } from '../cvi/components/conversation'
import { CallControls } from '../CallControls/CallControls'
import { CallEndedScreen } from '../CallEndedScreen/CallEndedScreen'
import { ConnectingScreen } from '../ConnectingScreen/ConnectingScreen'
import styles from './VideoCallWindow.module.css'

export const VideoCallWindow = ({
  isLoading,
  isMinimized,
  setIsMinimized,
  isAnswered,
  setIsAnswered,
  isHairCheckComplete,
  setIsHairCheckComplete,
  conversationUrl,
  conversationId,
  error,
  isCallEnded,
  setIsCallEnded,
  windowRef,
  selectedLanguage,
  onLanguageChange
}) => {
  const [showIntroVideo, setShowIntroVideo] = useState(true)
  const [countdown, setCountdown] = useState(180)
  const conversationRef = useRef(null)
  const timerIntervalRef = useRef(null)

  const { position, windowSize, isDragging, handleMouseDown } = useWindowPosition({
    isLoading,
    isMinimized,
    isAnswered,
    windowRef
  })

  const handleIntroVideoEnd = () => {
    console.log('Intro video ended, switching to loop video')
    setShowIntroVideo(false)
  }

  const handleAnswer = () => {
    setIsAnswered(true)
  }

  const handleCancel = () => {
    setIsAnswered(false)
    // Cleanup timer when cancelling
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setCountdown(180)
  }

  const handleJoin = () => {
    setIsHairCheckComplete(true)
  }

  const handleCallEndedContinue = () => {
    setIsCallEnded(false)
    setIsHairCheckComplete(false)
    setIsAnswered(false)
    // Reset timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setCountdown(180)
  }

  // Initialize timer when haircheck is shown (when user answers the call)
  useEffect(() => {
    if (isAnswered && !isHairCheckComplete && !timerIntervalRef.current) {
      // Fetch remaining time from usage API
      fetch('/api/check-usage', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          // Check if Set-Cookie header is present (only sent when creating NEW cookie)
          // If cookie already exists, Set-Cookie won't be in response - that's normal!
          const setCookieHeader = res.headers.get('Set-Cookie')
          const xCookieSet = res.headers.get('X-Cookie-Set')
          const xUserId = res.headers.get('X-User-ID')
          
          console.log('[VideoCallWindow] check-usage response status:', res.status)
          
          // Set-Cookie only appears when creating a NEW cookie
          // If cookie already exists (which is normal), Set-Cookie won't be present
          if (setCookieHeader || xCookieSet) {
            console.log('[VideoCallWindow] New cookie created - Set-Cookie:', !!setCookieHeader, 'X-Cookie-Set:', xCookieSet, 'X-User-ID:', xUserId)
          } else {
            console.log('[VideoCallWindow] Using existing cookie (this is normal if you already have a cookie)')
          }
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then(data => {
          const remainingSeconds = Math.max(0, data.remainingSeconds || 180)
          setCountdown(remainingSeconds)
          console.log('[VideoCallWindow] Initialized timer during haircheck with remaining time:', remainingSeconds, 'seconds', 'Used:', data.usedSeconds, 'Can start:', data.canStart)
          
          // Start countdown timer (only if not already running)
          if (!timerIntervalRef.current) {
            timerIntervalRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          }
        })
        .catch(error => {
          console.error('[VideoCallWindow] Failed to fetch remaining time:', error)
          // Fallback to 180 seconds if API call fails
          setCountdown(180)
          
          // Start countdown timer even if API call fails (only if not already running)
          if (!timerIntervalRef.current) {
            timerIntervalRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          }
        })
    }
  }, [isAnswered, isHairCheckComplete])

  // Cleanup timer when call ends or is cancelled
  useEffect(() => {
    if (!isAnswered || isCallEnded) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [isAnswered, isCallEnded])

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

  const handleConversationLeave = () => {
    console.log('[VideoCallWindow] Conversation onLeave called')
    setIsCallEnded(true)
  }

  const handleClose = (e) => {
    e.stopPropagation()
    // If call is active, end it (not just leave) and close window
    if (isAnswered && isHairCheckComplete && !isCallEnded) {
      // End the call (ends for all participants, not just leave)
      if (conversationRef.current && conversationRef.current.end) {
        conversationRef.current.end()
      } else {
        // Fallback: just set call ended
        handleConversationLeave()
      }
    }
    // Always minimize/close the window
    setIsMinimized(true)
  }

  if (isMinimized) {
    return null
  }

  return (
    <div 
      ref={windowRef}
      className={`${styles.videoCallWindow} ${isAnswered ? styles.windowAnswered : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
        ...(windowSize && !isAnswered && window.innerWidth <= 768 ? {
          width: `${windowSize.width}px`,
          height: `${windowSize.height}px`
        } : {})
      }}
    >
      <div 
        className={styles.windowTitleBar}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className={styles.titleBarLeft}>
          <span className={styles.titleIcon}></span>
          <span className={styles.titleText}>SANTA</span>
        </div>
        <div className={styles.titleBarRight}>
          <div className={styles.menuLines}></div>
          <span 
            className={styles.windowControl}
            onClick={handleClose}
          >
            <span className={styles.windowControlInner}></span>
          </span>
        </div>
      </div>
      
      <div className={styles.videoFeed}>
        {!isAnswered ? (
          <CallControls 
            onAnswer={handleAnswer}
            showIntroVideo={showIntroVideo}
            onIntroVideoEnd={handleIntroVideoEnd}
          />
        ) : (
          <div className={styles.answeredScreen}>
            {!isHairCheckComplete ? (
              <div className={styles.haircheckContainer}>
                <HairCheck
                  onJoin={handleJoin}
                  onCancel={handleCancel}
                  conversationUrl={conversationUrl}
                  conversationId={conversationId}
                />
              </div>
            ) : isCallEnded ? (
              <CallEndedScreen onContinue={handleCallEndedContinue} />
            ) : (
              <div className={styles.conversationContainer}>
                {conversationUrl ? (
                  <>
                    {console.log('[VideoCallWindow] Rendering Conversation component with URL:', conversationUrl)}
                    <Conversation 
                      ref={conversationRef}
                      conversationUrl={conversationUrl}
                      conversationId={conversationId}
                      onLeave={handleConversationLeave}
                      selectedLanguage={selectedLanguage}
                      shouldJoin={isHairCheckComplete}
                      countdown={countdown}
                      setCountdown={setCountdown}
                    />
                  </>
                ) : (
                  <ConnectingScreen error={error} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

