import { useCountdown } from '../../hooks/useCountdown'
import { ASSET_PATHS } from '../../utils/assetPaths'
import { LanguageSelector } from '../LanguageSelector/LanguageSelector'
import styles from './Footer.module.css'

export const Footer = ({ selectedLanguage, onLanguageChange, isDisabled = false }) => {
  const timeUntilChristmas = useCountdown()

  return (
    <div className={styles.greyFooter}>
      <div className={styles.greyFooterContent}>
        <div className={styles.greyFooterLeft}>
          <img 
            src={ASSET_PATHS.images.footerLogo} 
            alt="Powered by TAVUS" 
            className={styles.greyFooterLogo} 
            onClick={() => {
              window.open('https://tavus.io', '_blank')
            }}
            style={{ cursor: 'pointer' }}
          />
          <LanguageSelector 
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            disabled={isDisabled}
          />
        </div>
        <div className={styles.greyFooterCountdown}>
          <div className={styles.greyFooterCountdownTitle}>CHRISTMAS COUNTDOWN</div>
          <div className={styles.countdownItems}>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.days}</span>
              <span className={styles.countdownLabel}>DAYS</span>
            </div>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.hours}</span>
              <span className={styles.countdownLabel}>HRS</span>
            </div>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.minutes}</span>
              <span className={styles.countdownLabel}>MIN</span>
            </div>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.seconds}</span>
              <span className={styles.countdownLabel}>SEC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

