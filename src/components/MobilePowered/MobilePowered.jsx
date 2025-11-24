import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './MobilePowered.module.css'

export const MobilePowered = ({ isWindowOpen = false }) => {
  return (
    <div className={`${styles.mobilePowered} ${isWindowOpen ? styles.hidden : ''}`}>
      <img 
        src={ASSET_PATHS.images.powered} 
        alt="Powered by TAVUS" 
        className={styles.mobilePoweredImage}
        onClick={() => {
          window.open('https://tavus.io', '_blank')
        }}
        style={{ cursor: 'pointer' }}
      />
    </div>
  )
}

