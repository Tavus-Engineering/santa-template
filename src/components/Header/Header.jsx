import { LanguageSelector } from '../LanguageSelector/LanguageSelector'
import { MusicToggle } from '../MusicToggle/MusicToggle'
import styles from './Header.module.css'

export const Header = ({ selectedLanguage, onLanguageChange, isDisabled = false }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <LanguageSelector 
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
          disabled={isDisabled}
        />
      </div>
      <div className={styles.headerRight}>
        <MusicToggle />
      </div>
    </header>
  )
}

