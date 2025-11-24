import { useCountdown } from '../../hooks/useCountdown'
import { useTranslation } from '../../utils/translations'
import { ASSET_PATHS } from '../../utils/assetPaths'
import { LanguageSelector } from '../LanguageSelector/LanguageSelector'
import styles from './Footer.module.css'

export const Footer = ({ selectedLanguage, onLanguageChange, isDisabled = false }) => {
  const timeUntilChristmas = useCountdown()
  const t = useTranslation(selectedLanguage)

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
          <div className={styles.footerLanguageSelector}>
            <LanguageSelector 
              selectedLanguage={selectedLanguage}
              onLanguageChange={onLanguageChange}
              disabled={isDisabled}
            />
          </div>
        </div>
        <div className={styles.greyFooterCountdown}>
          <div className={styles.greyFooterCountdownTitle}>{t('christmasCountdown')}</div>
          <div className={styles.countdownItems}>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.days.toString().padStart(2, '0')}</span>
              <span className={styles.countdownLabel}>{t('days')}</span>
            </div>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.hours.toString().padStart(2, '0')}</span>
              <span className={styles.countdownLabel}>{t('hrs')}</span>
            </div>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.minutes.toString().padStart(2, '0')}</span>
              <span className={styles.countdownLabel}>{t('min')}</span>
            </div>
            <div className={styles.countdownItem}>
              <span className={styles.countdownNumber}>{timeUntilChristmas.seconds.toString().padStart(2, '0')}</span>
              <span className={styles.countdownLabel}>{t('sec')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

