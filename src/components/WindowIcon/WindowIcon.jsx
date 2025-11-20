import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './WindowIcon.module.css'

export const WindowIcon = ({ 
  icon, 
  title, 
  isOpen, 
  onClick, 
  position = 'default' 
}) => {
  const positionClass = position === 'flappy' ? styles.desktopIcon : ''
  
  return (
    <div 
      className={`${styles.windowIcon} ${positionClass} ${isOpen ? styles.windowOpen : ''}`}
      style={{
        position: 'absolute',
        right: '20px',
        top: position === 'flappy' ? '50%' : 'calc(50% - 130px)',
        transform: 'translateY(-50%)',
        zIndex: 5
      }}
      onClick={onClick}
    >
      <div className={styles.santaIcon}>
        <img 
          src={icon} 
          alt={title} 
          style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
        />
      </div>
      <div className={styles.iconTitle}>{title}</div>
    </div>
  )
}

