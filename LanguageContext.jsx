// ============================================
// SHEBAODDS - LANGUAGE SWITCHER COMPONENT
// English / Amharic (አማርኛ) Support
// ============================================

import React, { useContext, createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Translation context
export const LanguageContext = createContext();

// Inline translations fallback for ultra-fast load and bulletproof reliability
const defaultAmharicTranslations = {
  "sportsbook": "የስፖርት ውርርድ",
  "my_slips": "የእኔ ቲኬቶች",
  "secure_bank": "አስተማማኝ ባንክ",
  "admin_panel": "የአስተዳዳሪ ፓነል",
  "support": "እርዳታ",
  "balance": "ቀሪ ሂሳብ",
  "deposit": "ገንዘብ አስገባ",
  "active_bets": "ንቁ ቲኬቶች",
  "ssl_encrypted": "የተጠበቀ ግንኙነት (SSL)",
  "today_matches": "የዛሬ የቀጥታ ጨዋታዎች",
  "all_sports": "ሁሉም ስፖርቶች",
  "football": "እግር ኳስ",
  "basketball": "ቅርጫት ኳስ",
  "tennis": "ቴኒስ",
  "place_single_bet": "ውርርድ ፈጽም",
  "enter_stake": "የመወራረጃ መጠን (ETB)",
  "potential_return": "ሊያሸንፉ የሚችሉት",
  "safety_score": "የአይአይ (AI) የደህንነት ውጤት",
  "prediction_title": "የአይአይ (AI) ግምታዊ ትንተና",
  "risk_warning": "ኃላፊነት የሚሰማው ጨዋታ ማስጠንቀቂያ",
  "support_chat": "የቀጥታ የደንበኞች እርዳታ ማዕከል",
  "chat_placeholder": "ጥያቄዎን እዚህ ይጻፉ (በአማርኛ፣ በትግርኛ)...",
  "admin_control": "የShebaOdds የአስተዳዳሪ መቆጣጠሪያ",
  "user_database": "የሃርድዌር ኦዲት የመረጃ ቋት",
  "quick_stats": "የአጠቃላይ ሂሳብ ትንተና",
  "total_odds_line": "ጠቅላላ ኦድስ መስመር",
  "gross_estimation": "ሊገኝ የሚችል ጠቅላላ ክፍያ",
  "combined_odds": "የተደመረ ጠቅላላ ኦድስ",
  "total_risk_stake": "ጠቅላላ የተወራረደበት ገንዘብ",
  "gross_returns": "ሊመለስ የሚችል ከፍተኛ ክፍያ",
  "multi_bet_slip": "የተከማቸ ብዙ ጨዋታዎች ቲኬት (Multi-Bet)",
  "clear_all": "ሁሉንም አጽዳ",
  "ethiopian_calendar": "የኢትዮጵያ ዘመን አቆጣጠር",
  "select_language": "ቋንቋ ይምረጡ",
  "app_name": "ሼባኦድስ",
  "app_tagline": "ስማርት ቤትስ። ሪል ዊንስ።",
  "app_welcome": "እንኳን ደህና መጣህ",
  "app_loading": "በመጫን ላይ...",
  "nav_home": "መነሻ",
  "nav_football": "እግር ኳስ",
  "nav_live": "ቀጥታ ውርርድ",
  "nav_casino": "ካዚኖ",
  "nav_promotions": "ማስተዋወቂያዎች",
  "nav_profile": "መገለጫ",
  "nav_wallet": "ቦርሳ",
  "nav_history": "ታሪክ",
  "nav_tax": "የግብር ማዕከል",
  "nav_support": "ድጋፍ",
  "nav_settings": "ቅንብሮች",
  "auth_login": "ግባ",
  "auth_register": "ተመዝገብ",
  "auth_email": "ኢሜይል",
  "auth_password": "የይለፍ ቃል",
  "auth_confirm_password": "የይለፍ ቃል አረጋግጥ",
  "auth_username": "የተጠቃሚ ስም",
  "auth_phone": "ስልክ ቁጥር",
  "auth_fullname": "ሙሉ ስም",
  "auth_forgot_password": "የይለፍ ቃል ረሳሁ",
  "auth_reset_password": "የይለፍ ቃል ዳግም አስጀምር",
  "auth_remember_me": "አስታውሰኝ",
  "auth_login_biometric": "በባዮሜትሪክ ግባ",
  "auth_use_face_id": "ፌስ አይዲ ተጠቀም",
  "auth_use_fingerprint": "የጣት አሻራ ተጠቀም",
  "auth_pwd_requirements": "የይለፍ ቃል ቢያንስ 8 ቁምፊዎች፣ አንድ ትልቅ ፊደል፣ አንድ ትንሽ ፊደል፣ አንድ ቁጥር እና አንድ ልዩ ቁምፊ መያዝ አለበት",
  "wallet_balance": "ቀሪ ሂሳብ",
  "wallet_bonus_balance": "ቦነስ ቀሪ ሂሳብ",
  "wallet_deposit": "ተቀማጭ",
  "wallet_withdraw": "ማውጫ",
  "wallet_transactions": "ግብይቶች",
  "wallet_deposit_success": "ተቀማጭ ስኬታማ!",
  "wallet_withdraw_success": "ማውጫ ስኬታማ!",
  "bets_place_bet": "ውርርድ አስቀምጥ",
  "bets_home_win": "የቤት ድል",
  "bets_away_win": "የጎብኝ ድል",
  "bets_draw": "አቻ",
  "bets_over": "ከላይ",
  "bets_under": "ከበታች",
  "bets_potential_win": "ሊገኝ የሚችል ድል",
  "bets_stake": "ውርርድ",
  "bets_odds": "ዕድሎች",
  "bets_accumulator": "አክሙሌተር",
  "bets_cashout": "ገንዘብ አውጣ",
  "bets_cashout_value": "ማውጫ ዋጋ",
  "bets_placed": "ውርርድ ተቀምጧል!",
  "tax_title": "የግብር ማዕከል",
  "tax_rate": "የግብር መጠን",
  "tax_rate_value": "15%",
  "tax_free_limit": "ከግብር ነጻ ገደብ",
  "tax_free_limit_value": "100 ብር",
  "tax_total_paid": "የተከፈለ ጠቅላላ ግብር",
  "tax_total_winnings": "ግብር የተከፈለበት ጠቅላላ ድል",
  "tax_certificate": "የግብር የምስክር ወረቀት",
  "tax_monthly_report": "ወርሃዊ ሪፖርት",
  "matches_live": "ቀጥታ",
  "matches_upcoming": "ቀጣይ",
  "matches_finished": "የተጠናቀቀ",
  "matches_halftime": "የግማሽ ጊዜ",
  "matches_fulltime": "ሙሉ ጊዜ",
  "matches_minute": "ደቂቃ",
  "matches_league": "ሊግ",
  "matches_stats": "ስታቲስቲክስ",
  "matches_events": "ክስተቶች",
  "time_today": "ዛሬ",
  "time_tomorrow": "ነገ",
  "time_yesterday": "ትላንት",
  "time_now": "አሁን",
  "time_minutes_ago": "ደቂቃ በፊት",
  "time_hours_ago": "ሰዓት በፊት",
  "time_days_ago": "ቀን በፊት",
  "time_am": "ጥዋት",
  "time_pm": "ማታ",
  "err_required": "ይህ መስክ ያስፈልጋል",
  "err_invalid_email": "እባክዎ ትክክለኛ ኢሜይል ያስገቡ",
  "err_pwd_too_short": "የይለፍ ቃል ቢያንስ 8 ቁምፊዎች መሆን አለበት",
  "err_pwd_no_upper": "የይለፍ ቃል ቢያንስ አንድ ትልቅ ፊደል መያዝ አለበት",
  "err_pwd_no_lower": "የይለፍ ቃል ቢያንስ አንድ ትንሽ ፊደል መያዝ አለበት",
  "err_pwd_no_num": "የይለፍ ቃል ቢያንስ አንድ ቁጥር መያዝ አለበት",
  "err_pwd_no_special": "የይለፍ ቃል ቢያንስ አንድ ልዩ ቁምፊ መያዝ አለበት",
  "err_pwd_no_match": "የይለፍ ቃሎች አይዛመዱም",
  "err_insufficient_bal": "በቂ ቀሪ ሂሳብ የለም",
  "err_invalid_amount": "ዋጋ ትክክል አይደለም",
  "err_network": "የአውታረ መረብ ስህተት",
  "btn_submit": "አስገባ",
  "btn_cancel": "ሰርዝ",
  "btn_confirm": "አረጋግጥ",
  "btn_back": "ተመለስ",
  "btn_next": "ቀጥል",
  "btn_save": "አስቀምጥ",
  "btn_edit": "አርትዕ",
  "btn_delete": "ሰርዝ",
  "btn_close": "ዝጋ"
};

// Supported languages. Every entry beyond 'en' and 'am' currently ships as a
// starter translation set (see /locales/*.json) — core navigation/auth/wallet
// terms are translated, remaining strings fall back to English. Have a native
// speaker review before relying on these for production copy.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹', dir: 'ltr' },
  { code: 'om', name: 'Afaan Oromoo', flag: '🇪🇹', dir: 'ltr' },
  { code: 'ti', name: 'ትግርኛ', flag: '🇪🇹', dir: 'ltr' },
  { code: 'so', name: 'Soomaali', flag: '🇸🇴', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
];

// Translation data
const translations = {
  en: {},
  am: defaultAmharicTranslations
};

// Load every locale file from the /locales static folder (with graceful fallback
// to the bundled Amharic defaults if the network/static file isn't reachable).
async function loadAllTranslations() {
  await Promise.all(
    SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map(async (lang) => {
      try {
        const res = await axios.get(`/locales/${lang.code}.json`);
        if (res.data && typeof res.data === 'object') {
          translations[lang.code] = { ...(lang.code === 'am' ? defaultAmharicTranslations : {}), ...res.data };
        }
      } catch (error) {
        console.warn(`Failed to load ${lang.code} translations via API:`, error.message);
        if (lang.code === 'am') translations.am = defaultAmharicTranslations;
      }
    })
  );
}

// Translation hook
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      t: (key) => key,
      changeLanguage: () => {}
    };
  }
  return {
    language: context.language,
    t: context.t,
    changeLanguage: context.changeLanguage
  };
}

