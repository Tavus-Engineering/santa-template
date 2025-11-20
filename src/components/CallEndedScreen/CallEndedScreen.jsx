import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './CallEndedScreen.module.css'

export const CallEndedScreen = ({ onContinue }) => {
  return (
    <div className={styles.callEndedContainer}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className={styles.callEndedBackgroundVideo}
      >
        <source src={ASSET_PATHS.videos.northPole} type="video/mp4" />
      </video>
      <div className={styles.callEndedContent}>
        <h1 className={styles.callEndedTitle}>
          Santa is now a PAL!
        </h1>
        <p className={styles.callEndedSubtext}>
          He can text, call, and talk face to face anytime. He can help make christmas lists, get you on the nice list, and spread christmas cheer.
        </p>
        <button
          className={styles.callEndedCta}
          onClick={onContinue}
        >
          Continue the Conversation
        </button>
      </div>
    </div>
  )
}

