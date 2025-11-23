import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './LanguageSelector.module.css'

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ja', name: '日本語' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ko', name: '한국어' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'ru', name: 'Русский' },
  { code: 'sv', name: 'Svenska' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'tl', name: 'Filipino' },
  { code: 'bg', name: 'Български' },
  { code: 'ro', name: 'Română' },
  { code: 'ar', name: 'العربية' },
  { code: 'cs', name: 'Čeština' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'fi', name: 'Suomi' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'da', name: 'Dansk' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'uk', name: 'Українська' },
  { code: 'hu', name: 'Magyar' },
  { code: 'no', name: 'Norsk' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'th', name: 'ไทย' },
  { code: 'he', name: 'עברית' },
  { code: 'ka', name: 'ქართული' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'mr', name: 'मराठी' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
]

export const LanguageSelector = ({ selectedLanguage, onLanguageChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, bottom: 0 })
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  // Close dropdown when disabled
  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false)
    }
  }, [disabled, isOpen])

  // Calculate dropdown position when it opens or window resizes
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setDropdownPosition({
          left: rect.left,
          bottom: window.innerHeight - rect.top + 4
        })
      }
    }

    if (isOpen) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Filter languages based on search query
  const filteredLanguages = LANGUAGE_OPTIONS.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedLang = LANGUAGE_OPTIONS.find(lang => lang.code === selectedLanguage) || LANGUAGE_OPTIONS[0]

  return (
    <div className={styles.languageSelector} ref={dropdownRef}>
      <button
        ref={buttonRef}
        className={styles.languageButton}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen)
            setSearchQuery('')
          }
        }}
        type="button"
        disabled={disabled}
      >
        <span className={styles.languageButtonText}>
          {selectedLang.name}
        </span>
        <span className={styles.languageButtonArrow}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={styles.languageDropdown}
          style={{
            left: `${dropdownPosition.left}px`,
            bottom: `${dropdownPosition.bottom}px`
          }}
        >
          <div className={styles.searchContainer}>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className={styles.languageList}>
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  className={`${styles.languageOption} ${selectedLanguage === lang.code ? styles.languageOptionSelected : ''}`}
                  onClick={() => {
                    onLanguageChange(lang.code)
                    setIsOpen(false)
                    setSearchQuery('')
                  }}
                  type="button"
                >
                  {lang.name}
                </button>
              ))
            ) : (
              <div className={styles.noResults}>No languages found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