// Language Provider component
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('shebaodds_language') || 'en';
  });
  
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  
  useEffect(() => {
    loadAllTranslations().then(() => setTranslationsLoaded(true));
  }, []);
  
  const t = (key, params = {}) => {
    let text;

    if (language !== 'en' && translations[language]?.[key]) {
      text = translations[language][key];
    } else if (translations.en[key]) {
      text = translations.en[key];
    } else {
      text = key;
    }
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  };
  
  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('shebaodds_language', newLanguage);
    document.documentElement.lang = newLanguage;
    const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === newLanguage);
    document.documentElement.dir = langMeta?.dir || 'ltr'; // Arabic renders right-to-left
  };
  
  if (!translationsLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0c0c0c',
        color: '#ffb300',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        letterSpacing: '0.05em'
      }}>
        <span>🦁 ሼባኦድስ - LOADING TRANSLATIONS...</span>
      </div>
    );
  }
  
  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Language Switcher Component
export function LanguageSwitcher() {
  const { language, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = SUPPORTED_LANGUAGES;

  const currentLang = languages.find(l => l.code === language);
  
  return (
    <div className="language-switcher" style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        className="language-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#161616',
          border: '1px solid #ffb300',
          borderRadius: '4px',
          color: '#ffffff',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 'bold',
          transition: 'all 0.25s ease'
        }}
      >
        <span>{currentLang?.flag}</span>
        <span>{currentLang?.name}</span>
        <span className="arrow" style={{ fontSize: '0.75rem', marginLeft: '2px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }} 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="language-dropdown"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              backgroundColor: '#111111',
              border: '1px solid #ffb300',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 999,
              minWidth: '160px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {languages.map(lang => (
              <button
                key={lang.code}
                className={`language-option ${language === lang.code ? 'active' : ''}`}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: language === lang.code ? '#ffb300' : 'transparent',
                  color: language === lang.code ? '#000000' : '#ffffff',
                  border: 'none',
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s ease, color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (language !== lang.code) {
                    e.currentTarget.style.backgroundColor = '#222222';
                  }
                }}
                onMouseLeave={(e) => {
                  if (language !== lang.code) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="flag">{lang.flag}</span>
                <span className="name">{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Number formatter with Amharic Ge'ez numerals support
export function formatNumber(number, language = 'en') {
  if (language === 'am') {
    const amharicDigits = ['፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱', '፲'];
    return number.toString().split('').map(d => {
      if (d >= '0' && d <= '9') {
        const val = parseInt(d, 10);
        if (val === 0) return '0'; // Traditional Ge'ez has no zero placeholder, keep it as '0'
        return amharicDigits[val - 1] || d;
      }
      return d;
    }).join('');
  }
  return number.toLocaleString();
}

// Date formatter with Amharic calendar name support
export function formatDate(date, language = 'en', format = 'full') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  if (language === 'am') {
    const amharicMonths = [
      'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ',
      'ሐምሌ', 'ነሐሴ', 'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ'
    ];
    const amharicDays = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'];
    
    if (format === 'date') {
      return `${amharicMonths[d.getMonth()]} ${d.getDate()} ቀን ${d.getFullYear()} ዓ.ም.`;
    } else if (format === 'time') {
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'ከሰዓት በኋላ' : 'ከረድፍ በፊት';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else {
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'ከሰዓት በኋላ' : 'ከረድፍ በፊት';
      const hours12 = hours % 12 || 12;
      return `${amharicDays[d.getDay()]}፣ ${amharicMonths[d.getMonth()]} ${d.getDate()} ቀን ${d.getFullYear()}፣ ${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
  }
  
  if (format === 'date') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (format === 'time') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
