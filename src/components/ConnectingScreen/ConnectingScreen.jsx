import { useTranslation } from '../../utils/translations'
import { ASSET_PATHS } from '../../utils/assetPaths'
import styles from './ConnectingScreen.module.css'
import callEndedStyles from '../CallEndedScreen/CallEndedScreen.module.css'

export const ConnectingScreen = ({ error, selectedLanguage = 'en' }) => {
  const t = useTranslation(selectedLanguage)
  
  const getErrorContent = () => {
    if (error === 'dailyLimitReached') {
      return {
        title: "Santa had to go back to his workshop",
        description: "Sorry - Santa had to go back to his workshop. Come back again and he'll be ready to chat. In the meantime, make Santa your PAL and continue talking to Santa in ANY modality, text, call, or face-to-face. He remembers your conversations, reaches out on his own, and even searches the internet to help you find the perfect gift."
      }
    }
    if (error === 'maxConcurrency') {
      return {
        title: "Santa's busy with his elves",
        description: "Santa's busy with his elves right now, please try again later. While you wait, make Santa your PAL and continue talking to Santa in ANY modality, text, call, or face-to-face. He remembers your conversations, reaches out on his own, and even searches the internet to help you find the perfect gift."
      }
    }
    if (error === 'apiError' || error === 'unknown') {
      return {
        title: "Unable to connect to Santa",
        description: "We're having trouble connecting to the North Pole right now. Please try again later. In the meantime, make Santa your PAL and continue talking to Santa in ANY modality, text, call, or face-to-face. He remembers your conversations, reaches out on his own, and even searches the internet to help you find the perfect gift."
      }
    }
    return null
  }

  // If there's an error, show the CallEndedScreen-style layout
  if (error) {
    const errorContent = getErrorContent()
    if (errorContent) {
      return (
        <div className={callEndedStyles.callEndedContainer}>
          <section>
            <h1>{errorContent.title}</h1>
            <p>{errorContent.description}</p>
            <a href="http://platform.tavus.io/auth/sign-up?source=santa_demo">
              Register for free
            </a>
          </section>
          
          <figure>
            <img src={ASSET_PATHS.images.postcardStamp} alt="" aria-hidden="true" className={callEndedStyles.stampImage} />
            <img src={ASSET_PATHS.images.lastSanta} alt="The artist formerly known as Santa" className={callEndedStyles.santaImage} />
          </figure>
        </div>
      )
  }
  }

  // Otherwise show the connecting screen with video
  return (
    <div className={styles.connectingScreenContainer}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className={styles.connectingScreenVideo}
      >
        <source src={ASSET_PATHS.videos.northPole} type="video/mp4" />
      </video>
      <div className={styles.connectingScreenText}>
        {console.log('[ConnectingScreen] No conversationUrl, showing message:', error || 'loading')}
        {getMessage()}
      </div>
    </div>
  )
}

