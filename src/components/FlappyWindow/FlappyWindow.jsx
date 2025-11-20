import { useState, useEffect, useRef } from 'react'
import FlappySanta from '../FlappySanta'
import { isMobile } from '../../utils/windowUtils'
import styles from './FlappyWindow.module.css'

export const FlappyWindow = ({
  isMinimized,
  setIsMinimized,
  windowRef
}) => {
  const [flappyPosition, setFlappyPosition] = useState({ x: 0, y: 0 })
  const [isFlappyDragging, setIsFlappyDragging] = useState(false)
  const [flappyDragStart, setFlappyDragStart] = useState({ x: 0, y: 0 })

  // Initialize flappy santa window position
  useEffect(() => {
    const mainContent = document.querySelector('.main-content')
    if (mainContent && !isMinimized) {
      const rect = mainContent.getBoundingClientRect()
      const mobile = isMobile()
      const windowWidth = Math.min(700, rect.width - 80)
      const aspectRatio = mobile ? 1 : (10 / 16)
      const windowHeight = windowWidth * aspectRatio
      setFlappyPosition({
        x: (rect.width - windowWidth) / 2,
        y: (rect.height - windowHeight) / 2
      })
    }
  }, [])

  useEffect(() => {
    if (isMinimized) {
      const mainContent = document.querySelector('.main-content')
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect()
        setFlappyPosition({
          x: rect.right - 120 - 20,
          y: rect.top + 20
        })
      }
    } else {
      const mobile = isMobile()
      if (mobile) {
        setFlappyPosition({
          x: 0,
          y: 0
        })
      } else {
        const mainContent = document.querySelector('.main-content')
        if (mainContent && windowRef.current) {
          const rect = mainContent.getBoundingClientRect()
          const windowRect = windowRef.current.getBoundingClientRect()
          const windowWidth = windowRect.width
          const windowHeight = windowRect.height
          setFlappyPosition({
            x: rect.left + (rect.width - windowWidth) / 2,
            y: rect.top + (rect.height - windowHeight) / 2
          })
        }
      }
    }
  }, [isMinimized, windowRef])

  const handleFlappyMouseDown = (e) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setFlappyDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsFlappyDragging(true)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isFlappyDragging && windowRef.current) {
        setFlappyPosition({
          x: e.clientX - flappyDragStart.x,
          y: e.clientY - flappyDragStart.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsFlappyDragging(false)
    }

    if (isFlappyDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isFlappyDragging, flappyDragStart])

  if (isMinimized) {
    return null
  }

  return (
    <div 
      ref={windowRef}
      className={styles.flappyWindow}
      style={{
        left: `${flappyPosition.x}px`,
        top: `${flappyPosition.y}px`,
        transform: 'none',
        zIndex: 999
      }}
    >
      <div 
        className={styles.windowTitleBar}
        onMouseDown={handleFlappyMouseDown}
        style={{ cursor: isFlappyDragging ? 'grabbing' : 'grab' }}
      >
        <div className={styles.titleBarLeft}>
          <span className={styles.titleIcon}></span>
          <span className={styles.titleText}>FLAPPY ELF</span>
        </div>
        <div className={styles.titleBarRight}>
          <div className={styles.menuLines}></div>
          <span 
            className={styles.windowControl}
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(true)
            }}
          >
            <span className={styles.windowControlInner}></span>
          </span>
        </div>
      </div>
      
      <div className={styles.videoFeed}>
        <FlappySanta />
      </div>
    </div>
  )
}

