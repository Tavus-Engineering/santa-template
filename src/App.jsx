import { useState, useRef } from 'react'
import { getTranslation } from './utils/translations'
import './App.css'
import { useAssetPreloader } from './hooks/useAssetPreloader'
import { useGeoblockCheck } from './hooks/useGeoblockCheck'
import { useTavusConversation } from './hooks/useTavusConversation'
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen'
import { GeoblockedScreen } from './components/GeoblockedScreen/GeoblockedScreen'
import { Background } from './components/Background/Background'
import { Header } from './components/Header/Header'
import { HeroText } from './components/HeroText/HeroText'
import { Footer } from './components/Footer/Footer'
import { MobileCountdown } from './components/MobileCountdown/MobileCountdown'
import { MobilePowered } from './components/MobilePowered/MobilePowered'
import { WindowIcon } from './components/WindowIcon/WindowIcon'
import { VideoCallWindow } from './components/VideoCallWindow/VideoCallWindow'
import { FlappyWindow } from './components/FlappyWindow/FlappyWindow'
import { ASSET_PATHS } from './utils/assetPaths'

function App() {
  const isLoading = useAssetPreloader()
  const { isGeoblocked, isChecking } = useGeoblockCheck()
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFlappyMinimized, setIsFlappyMinimized] = useState(true)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isHairCheckComplete, setIsHairCheckComplete] = useState(false)
  const [isCallEnded, setIsCallEnded] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const windowRef = useRef(null)
  const flappyWindowRef = useRef(null)
  const hasBeenMinimizedRef = useRef(false)

  // Only start conversation when user clicks "Answer His Call"
  const { conversationUrl, conversationId, error } = useTavusConversation(isAnswered, false, selectedLanguage, isHairCheckComplete)

  const handleSantaIconClick = () => {
    if (isMinimized) {
      setIsFlappyMinimized(true)
    }
    // Track that window has been minimized (when closing)
    if (!isMinimized) {
      hasBeenMinimizedRef.current = true
    }
    setIsMinimized(!isMinimized)
  }

  const handleFlappyIconClick = () => {
    if (isFlappyMinimized) {
      setIsMinimized(true)
    }
    setIsFlappyMinimized(!isFlappyMinimized)
  }

  const handleCallEndedContinue = () => {
    setIsCallEnded(false)
    setIsHairCheckComplete(false)
    setIsAnswered(false)
  }

  // Show loading screen
  if (isLoading || isChecking) {
    return <LoadingScreen selectedLanguage={selectedLanguage} />
  }

  // Show geoblocked screen if user is geoblocked
  if (isGeoblocked || error === 'geoblocked') {
    return <GeoblockedScreen selectedLanguage={selectedLanguage} />
  }

  return (
    <div className="app">
      <Background />
      
      <Header 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        isDisabled={isHairCheckComplete && !isCallEnded}
      />
      
      <MobileCountdown 
        selectedLanguage={selectedLanguage} 
        isWindowOpen={hasBeenMinimizedRef.current && (!isMinimized || !isFlappyMinimized)}
      />
      
      <HeroText selectedLanguage={selectedLanguage} />

      <Footer 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        isDisabled={isHairCheckComplete && !isCallEnded}
      />

      <MobilePowered isWindowOpen={hasBeenMinimizedRef.current && (!isMinimized || !isFlappyMinimized)} />

      <main className="main-content">
        <WindowIcon
          icon={ASSET_PATHS.images.santa}
          title={getTranslation(selectedLanguage, 'santa')}
          isOpen={!isMinimized}
          onClick={handleSantaIconClick}
        />

        <WindowIcon
          icon={ASSET_PATHS.images.elf}
          title={getTranslation(selectedLanguage, 'flappyElf')}
          isOpen={!isFlappyMinimized}
          onClick={handleFlappyIconClick}
          position="flappy"
        />
      </main>

      <VideoCallWindow
        isLoading={isLoading}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        isAnswered={isAnswered}
        setIsAnswered={setIsAnswered}
        isHairCheckComplete={isHairCheckComplete}
        setIsHairCheckComplete={setIsHairCheckComplete}
        conversationUrl={conversationUrl}
        conversationId={conversationId}
        error={error}
        isCallEnded={isCallEnded}
        setIsCallEnded={setIsCallEnded}
        windowRef={windowRef}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />

      <FlappyWindow
        isMinimized={isFlappyMinimized}
        setIsMinimized={setIsFlappyMinimized}
        windowRef={flappyWindowRef}
        selectedLanguage={selectedLanguage}
      />
    </div>
  )
}

export default App
