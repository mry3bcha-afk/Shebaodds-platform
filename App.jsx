// ============================================
// SHEBAODDS - COMPLETE REACT FRONTEND
// 85% Black / 15% Gold Theme | Smart Bets. Real Wins.
// ============================================

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { LanguageProvider, LanguageSwitcher, useTranslation, formatNumber, formatDate } from './LanguageContext';
import { CrownMark, BrandLockup } from './Logo';
import CasinoGamesPage from './CasinoGamesPage';
import AdminDepositReview from './AdminDepositReview';
import { DemoPaymentProvider, useDemoPayments, DEMO_DEPOSIT_NUMBER } from './DemoPaymentStore';
import './styles/global.css';
import './styles/theme.css';

// ==================== CONFIGURATION ====================
const API_URL = process.env.REACT_APP_API_URL || 'https://api.shebaodds.com';
const WS_URL = process.env.REACT_APP_WS_URL || 'https://shebaodds.com';

// Axios configuration
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Socket instance
let socket;

// ==================== CONTEXTS ====================
const AuthContext = createContext();
const BetSlipContext = createContext();
const NotificationContext = createContext();

// Custom hooks
const useAuth = () => useContext(AuthContext);
const useBetSlip = () => useContext(BetSlipContext);
const useNotifications = () => useContext(NotificationContext);

