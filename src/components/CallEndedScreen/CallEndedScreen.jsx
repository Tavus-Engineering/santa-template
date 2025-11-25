import { useTranslation } from '../../utils/translations'
import { ASSET_PATHS } from '../../utils/assetPaths'
import { useSound } from '../../contexts/SoundContext'
import styles from './CallEndedScreen.module.css'

export const CallEndedScreen = ({ onContinue, selectedLanguage = 'en' }) => {
  const t = useTranslation(selectedLanguage)

  return (
    <div className={styles.callEndedContainer}>
      <section>
        <h1>Santa LOVED talking with you</h1>
        <p><strong>Keep the conversation going.</strong> Make Santa your PAL and continue talking to Santa in ANY modality, text, call, or face-to-face. He remembers your conversations, reaches out on his own, and even searches the internet to help you find the perfect gift.</p>
        <a href="http://platform.tavus.io/auth/sign-up?source=santa_demo" target="_blank" rel="noopener noreferrer">
          Sign up for free
        </a>
        <span className={styles.shareRowDivider}>Or share to…</span>
        <div>
          <a 
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Don\'t sit on his lap, have a chat. Talk with AI Santa today:\n\nhttps://santa.tavus.io @Tavus')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={ASSET_PATHS.icons.xIcon} alt="Share to X" />
          </a>
          <a 
            href={`https://www.linkedin.com/feed/?shareActive&mini=true&text=${encodeURIComponent('I just met (AI) Santa for real at https://santa.tavus.io/')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={ASSET_PATHS.icons.linkedinIcon} alt="Share to LinkedIn" />
          </a>
          <a 
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://santa.tavus.io')}&quote=${encodeURIComponent('SANTA IS REAL. Meet AI Santa at santa.tavus.io')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={ASSET_PATHS.icons.facebookIcon} alt="Share to Facebook" />
          </a>
        </div>
      </section>
      
      <figure>
        <img src={ASSET_PATHS.images.postcardStamp} alt="" aria-hidden="true" className={styles.stampImage} />
        <img src={ASSET_PATHS.images.lastSanta} alt="The artist formerly known as Santa" className={styles.santaImage} />
      </figure>
    </div>
  )
}