import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './ConnectingScreen.module.css'

export const ConnectingScreen = ({ error }) => {
  const getMessage = () => {
    if (error === 'dailyLimitReached') {
      return "You've used all 3 minutes for today. Come back tomorrow!"
    }
    if (error === 'maxConcurrency') {
      return "Santa's busy with his elves, please try again later"
    }
    if (error === 'apiError') {
      return 'Unable to connect. Please try again later.'
    }
    if (error === 'unknown') {
      return 'Connection error. Please try again.'
    }
    return 'Connecting to the North Pole...'
  }

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
      <div className={`${styles.connectingScreenText} ${error ? styles.errorText : ''}`}>
        {console.log('[ConnectingScreen] No conversationUrl, showing message:', error || 'loading')}
        {getMessage()}
      </div>
    </div>
  )
}