// ==================== MAIN APP COMPONENT ====================
function App() {
  const [token, setToken] = useState(localStorage.getItem('shebaodds_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('shebaodds_theme') || 'dark');
  const [language, setLanguage] = useState(localStorage.getItem('shebaodds_language') || 'en');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
      initSocket();
    } else {
      setLoading(false);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token]);

  const initSocket = () => {
    socket = io(WS_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('🦁 SHEBAODDS Socket connected');
    });

    socket.on('wallet_update', (data) => {
      setUser(prev => prev ? { ...prev, balance: data.balance, bonusBalance: data.bonusBalance } : prev);
    });

    socket.on('notification', (notification) => {
      // Show toast notification
      showToast(notification.title, notification.message);
    });

    socket.on('odds_update', (data) => {
      // Update odds in real-time
      window.dispatchEvent(new CustomEvent('odds_update', { detail: data }));
    });
  };

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
      socket?.emit('authenticate', token);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, twoFactorCode) => {
    const res = await axios.post('/api/auth/login', { email, password, twoFactorCode });
    const { token, user } = res.data;
    localStorage.setItem('shebaodds_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
    initSocket();
    return res.data;
  };

  const register = async (userData) => {
    const res = await axios.post('/api/auth/register', userData);
    const { token, user } = res.data;
    localStorage.setItem('shebaodds_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
    initSocket();
    return res.data;
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {}
    localStorage.removeItem('shebaodds_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    socket?.disconnect();
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('shebaodds_theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('shebaodds_language', newLanguage);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <LanguageProvider>
      <DemoPaymentProvider>
      <AuthContext.Provider value={{ user, login, register, logout, updateTheme, updateLanguage, theme, language }}>
        <BetSlipContext.Provider value={{}}>
          <NotificationContext.Provider value={{}}>
            <BrowserRouter>
            <div className="app" data-theme={theme}>
              <Navigation />
              <div className="main-content">
                <TopBar />
                <div className="page-container">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/matches" element={<MatchesPage />} />
                    <Route path="/matches/:matchId" element={<MatchDetailPage />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/games" element={<CasinoGamesPage />} />
                    <Route path="/admin/deposits" element={user?.role === 'admin' || user?.role === 'superadmin' ? <AdminDepositReview /> : <Navigate to="/" />} />
                    <Route path="/promotions" element={<PromotionsPage />} />
                    <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
                    <Route path="/wallet" element={user ? <WalletPage /> : <Navigate to="/login" />} />
                    <Route path="/tax" element={user ? <TaxPage /> : <Navigate to="/login" />} />
                    <Route path="/betting-history" element={user ? <BettingHistoryPage /> : <Navigate to="/login" />} />
                    <Route path="/responsible-gambling" element={user ? <ResponsibleGamblingPage /> : <Navigate to="/login" />} />
                    <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
                    <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
                    <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/responsible" element={<ResponsiblePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </div>
                <Footer />
              </div>
              <BetSlip />
            </div>
          </BrowserRouter>
        </NotificationContext.Provider>
      </BetSlipContext.Provider>
    </AuthContext.Provider>
      </DemoPaymentProvider>
    </LanguageProvider>
  );
}

// ==================== LOADING SCREEN ====================
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <BrandLockup size={64} />
      <div className="loading-spinner"></div>
      <div className="loading-progress">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
}

// ==================== NAVIGATION COMPONENT ====================
function Navigation() {
  const { user, logout } = useAuth();
  const { language, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: '🏠', label: 'Dashboard', labelAm: 'ዳሽቦርድ' },
    { path: '/matches', icon: '⚽', label: 'Football', labelAm: 'እግር ኳስ' },
    { path: '/live', icon: '📡', label: 'Live Betting', labelAm: 'ቀጥታ ውርርድ' },
    { path: '/games', icon: '🎮', label: 'Casino', labelAm: 'ካዚኖ' },
    { path: '/promotions', icon: '🎁', label: 'Promotions', labelAm: 'ማስተዋወቂያዎች' },
    { path: '/profile', icon: '👤', label: 'Profile', labelAm: 'መገለጫ' },
    { path: '/wallet', icon: '💰', label: 'Wallet', labelAm: 'ቦርሳ' },
    { path: '/betting-history', icon: '📊', label: 'History', labelAm: 'ታሪክ' },
    { path: '/tax', icon: '📈', label: 'Tax Center', labelAm: 'የግብር ማዕከል' },
    { path: '/support', icon: '💬', label: 'Support', labelAm: 'ድጋፍ' },
    ...(user?.role === 'admin' || user?.role === 'superadmin'
      ? [{ path: '/admin/deposits', icon: '🧾', label: 'Deposit Review', labelAm: 'የተቀማጭ ማረጋገጫ' }]
      : [])
  ];

  return (
    <>
      <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        ☰
      </button>
      
      <nav className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <CrownMark size={34} />
            <div className="logo-text">
              <span className="brand">SHEBAODDS</span>
              <span className="tagline">{t('app_tagline') || "Smart Bets. Real Wins."}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{language === 'am' ? item.labelAm : item.label}</span>
            </Link>
          ))}
        </div>

        {user && (
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user.username}</div>
                <div className="user-vip">
                  <span className="vip-badge">VIP {user.vip?.level || 1}</span>
                </div>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <span>🚪</span> {language === 'am' ? 'ውጣ' : 'Logout'}
            </button>
          </div>
        )}
      </nav>
    </>
  );
}

