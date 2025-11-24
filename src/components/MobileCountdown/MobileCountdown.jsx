import { useCountdown } from '../../hooks/useCountdown'
import { useTranslation } from '../../utils/translations'
import styles from './MobileCountdown.module.css'

export const MobileCountdown = ({ selectedLanguage = 'en', isWindowOpen = false }) => {
  const timeUntilChristmas = useCountdown()
  const t = useTranslation(selectedLanguage)

  return (
    <div className={`${styles.mobileCountdown} ${isWindowOpen ? styles.hidden : ''}`}>
      <div className={styles.mobileCountdownTitle}>{t('christmasCountdown')}</div>
      <div className={styles.mobileCountdownItems}>
        <div className={styles.mobileCountdownItem}>
          <span className={styles.mobileCountdownNumber}>{timeUntilChristmas.days.toString().padStart(2, '0')}</span>
          <span className={styles.mobileCountdownLabel}>{t('days')}</span>
        </div>
        <div className={styles.mobileCountdownItem}>
          <span className={styles.mobileCountdownNumber}>{timeUntilChristmas.hours.toString().padStart(2, '0')}</span>
          <span className={styles.mobileCountdownLabel}>{t('hrs')}</span>
        </div>
        <div className={styles.mobileCountdownItem}>
          <span className={styles.mobileCountdownNumber}>{timeUntilChristmas.minutes.toString().padStart(2, '0')}</span>
          <span className={styles.mobileCountdownLabel}>{t('min')}</span>
        </div>
        <div className={styles.mobileCountdownItem}>
          <span className={styles.mobileCountdownNumber}>{timeUntilChristmas.seconds.toString().padStart(2, '0')}</span>
          <span className={styles.mobileCountdownLabel}>{t('sec')}</span>
        </div>
      </div>
    </div>
  )
}

