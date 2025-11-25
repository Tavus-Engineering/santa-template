import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../utils/translations'
import { useWindowPosition } from '../../hooks/useWindowPosition'
import { useSound } from '../../contexts/SoundContext'
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
  const [isReplicaReady, setIsReplicaReady] = useState(false)
  const hasEndedOnExitRef = useRef(false)
  const t = useTranslation(selectedLanguage)
  const { playButtonClick } = useSound()

  const { position, windowSize, isDragging, handleDragStart, shouldBeFullscreen } = useWindowPosition({
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
    setIsReplicaReady(false)
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
    setIsReplicaReady(false)
    // Reset timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setCountdown(180)
    window.location.assign('https://platform.tavus.io/auth/sign-up?source=santa_demo')
  }

  const handleReplicaReady = () => {
    console.log('[VideoCallWindow] Replica ready callback received')
    setIsReplicaReady(true)
  }

  // Initialize timer when replica is ready (not during haircheck)
  useEffect(() => {
    if (isReplicaReady && !timerIntervalRef.current) {
      // Get timezone offset (negated getTimezoneOffset for correct calculation)
      const timezoneOffset = -new Date().getTimezoneOffset();
      
      // Fetch remaining time from usage API
      fetch(`/api/check-usage?timezoneOffset=${timezoneOffset}`, {
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
          console.log('[VideoCallWindow] Replica is ready - starting timer with remaining time:', remainingSeconds, 'seconds', 'Used:', data.usedSeconds, 'Can start:', data.canStart)
          
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
  }, [isReplicaReady])

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

  // End call when user exits Safari/closes tab/phone or switches tabs
  useEffect(() => {
    // Reset the exit flag when call state changes
    if (!isAnswered || !isHairCheckComplete) {
      hasEndedOnExitRef.current = false
      return
    }

    // Only set up listeners if call is active
    if (isCallEnded) {
      hasEndedOnExitRef.current = false
      return
    }

    const endCallOnExit = () => {
      // Prevent multiple calls to end using ref (avoids stale closure issues)
      if (hasEndedOnExitRef.current) {
        return
      }
      hasEndedOnExitRef.current = true
      console.log('[VideoCallWindow] User exiting/switching tabs/turning off device - ending call')
      if (conversationRef.current && conversationRef.current.end) {
        conversationRef.current.end()
      } else {
        handleConversationLeave()
      }
    }

    // Handle page unload (most reliable for device shutdown, app closure, tab closure)
    // This fires when the page is being unloaded, including when device is turned off
    const handlePageHide = (e) => {
      // e.persisted is false when page is being unloaded (not just cached)
      // This catches device shutdown, browser closure, tab closure
      if (!e.persisted) {
        endCallOnExit()
      }
    }

    // Handle before unload (desktop browsers, tab closure)
    const handleBeforeUnload = () => {
      endCallOnExit()
    }

    // Handle visibility change (tab switch, app backgrounding)
    // End call immediately when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        endCallOnExit()
      }
    }

    // Handle freeze event (mobile devices - fires when device is about to freeze/sleep)
    // This is especially important for mobile devices being turned off or going to sleep
    // Part of Page Lifecycle API (may not be supported in all browsers)
    const handleFreeze = () => {
      endCallOnExit()
    }

    // Add event listeners
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    // Freeze event for mobile device shutdown/sleep (Page Lifecycle API)
    // Note: May not be supported in all browsers, but pagehide should catch device shutdown
    if ('onfreeze' in document) {
      document.addEventListener('freeze', handleFreeze)
    }
    if ('onfreeze' in window) {
      window.addEventListener('freeze', handleFreeze)
    }

    // Cleanup
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if ('onfreeze' in document) {
        document.removeEventListener('freeze', handleFreeze)
      }
      if ('onfreeze' in window) {
        window.removeEventListener('freeze', handleFreeze)
      }
    }
  }, [isAnswered, isHairCheckComplete, isCallEnded])

  const handleClose = (e) => {
    e.stopPropagation()
    playButtonClick()
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
      className={`${styles.videoCallWindow} ${isAnswered ? styles.windowAnswered : ''} ${shouldBeFullscreen ? styles.mobileFullscreen : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
        ...(windowSize && !isAnswered && !shouldBeFullscreen && window.innerWidth <= 768 ? {
          width: `${windowSize.width}px`,
          height: `${windowSize.height}px`
        } : {})
      }}
    >
      <div 
        className={styles.windowTitleBar}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className={styles.titleBarLeft}>
          <span className={styles.titleIcon}></span>
          <span className={styles.titleText}>{t('santa')}</span>
        </div>
        <div className={styles.titleBarRight}>
          <div className={styles.menuLines}></div>
          <span 
            className={styles.windowControl}
            onClick={handleClose}
          >
            <img src="/close_button.svg" alt="Close" className={styles.windowControlInner} />
          </span>
        </div>
      </div>
      
      <div className={styles.videoFeed}>
        {!isAnswered ? (
          <CallControls 
            onAnswer={handleAnswer}
            showIntroVideo={showIntroVideo}
            onIntroVideoEnd={handleIntroVideoEnd}
            selectedLanguage={selectedLanguage}
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
                  selectedLanguage={selectedLanguage}
                />
              </div>
            ) : isCallEnded ? (
              <CallEndedScreen onContinue={handleCallEndedContinue} selectedLanguage={selectedLanguage} />
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
                      onReplicaReady={handleReplicaReady}
                    />
                  </>
                ) : (
                  <ConnectingScreen error={error} selectedLanguage={selectedLanguage} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

