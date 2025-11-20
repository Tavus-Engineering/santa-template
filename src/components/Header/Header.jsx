import styles from './Header.module.css'

export const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerRight}>
        <span className={styles.musicIcon}>♪</span>
      </div>
    </header>
  )
}

