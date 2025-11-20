import { useState, useEffect, useRef, useCallback } from 'react'
import './FlappySanta.css'

const FlappySanta = () => {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
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
  const [gameAreaSize, setGameAreaSize] = useState({ width: 800, height: 600 })
  const [backgroundX, setBackgroundX] = useState(0)
  const backgroundXRef = useRef(0)
  
  const gravity = 0.2
  const jumpStrength = -6
  const pipeSpeed = 2
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const pipeGap = isMobile ? 250 : 180
  const pipeWidth = isMobile ? 100 : 80
  const santaSize = 40
  const backgroundScrollSpeed = 0.5 // Slow scroll speed

  // Update game area size based on container
  useEffect(() => {
    const updateSize = () => {
      if (gameAreaRef.current) {
        // Get size from the game container itself, accounting for borders
        const rect = gameAreaRef.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        setGameAreaSize({ width, height })
        // Reset Santa position to center when size changes
        const centerY = height / 2
        if (!gameStarted) {
          setSantaY(centerY)
          santaYRef.current = centerY
        }
      }
    }

    // Use a small delay to ensure container is rendered
    const timer = setTimeout(updateSize, 100)
    window.addEventListener('resize', updateSize)
    // Also update on orientation change for mobile
    window.addEventListener('orientationchange', updateSize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [gameStarted])

  const gameAreaWidth = gameAreaSize.width
  const gameAreaHeight = gameAreaSize.height

  const handleJump = useCallback(() => {
    if (!gameStarted || gameOver) {
      if (gameOver) {
        // Reset game
        setGameStarted(true)
        setGameOver(false)
        setScore(0)
        const centerY = gameAreaHeight / 2
        setSantaY(centerY)
        setSantaVelocity(0)
        santaYRef.current = centerY
        santaVelocityRef.current = 0
        setPipes([])
        setPassedPipes(new Set())
        // Reset background scroll
        backgroundXRef.current = 0
        setBackgroundX(0)
      } else {
        setGameStarted(true)
      }
    } else {
      santaVelocityRef.current = jumpStrength
      setSantaVelocity(jumpStrength)
    }
  }, [gameStarted, gameOver, gameAreaHeight])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        handleJump()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleJump])

  useEffect(() => {
    if (!gameStarted || gameOver) return

    // Spawn first pipe immediately, closer to the player
    const spawnPipe = () => {
      const minHeight = 100
      const maxHeight = gameAreaHeight - pipeGap - minHeight
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight
      
      setPipes(prev => [...prev, {
        id: Date.now(),
        x: gameAreaWidth * 0.7, // Start at 70% of screen width instead of 100%
        topHeight,
        bottomY: topHeight + pipeGap
      }])
    }

    // Spawn first pipe immediately
    spawnPipe()

    // Spawn pipes more frequently (every 1.5 seconds instead of 2)
    pipeSpawnTimerRef.current = setInterval(() => {
      const minHeight = 100
      const maxHeight = gameAreaHeight - pipeGap - minHeight
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight
      
      setPipes(prev => [...prev, {
        id: Date.now(),
        x: gameAreaWidth,
        topHeight,
        bottomY: topHeight + pipeGap
      }])
    }, 1500)

    return () => {
      if (pipeSpawnTimerRef.current) {
        clearInterval(pipeSpawnTimerRef.current)
      }
    }
  }, [gameStarted, gameOver, gameAreaWidth, gameAreaHeight])

  useEffect(() => {
    if (!gameStarted || gameOver) {
      gameOverRef.current = false
      return
    }

    gameOverRef.current = false

            const gameLoop = () => {
              // Check if game should still be running
              if (gameOverRef.current || !gameStarted) {
                return
              }

              // Update background scroll position
              backgroundXRef.current -= backgroundScrollSpeed
              // Reset to 0 when it scrolls past the image width (assuming image is tileable)
              // For a seamless loop, we'll reset when it reaches -gameAreaWidth
              if (backgroundXRef.current <= -gameAreaWidth) {
                backgroundXRef.current = 0
              }
              setBackgroundX(backgroundXRef.current)

              // Update Santa velocity and position
              santaVelocityRef.current += gravity
              santaYRef.current += santaVelocityRef.current
              
              // Don't clamp position - let it go to boundaries naturally
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
            if (pipe.x + pipeWidth < gameAreaWidth / 2 && !prevPassed.has(pipe.id)) {
              setScore(prevScore => prevScore + 1)
              return new Set([...prevPassed, pipe.id])
            }
            return prevPassed
          })
        })

        // Check collisions only if game is still active
        if (!gameOverRef.current) {
          const santaCenterX = gameAreaWidth / 2
          const santaCenterY = santaYRef.current
          const santaHalfSize = santaSize / 2
          
          // Check bottom boundary - only trigger if Santa's bottom edge hits the ground
          if (santaCenterY + santaHalfSize >= gameAreaHeight) {
            if (!gameOverRef.current) {
              gameOverRef.current = true
              setGameOver(true)
              setGameStarted(false)
            }
            return updated
          }

          // Check top boundary - only trigger if Santa's top edge hits the ceiling
          if (santaCenterY - santaHalfSize <= 0) {
            if (!gameOverRef.current) {
              gameOverRef.current = true
              setGameOver(true)
              setGameStarted(false)
            }
            return updated
          }

          // Check pipe collisions - only check pipes that are actually in range
          for (const pipe of updated) {
            const pipeLeft = pipe.x
            const pipeRight = pipe.x + pipeWidth
            const santaLeft = santaCenterX - santaHalfSize
            const santaRight = santaCenterX + santaHalfSize

            // Only check collision if Santa is horizontally overlapping with the pipe
            if (santaRight > pipeLeft && santaLeft < pipeRight) {
              const santaTop = santaCenterY - santaHalfSize
              const santaBottom = santaCenterY + santaHalfSize
              
              // Check if Santa is hitting the top obstacle (ornaments)
              if (santaTop < pipe.topHeight) {
                if (!gameOverRef.current) {
                  gameOverRef.current = true
                  setGameOver(true)
                  setGameStarted(false)
                }
                return updated
              }
              
              // Check if Santa is hitting the bottom obstacle (tree)
              if (santaBottom > pipe.bottomY) {
                if (!gameOverRef.current) {
                  gameOverRef.current = true
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

      if (!gameOverRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop)
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      gameOverRef.current = false
    }
  }, [gameStarted, gameOver, gameAreaWidth, gameAreaHeight])

  return (
    <div 
      className="flappy-santa-game"
      ref={gameAreaRef}
      onClick={handleJump}
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
        userSelect: 'none'
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
              paddingBottom: '10px'
            }}
          >
            {/* Hanging string */}
            <svg width={pipeWidth} height={pipe.topHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
              <line 
                x1={pipeWidth / 2} 
                y1="0" 
                x2={pipeWidth / 2} 
                y2={pipe.topHeight} 
                stroke="#8B4513" 
                strokeWidth="2"
              />
            </svg>
            {/* Ornaments */}
            {Array.from({ length: Math.floor(pipe.topHeight / 40) }).map((_, i) => {
              const ornamentY = pipe.topHeight - (i * 40) - 20
              const colors = ['#FF0000', '#FFD700', '#0000FF', '#00FF00', '#FF00FF']
              const color = colors[i % colors.length]
              const size = 12 + (i % 3) * 4
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: `${ornamentY}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    background: color,
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    zIndex: 1
                  }}
                />
              )
            })}
          </div>
          {/* Bottom tree */}
          <div
            className="tree tree-bottom"
            style={{
              position: 'absolute',
              left: `${pipe.x}px`,
              top: `${pipe.bottomY}px`,
              width: `${pipeWidth}px`,
              height: `${gameAreaHeight - pipe.bottomY}px`,
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            {(() => {
              const treeHeight = gameAreaHeight - pipe.bottomY
              const thirdHeight = gameAreaHeight / 3
              
              // Select tree image based on height
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
          fontFamily: "'FK Raster Grotesk Compact', sans-serif",
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
            gap: '20px'
          }}
        >
          <div
            style={{
              fontFamily: "'FK Raster Grotesk Compact', sans-serif",
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#EAE5DE',
              textAlign: 'center'
            }}
          >
            {gameOver ? 'Game Over!' : 'Flappy Santa'}
          </div>
          {gameOver && (
            <div
              style={{
                fontFamily: "'FK Raster Grotesk Compact', sans-serif",
                fontSize: '24px',
                color: '#EAE5DE',
                textAlign: 'center'
              }}
            >
              Score: {score}
            </div>
          )}
          <div
            style={{
              fontFamily: "'FK Raster Grotesk Compact', sans-serif",
              fontSize: '18px',
              color: '#EAE5DE',
              textAlign: 'center'
            }}
          >
            {gameOver ? 'Click or press SPACE to play again' : 'Click or press SPACE to start'}
          </div>
        </div>
      )}
    </div>
  )
}

export default FlappySanta

