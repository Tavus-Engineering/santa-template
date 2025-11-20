import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './ConnectingScreen.module.css'

export const ConnectingScreen = () => {
  return (
    <div className={styles.connectingScreenContainer}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className={styles.connectingScreenVideo}
      >
        <source src={ASSET_PATHS.videos.northPole} type="video/mp4" />
      </video>
      <div className={styles.connectingScreenText}>
        {console.log('[ConnectingScreen] No conversationUrl, showing loading message')}
        Connecting to the North Pole...
      </div>
    </div>
  )
}

