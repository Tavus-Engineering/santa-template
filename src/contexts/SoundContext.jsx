import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { ASSET_PATHS } from '../utils/assetPaths'

const SoundContext = createContext(null)

export const SoundProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(true)
  const backgroundMusicRef = useRef(null)
  const buttonClickSoundRef = useRef(null)
  const callEndSoundRef = useRef(null)
  const callFailureSoundRef = useRef(null)
  const gameFailureSoundRef = useRef(null)
  const gameJumpSoundRef = useRef(null)

  useEffect(() => {
    // Create background music audio element
    const backgroundMusic = new Audio(ASSET_PATHS.sounds.backgroundMusic)
    backgroundMusic.loop = true
    backgroundMusic.muted = true
    backgroundMusic.volume = 1.0
    
    // Start playing (muted by default)
    backgroundMusic.play().catch(error => {
      console.log('Background music autoplay blocked:', error)
    })
    
    backgroundMusicRef.current = backgroundMusic

    // Create button click sound audio element
    const buttonClickSound = new Audio(ASSET_PATHS.sounds.buttonClick)
    buttonClickSound.volume = 0.5
    buttonClickSoundRef.current = buttonClickSound

    // Create call end sound audio element
    const callEndSound = new Audio(ASSET_PATHS.sounds.callEnd)
    callEndSound.volume = 0.7
    callEndSoundRef.current = callEndSound

    // Create call failure sound audio element
    const callFailureSound = new Audio(ASSET_PATHS.sounds.callFailure)
    callFailureSound.volume = 0.7
    callFailureSoundRef.current = callFailureSound

    // Create game failure sound audio element
    const gameFailureSound = new Audio(ASSET_PATHS.sounds.gameFailure)
    gameFailureSound.volume = 0.7
    gameFailureSoundRef.current = gameFailureSound

    // Create game jump sound audio element
    const gameJumpSound = new Audio(ASSET_PATHS.sounds.gameJump)
    gameJumpSound.volume = 0.6
    gameJumpSoundRef.current = gameJumpSound

    // Cleanup on unmount
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause()
        backgroundMusicRef.current = null
      }
      if (buttonClickSoundRef.current) {
        buttonClickSoundRef.current = null
      }
      if (callEndSoundRef.current) {
        callEndSoundRef.current = null
      }
      if (callFailureSoundRef.current) {
        callFailureSoundRef.current = null
      }
      if (gameFailureSoundRef.current) {
        gameFailureSoundRef.current = null
      }
      if (gameJumpSoundRef.current) {
        gameJumpSoundRef.current = null
      }
    }
  }, [])

  const toggleMute = () => {
    if (backgroundMusicRef.current) {
      const newMutedState = !isMuted
      backgroundMusicRef.current.muted = newMutedState
      setIsMuted(newMutedState)
      
      // If unmuting, ensure audio is playing
      if (!newMutedState) {
        backgroundMusicRef.current.play().catch(error => {
          console.log('Background music play failed:', error)
        })
      }
    }
  }

  const muteMusic = () => {
    if (backgroundMusicRef.current && !isMuted) {
      backgroundMusicRef.current.muted = true
      setIsMuted(true)
    }
  }

  const playButtonClick = () => {
    // Only play if not muted
    if (!isMuted && buttonClickSoundRef.current) {
      // Reset to start and play
      buttonClickSoundRef.current.currentTime = 0
      buttonClickSoundRef.current.play().catch(error => {
        console.log('Button click sound play failed:', error)
      })
    }
  }

  const playCallEnd = () => {
    // Play regardless of mute state (call end is important feedback)
    if (callEndSoundRef.current) {
      callEndSoundRef.current.currentTime = 0
      callEndSoundRef.current.play().catch(error => {
        console.log('Call end sound play failed:', error)
      })
    }
  }

  const playCallFailure = () => {
    // Play regardless of mute state (call failure is important feedback)
    if (callFailureSoundRef.current) {
      callFailureSoundRef.current.currentTime = 0
      callFailureSoundRef.current.play().catch(error => {
        console.log('Call failure sound play failed:', error)
      })
    }
  }

  const playGameFailure = () => {
    // Only play if not muted
    if (!isMuted && gameFailureSoundRef.current) {
      gameFailureSoundRef.current.currentTime = 0
      gameFailureSoundRef.current.play().catch(error => {
        console.log('Game failure sound play failed:', error)
      })
    }
  }

  const playGameJump = () => {
    // Only play if not muted
    if (!isMuted && gameJumpSoundRef.current) {
      // Reset to start and play
      gameJumpSoundRef.current.currentTime = 0
      gameJumpSoundRef.current.play().catch(error => {
        console.log('Game jump sound play failed:', error)
      })
    }
  }

  return (
    <SoundContext.Provider value={{ 
      isMuted, 
      toggleMute,
      muteMusic,
      playButtonClick,
      playCallEnd,
      playCallFailure,
      playGameFailure,
      playGameJump
    }}>
      {children}
    </SoundContext.Provider>
  )
}

export const useSound = () => {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}