// ==================== TOP BAR ====================
function TopBar() {
  const { user, theme, updateTheme } = useAuth();
  const { language, t } = useTranslation();
  const [currentTime, setCurrentTime] = useState('');
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(formatDate(now, language, 'time'));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [language]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications?limit=5');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {}
  };

  return (
    <header className="top-bar">
      <div className="time-display">
        <span className="icon">🕐</span>
        <span>{currentTime}</span>
      </div>

      <div className="search-bar">
        <input type="text" placeholder={t('search_placeholder') || "Search matches, teams, leagues..."} />
        <button className="search-btn">🔍</button>
      </div>

      <div className="top-bar-actions">
        <button className="theme-toggle" onClick={() => updateTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <LanguageSwitcher />

        {user ? (
          <>
            <div className="wallet-card" onClick={() => setShowWalletDropdown(!showWalletDropdown)}>
              <span className="wallet-icon">💰</span>
              <div className="wallet-info">
                <span className="wallet-label">{t('balance')}</span>
                <span className="wallet-balance">{formatNumber(user.wallet?.balance || 0, language)} ETB</span>
              </div>
            </div>

            {showWalletDropdown && (
              <WalletDropdown onClose={() => setShowWalletDropdown(false)} />
            )}

            <div className="notifications-icon" onClick={() => navigate('/profile?tab=notifications')}>
              <span className="bell-icon">🔔</span>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>
          </>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn-outline">Login</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
}

// ==================== WALLET DROPDOWN ====================
function WalletDropdown({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.wallet-card') && !e.target.closest('.wallet-dropdown')) {
        onClose();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div className="wallet-dropdown">
      <div className="dropdown-header">
        <span>💰 My Wallet</span>
        <span className="total-balance">{user?.wallet?.balance?.toLocaleString()} ETB</span>
      </div>
      <div className="dropdown-stats">
        <div className="stat">
          <span className="stat-value">{user?.wallet?.bonusBalance?.toLocaleString() || 0} ETB</span>
          <span className="stat-label">Bonus</span>
        </div>
        <div className="stat">
          <span className="stat-value">{user?.wallet?.totalDeposited?.toLocaleString() || 0} ETB</span>
          <span className="stat-label">Deposited</span>
        </div>
        <div className="stat">
          <span className="stat-value">{user?.wallet?.totalWon?.toLocaleString() || 0} ETB</span>
          <span className="stat-label">Won</span>
        </div>
        <div className="stat">
          <span className="stat-value">{user?.wallet?.totalTaxPaid?.toLocaleString() || 0} ETB</span>
          <span className="stat-label">Tax Paid</span>
        </div>
      </div>
      <div className="dropdown-actions">
        <button className="deposit-btn" onClick={() => navigate('/wallet?action=deposit')}>Deposit</button>
        <button className="withdraw-btn" onClick={() => navigate('/wallet?action=withdraw')}>Withdraw</button>
      </div>
      <div className="dropdown-footer">
        <button onClick={() => navigate('/wallet')}>View All Transactions →</button>
      </div>
    </div>
  );
}

// ==================== HOME PAGE ====================
function HomePage() {
  const { user } = useAuth();
  const [featuredMatches, setFeaturedMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [featuredRes, liveRes, upcomingRes] = await Promise.all([
        axios.get('/api/matches/featured/all'),
        axios.get('/api/matches/live/all'),
        axios.get('/api/matches/upcoming/all?limit=6')
      ]);
      setFeaturedMatches(featuredRes.data.matches);
      setLiveMatches(liveRes.data.matches);
      setUpcomingMatches(upcomingRes.data.matches);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <h1>Smart Bets. Real Wins.</h1>
          <p>Join SHEBAODDS today and get 100 ETB Welcome Bonus!</p>
          {!user && <Link to="/register" className="btn-gold-large">Register Now →</Link>}
        </div>
        <div className="hero-stats">
          <div className="stat"><span>50K+</span> Active Users</div>
          <div className="stat"><span>100+</span> Daily Matches</div>
          <div className="stat"><span>99%</span> Payout Rate</div>
          <div className="stat"><span>15%</span> Tax Rate</div>
        </div>
      </div>

      {/* Live Matches Widget */}
      {liveMatches.length > 0 && (
        <div className="live-widget">
          <div className="widget-header">
            <span className="live-dot"></span>
            <span className="widget-title">LIVE NOW</span>
            <Link to="/live" className="view-all">View All →</Link>
          </div>
          <div className="live-matches">
            {liveMatches.slice(0, 3).map(match => (
              <LiveMatchCard key={match.matchId} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Featured Matches */}
      <div className="section">
        <div className="section-header">
          <h2>🔥 Featured Matches</h2>
          <Link to="/matches" className="view-all">View All →</Link>
        </div>
        {loading ? (
          <div className="skeleton-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton-card"></div>)}</div>
        ) : (
          <div className="matches-grid">
            {featuredMatches.map(match => <MatchCard key={match.matchId} match={match} />)}
          </div>
        )}
      </div>

      {/* Upcoming Matches */}
      <div className="section">
        <div className="section-header">
          <h2>⚽ Upcoming Matches</h2>
          <Link to="/matches" className="view-all">View All →</Link>
        </div>
        <div className="matches-grid">
          {upcomingMatches.map(match => <MatchCard key={match.matchId} match={match} />)}
        </div>
      </div>
    </div>
  );
}

// ==================== MATCH CARD ====================
function MatchCard({ match }) {
  const navigate = useNavigate();

  const addToBetSlip = (betType, odds) => {
    const bet = {
      matchId: match.matchId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      betType,
      odds,
      selection: betType,
      matchDate: match.matchDate
    };
    window.dispatchEvent(new CustomEvent('addToBetSlip', { detail: bet }));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="match-card">
      <div className="match-header">
        <span className="match-league">{match.league}</span>
        <span className="match-date">{formatDate(match.matchDate)}</span>
      </div>
      <div className="match-teams" onClick={() => navigate(`/matches/${match.matchId}`)}>
        <div className="team home">
          <span className="team-name">{match.homeTeam}</span>
        </div>
        <div className="vs">VS</div>
        <div className="team away">
          <span className="team-name">{match.awayTeam}</span>
        </div>
      </div>
      <div className="match-odds">
        <button className="odds-btn" onClick={() => addToBetSlip('Home Win', match.prematchOdds?.homeWin)}>
          <span className="odds-label">1</span>
          <span className="odds-value">{match.prematchOdds?.homeWin?.toFixed(2)}</span>
        </button>
        <button className="odds-btn" onClick={() => addToBetSlip('Draw', match.prematchOdds?.draw)}>
          <span className="odds-label">X</span>
          <span className="odds-value">{match.prematchOdds?.draw?.toFixed(2)}</span>
        </button>
        <button className="odds-btn" onClick={() => addToBetSlip('Away Win', match.prematchOdds?.awayWin)}>
          <span className="odds-label">2</span>
          <span className="odds-value">{match.prematchOdds?.awayWin?.toFixed(2)}</span>
        </button>
      </div>
      <div className="match-extra-odds">
        <button onClick={() => addToBetSlip('Over 2.5', match.prematchOdds?.totalGoals?.over25)}>
          Over 2.5 ({match.prematchOdds?.totalGoals?.over25?.toFixed(2)})
        </button>
        <button onClick={() => addToBetSlip('Under 2.5', match.prematchOdds?.totalGoals?.under25)}>
          Under 2.5 ({match.prematchOdds?.totalGoals?.under25?.toFixed(2)})
        </button>
        <button onClick={() => addToBetSlip('BTTS - Yes', match.prematchOdds?.btts?.yes)}>
          BTTS ({match.prematchOdds?.btts?.yes?.toFixed(2)})
        </button>
      </div>
    </div>
  );
}

// ==================== LIVE MATCH CARD ====================
function LiveMatchCard({ match }) {
  const navigate = useNavigate();

  return (
    <div className="live-match-card" onClick={() => navigate(`/matches/${match.matchId}`)}>
      <div className="live-header">
        <span className="live-indicator"></span>
        <span className="live-text">LIVE</span>
        <span className="live-minute">{match.minute}'</span>
      </div>
      <div className="live-scores">
        <div className="team">
          <span className="team-name">{match.homeTeam}</span>
          <span className="team-score">{match.scores?.home || 0}</span>
        </div>
        <span className="vs">vs</span>
        <div className="team">
          <span className="team-score">{match.scores?.away || 0}</span>
          <span className="team-name">{match.awayTeam}</span>
        </div>
      </div>
      <div className="live-odds">
        <div className="odd">
          <span>{match.liveOdds?.homeWin?.toFixed(2)}</span>
          <span>Home</span>
        </div>
        <div className="odd">
          <span>{match.liveOdds?.draw?.toFixed(2)}</span>
          <span>Draw</span>
        </div>
        <div className="odd">
          <span>{match.liveOdds?.awayWin?.toFixed(2)}</span>
          <span>Away</span>
        </div>
      </div>
    </div>
  );
}

// ==================== BET SLIP ====================
function BetSlip() {
  const { user } = useAuth();
  const [bets, setBets] = useState([]);
  const [stake, setStake] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAddBet = (e) => {
      setBets(prev => [...prev, e.detail]);
      setIsOpen(true);
    };
    window.addEventListener('addToBetSlip', handleAddBet);
    return () => window.removeEventListener('addToBetSlip', handleAddBet);
  }, []);

  const removeBet = (index) => setBets(prev => prev.filter((_, i) => i !== index));
  const clearBets = () => { setBets([]); setStake(''); };

  const calculateTotalOdds = () => {
    if (bets.length === 0) return 0;
    return bets.reduce((acc, bet) => acc * bet.odds, 1);
  };

  const calculatePotentialWin = () => {
    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount)) return 0;
    return stakeAmount * calculateTotalOdds();
  };

  const calculateTax = (amount) => amount * 0.15;
  const calculateNetWin = (amount) => amount - calculateTax(amount);

  const placeBet = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount < 1) {
      alert('Please enter a valid stake amount (minimum 1 ETB)');
      return;
    }

    setLoading(true);
    try {
      if (bets.length === 1) {
        const bet = bets[0];
        const res = await axios.post('/api/bets/place', {
          matchId: bet.matchId,
          marketType: 'ft_1x2',
          selection: bet.betType,
          odds: bet.odds,
          stake: stakeAmount
        });
        if (res.data.success) {
          alert('✅ Bet placed successfully!');
          clearBets();
          setIsOpen(false);
        }
      } else if (bets.length > 1) {
        const selections = bets.map(bet => ({
          matchId: bet.matchId,
          marketType: 'ft_1x2',
          selection: bet.betType,
          odds: bet.odds
        }));
        const res = await axios.post('/api/bets/accumulator', {
          selections,
          totalStake: stakeAmount
        });
        if (res.data.success) {
          alert(`✅ Accumulator placed! Potential win: ${res.data.potentialWin} ETB`);
          clearBets();
          setIsOpen(false);
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {bets.length > 0 && !isOpen && (
        <div className="bet-slip-toggle" onClick={() => setIsOpen(true)}>
          <span>🎫</span>
          <span className="bet-count">{bets.length}</span>
        </div>
      )}

      <div className={`bet-slip ${isOpen ? 'open' : ''}`}>
        <div className="bet-slip-header">
          <h3>🎫 Bet Slip</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className="bet-slip-items">
          {bets.map((bet, index) => (
            <div key={index} className="bet-item">
              <div className="bet-info">
                <div className="bet-match">{bet.homeTeam} vs {bet.awayTeam}</div>
                <div className="bet-selection">{bet.betType} @ {bet.odds.toFixed(2)}</div>
              </div>
              <button className="remove-bet" onClick={() => removeBet(index)}>✕</button>
            </div>
          ))}
          {bets.length === 0 && <div className="empty-betslip">No selections added</div>}
        </div>

        {bets.length > 0 && (
          <div className="bet-slip-footer">
            {bets.length > 1 && (
              <div className="total-odds">
                Total Odds: {calculateTotalOdds().toFixed(2)}
              </div>
            )}
            <div className="stake-input">
              <input 
                type="number" 
                placeholder="Enter stake (ETB)" 
                value={stake} 
                onChange={(e) => setStake(e.target.value)}
                min="1"
              />
            </div>
            <div className="potential-win">
              <span>Potential Win:</span>
              <span className="amount">{calculatePotentialWin().toFixed(2)} ETB</span>
            </div>
            <div className="tax-info">
              <span>Tax (15%):</span>
              <span>{calculateTax(calculatePotentialWin()).toFixed(2)} ETB</span>
            </div>
            <div className="net-win">
              <span>Net Win:</span>
              <span className="net-amount">{calculateNetWin(calculatePotentialWin()).toFixed(2)} ETB</span>
            </div>
            <button className="place-bet-btn" onClick={placeBet} disabled={loading}>
              {loading ? 'Processing...' : 'Place Bet'}
            </button>
            <button className="clear-bets-btn" onClick={clearBets}>Clear All</button>
          </div>
        )}
      </div>
    </>
  );
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <CrownMark size={30} />
          <div>
            <div className="logo-text">SHEBAODDS</div>
            <div className="tagline">Smart Bets. Real Wins.</div>
          </div>
        </div>
        <div className="footer-links">
          <div className="link-group">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/careers">Careers</Link>
          </div>
          <div className="link-group">
            <h4>Legal</h4>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/responsible">Responsible Gambling</Link>
          </div>
          <div className="link-group">
            <h4>Support</h4>
            <Link to="/faq">FAQ</Link>
            <Link to="/support">Help Center</Link>
            <Link to="/live-chat">Live Chat (24/7)</Link>
          </div>
          <div className="link-group">
            <h4>Follow Us</h4>
            <a href="https://twitter.com/shebaodds" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://instagram.com/shebaodds" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://t.me/shebaodds" target="_blank" rel="noopener noreferrer">Telegram</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2024 SHEBAODDS. All rights reserved. Smart Bets. Real Wins.</p>
        <p>18+ Only. Please gamble responsibly.</p>
        <p>Tax: 15% withholding tax applies to winnings over 100 ETB</p>
      </div>
    </footer>
  );
}

// Placeholder components for routes not fully implemented
function MatchesPage() { return <div className="coming-soon">Matches Page - Coming Soon</div>; }
function MatchDetailPage() { return <div className="coming-soon">Match Detail - Coming Soon</div>; }
function LivePage() { return <div className="coming-soon">Live Betting - Coming Soon</div>; }
function PromotionsPage() { return <div className="coming-soon">Promotions - Coming Soon</div>; }
function ProfilePage() { return <div className="coming-soon">Profile - Coming Soon</div>; }
function WalletPage() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const isAm = language === 'am';
  const { addRequest } = useDemoPayments();
  const [tab, setTab] = useState('deposit');

  // Deposit form state
  const [depositTicket, setDepositTicket] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  // Withdrawal form state — ONE user-added payout number
  const [payoutNumber, setPayoutNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [submitted, setSubmitted] = useState(null);

  const submitDeposit = (e) => {
    e.preventDefault();
    if (!depositTicket || !depositAmount) return;
    const entry = addRequest({
      type: 'deposit',
      method: 'TeleBirr',
      ticket: depositTicket,
      amount: depositAmount,
      user: user?.username,
    });
    setSubmitted(entry);
    setDepositTicket('');
    setDepositAmount('');
  };

  const submitWithdrawal = (e) => {
    e.preventDefault();
    if (!payoutNumber || !withdrawAmount) return;
    const entry = addRequest({
      type: 'withdrawal',
      method: 'CBE Birr',
      ticket: `WD-${Date.now().toString().slice(-8)}`,
      amount: withdrawAmount,
      payoutNumber,
      user: user?.username,
    });
    setSubmitted(entry);
    setWithdrawAmount('');
  };

  return (
    <div className="wallet-page">
      <div className="demo-banner-strip">
        {isAm
          ? '⚠️ ማሳያ ብቻ — በዚህ ገጽ የሚላኩ ጥያቄዎች እውነተኛ ገንዘብ አይንቀሳቀሱም፤ ለአስተዳዳሪ ግምገማ ብቻ ይላካሉ።'
          : "⚠️ DEMO ONLY — requests submitted here move no real money. They're queued for admin ticket review."}
      </div>

      <div className="wallet-tabs">
        <button className={`casino-tab ${tab === 'deposit' ? 'active' : ''}`} onClick={() => setTab('deposit')}>
          {isAm ? 'ተቀማጭ' : 'Deposit'}
        </button>
        <button className={`casino-tab ${tab === 'withdraw' ? 'active' : ''}`} onClick={() => setTab('withdraw')}>
          {isAm ? 'ማውጫ' : 'Withdraw'}
        </button>
      </div>

      {tab === 'deposit' && (
        <form className="wallet-form" onSubmit={submitDeposit}>
          <p className="wallet-form-hint">
            {isAm
              ? `ወደዚህ ቁጥር ይላኩ: `
              : 'Send your deposit to this demo number: '}
            <strong>{DEMO_DEPOSIT_NUMBER}</strong>
            {isAm ? ' ከዚያ ትኬት ቁጥሩን እና መጠኑን ከታች ያስገቡ።' : ' — then enter the ticket/reference number and amount below.'}
          </p>
          <label>{isAm ? 'ትኬት ቁጥር' : 'Ticket / Reference Number'}</label>
          <input value={depositTicket} onChange={(e) => setDepositTicket(e.target.value)} placeholder="e.g. TB-84KX2Q1" required />
          <label>{isAm ? 'መጠን (ETB)' : 'Amount (ETB)'}</label>
          <input type="number" min="1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
          <button type="submit" className="wallet-submit-btn">{isAm ? 'ላክ ለግምገማ' : 'Submit for Review'}</button>
        </form>
      )}

      {tab === 'withdraw' && (
        <form className="wallet-form" onSubmit={submitWithdrawal}>
          <p className="wallet-form-hint">
            {isAm
              ? 'የገንዘብ መቀበያ ቁጥርዎን ያስገቡ (አንድ ቁጥር ብቻ)።'
              : 'Add the number you want your withdrawal sent to (one number).'}
          </p>
          <label>{isAm ? 'የክፍያ ቁጥር' : 'Payout Number'}</label>
          <input value={payoutNumber} onChange={(e) => setPayoutNumber(e.target.value)} placeholder="e.g. 0911223344" required />
          <label>{isAm ? 'መጠን (ETB)' : 'Amount (ETB)'}</label>
          <input type="number" min="1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required />
          <button type="submit" className="wallet-submit-btn">{isAm ? 'ላክ ለግምገማ' : 'Submit for Review'}</button>
        </form>
      )}

      {submitted && (
        <div className="wallet-submitted-note">
          {isAm ? 'ተልኳል' : 'Submitted'}: {submitted.id} — {isAm ? 'ለአስተዳዳሪ ግምገማ በመጠባበቅ ላይ' : 'pending admin review'}
        </div>
      )}
    </div>
  );
}
function TaxPage() { return <div className="coming-soon">Tax Center - Coming Soon</div>; }
function BettingHistoryPage() { return <div className="coming-soon">Betting History - Coming Soon</div>; }
function ResponsibleGamblingPage() { return <div className="coming-soon">Responsible Gambling - Coming Soon</div>; }
function LoginPage() { return <div className="coming-soon">Login - Coming Soon</div>; }
function RegisterPage() { return <div className="coming-soon">Register - Coming Soon</div>; }
function ResetPasswordPage() { return <div className="coming-soon">Reset Password - Coming Soon</div>; }
function VerifyEmailPage() { return <div className="coming-soon">Verify Email - Coming Soon</div>; }
function SettingsPage() { return <div className="coming-soon">Settings - Coming Soon</div>; }
function SupportPage() { return <div className="coming-soon">Support - Coming Soon</div>; }
function TermsPage() { return <div className="coming-soon">Terms - Coming Soon</div>; }
function PrivacyPage() { return <div className="coming-soon">Privacy - Coming Soon</div>; }
function ResponsiblePage() { return <div className="coming-soon">Responsible Gambling - Coming Soon</div>; }
function NotFoundPage() { return <div className="coming-soon">Page Not Found</div>; }
function showToast(title, message) { console.log('Toast:', title, message); }

export default App;
