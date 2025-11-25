import { useSound } from '../../contexts/SoundContext'
import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './MusicToggle.module.css'

export const MusicToggle = () => {
  const { isMuted, toggleMute, playButtonClick } = useSound()

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    playButtonClick() // Play click sound before toggling
    toggleMute()
  }

  return (
    <button
      className={styles.musicToggle}
      onClick={handleToggle}
      onMouseDown={(e) => e.stopPropagation()}
      type="button"
    >
      <img 
        src={isMuted ? ASSET_PATHS.icons.volumeOff : ASSET_PATHS.icons.volumeOn}
        alt={isMuted ? 'Volume off' : 'Volume on'}
        className={styles.musicIcon}
      />
    </button>
  )
}