import styles from './LoadingScreen.module.css'

export const LoadingScreen = () => {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    </div>
  )
}

