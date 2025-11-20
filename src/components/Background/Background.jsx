import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './Background.module.css'

export const Background = () => {
  return (
    <>
      <video 
        className={styles.backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={ASSET_PATHS.videos.background} type="video/mp4" />
      </video>
      <div className={styles.backgroundGradientOverlay}></div>
      <div className={styles.backgroundPattern}></div>
    </>
  )
}

