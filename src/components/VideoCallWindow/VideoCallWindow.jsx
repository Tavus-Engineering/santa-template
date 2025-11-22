import { useState, useRef } from 'react'
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
  const conversationRef = useRef(null)

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
  }

  const handleJoin = () => {
    setIsHairCheckComplete(true)
  }

  const handleCallEndedContinue = () => {
    setIsCallEnded(false)
    setIsHairCheckComplete(false)
    setIsAnswered(false)
  }

  const handleConversationLeave = () => {
    console.log('[VideoCallWindow] Conversation onLeave called')
    setIsCallEnded(true)
  }

  const handleClose = (e) => {
    e.stopPropagation()
    // If call is active, end it; otherwise just minimize
    if (isAnswered && isHairCheckComplete && !isCallEnded) {
      // Trigger the conversation to leave the call
      if (conversationRef.current) {
        conversationRef.current.leave()
      } else {
        // Fallback: just set call ended
        handleConversationLeave()
      }
    } else {
      setIsMinimized(true)
    }
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
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={onLanguageChange}
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

