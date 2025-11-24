import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './MobilePowered.module.css'

export const MobilePowered = ({ isWindowOpen = false }) => {
  return (
    <div className={`${styles.mobilePowered} ${isWindowOpen ? styles.hidden : ''}`}>
      <a 
        href="https://tavus.io?source=santa_demo"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mobilePoweredImage}
      >
        <img 
          src={ASSET_PATHS.images.powered} 
          alt="Powered by Tavus" 
        />
      </a>
    </div>
  )
}