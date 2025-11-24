import { useState } from 'react'
import styles from './MusicToggle.module.css'

export const MusicToggle = () => {
  const [isMuted, setIsMuted] = useState(false)

  return (
    <button
      className={styles.musicToggle}
      onClick={() => setIsMuted(!isMuted)}
      type="button"
    >
      <span className={styles.musicIcon}>{isMuted ? '🔇' : '♪'}</span>
    </button>
  )
}

