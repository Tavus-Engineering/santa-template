import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '../utils/translations'
import { useSound } from '../contexts/SoundContext'
import './FlappySanta.css'

const FlappySantaMobile = ({ selectedLanguage = 'en' }) => {
  const t = useTranslation(selectedLanguage)
  const { playGameJump, playGameFailure } = useSound()
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    // Load high score from localStorage on mount
    const saved = localStorage.getItem('flappySantaHighScore')
    return saved ? parseInt(saved, 10) : 0
  })
  const [isNewHighScore, setIsNewHighScore] = useState(false)
  const [santaY, setSantaY] = useState(0)
  const [santaVelocity, setSantaVelocity] = useState(0)
  const [pipes, setPipes] = useState([])
  const [passedPipes, setPassedPipes] = useState(new Set())
  const gameAreaRef = useRef(null)
  const animationFrameRef = useRef(null)
  const pipeSpawnTimerRef = useRef(null)
  const santaVelocityRef = useRef(0)
  const santaYRef = useRef(0)
  const gameOverRef = useRef(false)
  const gameStartedRef = useRef(false)
  const [gameAreaSize, setGameAreaSize] = useState({ width: 800, height: 600 })
  const [backgroundX, setBackgroundX] = useState(0)
  const backgroundXRef = useRef(0)
  
  // Mobile-specific physics and game parameters
  const gravity = 0.15 // Increased gravity for faster fall on mobile
  const jumpStrength = -2.8125
  const pipeSpeed = 4 // Faster on mobile
  const baseGap = 350 // Larger gap on mobile
  const pipeWidth = 100
  const santaSize = 40
  const backgroundScrollSpeed = 1.0 // Faster scroll on mobile to match pipe speed
  const backgroundResetDistance = 1800
  
  // Collision padding for more forgiving gameplay
  const collisionPadding = 5
  const ornamentCollisionOffset = 15

  // Update game area size based on container
  useEffect(() => {
    const updateSize = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        setGameAreaSize({ width, height })
        
        // Reset Santa position to center when size changes
        const centerY = height / 2
        if (!gameStartedRef.current) {
          setSantaY(centerY)
          santaYRef.current = centerY
        }
      }
    }

    const timer = setTimeout(updateSize, 100)
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [])

  const handleJump = useCallback(() => {
    if (!gameStarted || gameOver) {
      if (gameOver) {
        // Clear any existing timers and animation frames
        if (pipeSpawnTimerRef.current) {
          clearInterval(pipeSpawnTimerRef.current)
          pipeSpawnTimerRef.current = null
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        
        // Reset all game state
        setGameOver(false)
        setScore(0)
        setIsNewHighScore(false)
        setPipes([])
        setPassedPipes(new Set())
        
        // Reset Santa position and velocity
        const centerY = gameAreaSize.height / 2
        santaYRef.current = centerY
        santaVelocityRef.current = 0
        setSantaY(centerY)
        setSantaVelocity(0)
        
        // Reset background scroll
        backgroundXRef.current = 0
        setBackgroundX(0)
        
        // Force effect to re-run by toggling gameStarted
        if (gameStarted) {
          setGameStarted(false)
          requestAnimationFrame(() => {
            setGameStarted(true)
          })
        } else {
          setGameStarted(true)
        }
      } else {
        setGameStarted(true)
      }
    } else {
      // Play jump sound when actually jumping during gameplay
      playGameJump()
      santaVelocityRef.current = jumpStrength
      setSantaVelocity(jumpStrength)
    }
  }, [gameAreaSize.height, gameStarted, gameOver, playGameJump])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        handleJump()
      }
    }
    
    const handleTouchStart = (e) => {
      e.preventDefault()
      handleJump()
    }

    window.addEventListener('keydown', handleKeyPress)
    const gameArea = gameAreaRef.current
    if (gameArea) {
      gameArea.addEventListener('touchstart', handleTouchStart, { passive: false })
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      if (gameArea) {
        gameArea.removeEventListener('touchstart', handleTouchStart)
      }
    }
  }, [handleJump])

  useEffect(() => {
    // Sync refs with state
    gameStartedRef.current = gameStarted
    gameOverRef.current = gameOver
    
    if (!gameStarted || gameOver) {
      // Clear any existing timers
      if (pipeSpawnTimerRef.current) {
        clearInterval(pipeSpawnTimerRef.current)
        pipeSpawnTimerRef.current = null
      }
      return
    }

    // Spawn first pipe immediately, closer to the player
    const spawnPipe = () => {
      const minHeight = 60
      const maxHeight = gameAreaSize.height - baseGap - 60
      const gapVariation = baseGap * 0.4
      const currentGap = baseGap - gapVariation / 2 + Math.random() * gapVariation
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight
      
      setPipes(prev => [...prev, {
        id: Date.now() + Math.random(),
        x: gameAreaSize.width * 0.7,
        topHeight,
        bottomY: topHeight + currentGap,
        candyCaneHeight: 35 + Math.random() * 25
      }])
    }

    // Spawn first pipe immediately
    spawnPipe()

    // Spawn pipes - mobile spacing (much closer)
    const spawnInterval = 1100 // Closer spacing for mobile
    pipeSpawnTimerRef.current = setInterval(() => {
      if (!gameStartedRef.current || gameOverRef.current) {
        return
      }
      const minHeight = 60
      const maxHeight = gameAreaSize.height - baseGap - 60
      const gapVariation = baseGap * 0.4
      const currentGap = baseGap - gapVariation / 2 + Math.random() * gapVariation
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight
      
      setPipes(prev => [...prev, {
        id: Date.now() + Math.random(),
        x: gameAreaSize.width,
        topHeight,
        bottomY: topHeight + currentGap,
        candyCaneHeight: 35 + Math.random() * 25
      }])
    }, spawnInterval)

    return () => {
      if (pipeSpawnTimerRef.current) {
        clearInterval(pipeSpawnTimerRef.current)
        pipeSpawnTimerRef.current = null
      }
    }
  }, [gameStarted, gameOver, gameAreaSize.width, gameAreaSize.height, baseGap])

  // Check for high score when game ends
  useEffect(() => {
    if (gameOver && score > highScore) {
      const newHighScore = score
      setHighScore(newHighScore)
      setIsNewHighScore(true)
      localStorage.setItem('flappySantaHighScore', newHighScore.toString())
    } else if (gameOver) {
      setIsNewHighScore(false)
    }
  }, [gameOver, score, highScore])

  // Play game failure sound when game ends
  useEffect(() => {
    if (gameOver) {
      playGameFailure()
    }
  }, [gameOver, playGameFailure])

  useEffect(() => {
    // Sync refs with state
    gameStartedRef.current = gameStarted
    gameOverRef.current = gameOver
    
    if (!gameStarted || gameOver) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const gameLoop = () => {
      // Check if game should still be running
      if (gameOverRef.current || !gameStartedRef.current) {
        return
      }

      // Update background scroll position
      backgroundXRef.current -= backgroundScrollSpeed
      if (backgroundXRef.current <= -backgroundResetDistance) {
        backgroundXRef.current = 0
      }
      setBackgroundX(backgroundXRef.current)

      // Update Santa velocity and position
      santaVelocityRef.current += gravity
      santaYRef.current += santaVelocityRef.current
      
      // Clamp position to prevent going out of bounds before collision check
      const santaHalfSize = santaSize / 2
      santaYRef.current = Math.max(santaHalfSize, Math.min(santaYRef.current, gameAreaSize.height - santaHalfSize))
      
      setSantaY(santaYRef.current)
      setSantaVelocity(santaVelocityRef.current)

      // Update pipes
      setPipes(prev => {
        if (gameOverRef.current) return prev

        const updated = prev
          .map(pipe => ({ ...pipe, x: pipe.x - pipeSpeed }))
          .filter(pipe => pipe.x > -pipeWidth)

        // Check for score
        updated.forEach(pipe => {
          setPassedPipes(prevPassed => {
            if (pipe.x + pipeWidth < gameAreaSize.width / 2 && !prevPassed.has(pipe.id)) {
              setScore(prevScore => prevScore + 1)
              return new Set([...prevPassed, pipe.id])
            }
            return prevPassed
          })
        })

        // Check collisions only if game is still active
        if (!gameOverRef.current) {
          const santaCenterX = gameAreaSize.width / 2
          const santaCenterY = santaYRef.current
          
          // Check bottom boundary
          if (santaCenterY + santaHalfSize >= gameAreaSize.height - collisionPadding) {
            if (!gameOverRef.current) {
              gameOverRef.current = true
              gameStartedRef.current = false
              setGameOver(true)
              setGameStarted(false)
            }
            return updated
          }

          // Check top boundary
          if (santaCenterY - santaHalfSize <= collisionPadding) {
            if (!gameOverRef.current) {
              gameOverRef.current = true
              gameStartedRef.current = false
              setGameOver(true)
              setGameStarted(false)
            }
            return updated
          }

          // Check pipe collisions
          for (const pipe of updated) {
            const pipeLeft = pipe.x
            const pipeRight = pipe.x + pipeWidth
            const santaLeft = santaCenterX - santaHalfSize
            const santaRight = santaCenterX + santaHalfSize

            const horizontalPadding = pipeWidth * 0.2
            if (santaRight > pipeLeft + horizontalPadding && santaLeft < pipeRight - horizontalPadding) {
              const santaTop = santaCenterY - santaHalfSize
              const santaBottom = santaCenterY + santaHalfSize
              
              // Check if Santa is hitting the top obstacle (single candy cane)
              if (pipe.topHeight > 30) {
                const pipeCenterX = pipe.x + pipeWidth / 2
                const candyCaneHeight = pipe.candyCaneHeight || 50
                const candyCaneWidth = 8
                const candyCaneY = pipe.topHeight - candyCaneHeight
                const candyCaneLeft = pipeCenterX - candyCaneWidth / 2
                const candyCaneRight = pipeCenterX + candyCaneWidth / 2
                const candyCaneTop = candyCaneY + 5
                const candyCaneBottom = candyCaneY + candyCaneHeight - 5
                
                if (santaRight > candyCaneLeft && santaLeft < candyCaneRight &&
                    santaBottom > candyCaneTop && santaTop < candyCaneBottom) {
                  if (!gameOverRef.current) {
                    gameOverRef.current = true
                    gameStartedRef.current = false
                    setGameOver(true)
                    setGameStarted(false)
                  }
                  return updated
                }
                
                // Check collision with the rope/string
                const ropeWidth = 4
                const ropeLeft = pipeCenterX - ropeWidth / 2
                const ropeRight = pipeCenterX + ropeWidth / 2
                const ropeTop = 0
                const ropeBottom = pipe.topHeight - 35
                
                if (santaRight > ropeLeft && santaLeft < ropeRight &&
                    santaBottom > ropeTop && santaTop < ropeBottom) {
                  if (!gameOverRef.current) {
                    gameOverRef.current = true
                    gameStartedRef.current = false
                    setGameOver(true)
                    setGameStarted(false)
                  }
                  return updated
                }
              }
              
              // Check if Santa is hitting the bottom obstacle (tree)
              const treeVisualPadding = pipeWidth * 0.4
              const treeLeft = pipe.x + treeVisualPadding
              const treeRight = pipe.x + pipeWidth - treeVisualPadding
              const treeTop = pipe.bottomY + 10
              
              if (santaRight > treeLeft && santaLeft < treeRight && 
                  santaBottom > treeTop && santaTop < gameAreaSize.height) {
                if (!gameOverRef.current) {
                  gameOverRef.current = true
                  gameStartedRef.current = false
                  setGameOver(true)
                  setGameStarted(false)
                }
                return updated
              }
            }
          }
        }

        return updated
      })

      if (!gameOverRef.current && gameStartedRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop)
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [gameStarted, gameOver, gameAreaSize.width, gameAreaSize.height, collisionPadding, pipeSpeed, pipeWidth, gravity, jumpStrength, santaSize, backgroundScrollSpeed])

  return (
    <div 
      className="flappy-santa-game"
      ref={gameAreaRef}
      onClick={handleJump}
      onTouchStart={(e) => {
        e.preventDefault()
        handleJump()
      }}
      style={{
        width: 'calc(100% - 12px)',
        height: 'calc(100% - 12px)',
        position: 'absolute',
        top: '6px',
        left: '6px',
        overflow: 'hidden',
        backgroundImage: 'url(/game-background-long.png)',
        backgroundSize: 'cover',
        backgroundPosition: `${backgroundX}px center`,
        backgroundRepeat: 'repeat-x',
        cursor: 'pointer',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {/* Trees and Ornaments */}
      {pipes.map(pipe => (
        <div key={pipe.id}>
          {/* Top ornaments hanging down */}
          <div
            className="ornaments ornaments-top"
            style={{
              position: 'absolute',
              left: `${pipe.x}px`,
              top: '0',
              width: `${pipeWidth}px`,
              height: `${pipe.topHeight}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '15px',
              paddingBottom: '10px',
              pointerEvents: 'none'
            }}
          >
            {/* Hanging string - behind candy cane */}
            <svg 
              width={pipeWidth} 
              height={pipe.topHeight} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0,
                zIndex: 0
              }}
            >
              <line 
                x1={pipeWidth / 2} 
                y1="0" 
                x2={pipeWidth / 2} 
                y2={pipe.topHeight - 35} 
                stroke="#8B4513" 
                strokeWidth="2"
              />
            </svg>
            {/* Single Candy Cane with proper hook */}
            {pipe.topHeight > 30 && (() => {
              const randomSeed = pipe.id % 1000
              const angle = -20 + (randomSeed % 40)
              const candyCaneHeight = pipe.candyCaneHeight || 50
              return (
                <img
                  src="/candy.png"
                  alt="Candy Cane"
                  style={{
                    position: 'absolute',
                    top: `${pipe.topHeight - candyCaneHeight}px`,
                    left: '50%',
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                    width: 'auto',
                    height: `${candyCaneHeight}px`,
                    zIndex: 1,
                    imageRendering: 'pixelated',
                    transformOrigin: 'center top'
                  }}
                />
              )
            })()}
          </div>
          {/* Bottom tree */}
          <div
            className="tree tree-bottom"
            style={{
              position: 'absolute',
              left: `${pipe.x}px`,
              top: `${pipe.bottomY}px`,
              width: `${pipeWidth}px`,
              height: `${gameAreaSize.height - pipe.bottomY}px`,
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            {(() => {
              const treeHeight = gameAreaSize.height - pipe.bottomY
              const thirdHeight = gameAreaSize.height / 3
              
              let treeImage
              if (treeHeight < thirdHeight) {
                treeImage = '/short-tree.png'
              } else if (treeHeight < thirdHeight * 2) {
                treeImage = '/mid-tree.png'
              } else {
                treeImage = '/tall-tree.png'
              }
              
              return (
                <img
                  src={treeImage}
                  alt="Tree"
                  style={{
                    width: `${pipeWidth}px`,
                    height: `${treeHeight}px`,
                    objectFit: 'cover',
                    objectPosition: 'bottom',
                    imageRendering: 'pixelated',
                    display: 'block'
                  }}
                />
              )
            })()}
          </div>
        </div>
      ))}

      {/* Elf */}
      <div
        className="santa-character"
        style={{
          position: 'absolute',
          left: `calc(50% - ${santaSize / 2}px)`,
          top: `${santaY - santaSize / 2}px`,
          width: `${santaSize}px`,
          height: `${santaSize}px`,
          transform: `rotate(${santaVelocity > 0 ? Math.min(santaVelocity * 3, 45) : Math.max(santaVelocity * 3, -45)}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <img 
          src={santaVelocity > 0 ? '/elfdown.png' : '/elfup.png'} 
          alt="Elf" 
          style={{ 
            width: `${santaSize}px`, 
            height: `${santaSize}px`, 
            objectFit: 'contain',
            imageRendering: 'pixelated'
          }} 
        />
      </div>

      {/* Score */}
      <div
        className="game-score"
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'Berkeley Mono', sans-serif",
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#EAE5DE',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          zIndex: 10
        }}
      >
        {score}
      </div>

      {/* Start/Game Over Screen */}
      {(!gameStarted || gameOver) && (
        <div
          className="game-overlay"
          onClick={handleJump}
          onTouchStart={(e) => {
            e.preventDefault()
            handleJump()
          }}
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            gap: '20px',
            cursor: 'pointer',
            paddingBottom: '40px',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <img
            src={gameOver ? "/elf-dead.png" : "/elf.png"}
            alt="Elf"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              imageRendering: 'pixelated',
              marginBottom: '15px'
            }}
          />
          <div
            style={{
              fontFamily: "'Berkeley Mono', sans-serif",
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#EAE5DE',
              textAlign: 'center',
              marginBottom: gameOver ? '15px' : '15px'
            }}
          >
            {gameOver ? t('gameOver') : t('flappyElf')}
          </div>
          {gameOver && (
            <div
              style={{
                fontFamily: "'Berkeley Mono', sans-serif",
                fontSize: '18px',
                color: '#EAE5DE',
                textAlign: 'center',
                marginBottom: '15px'
              }}
            >
              {t('score')} {score} {isNewHighScore ? (
                <span style={{ color: '#FFD700', fontWeight: 'bold' }}> | New High Score!</span>
              ) : (
                <span> | High Score: {highScore}</span>
              )}
            </div>
          )}
          <div
            style={{
              fontFamily: "'Berkeley Mono', sans-serif",
              fontSize: '16px',
              color: '#EAE5DE',
              textAlign: 'center'
            }}
          >
            {gameOver ? 'Tap to Play Again' : 'Tap to Start'}
          </div>
        </div>
      )}
    </div>
  )
}

export default FlappySantaMobile

