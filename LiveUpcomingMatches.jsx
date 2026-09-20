import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Trophy, Landmark, Receipt, FileBarChart2, 
  Gift, Settings, ShieldAlert, FileText, Mail, Search, Bell, 
  ChevronDown, Plus, Lock, Unlock, Trash2, Edit2, Check, X, 
  ArrowUpRight, ArrowDownRight, Wallet, Filter, CheckCircle2, 
  AlertTriangle, Play, Eye, DollarSign, Activity, Globe
} from 'lucide-react';

export default function LiveUpcomingMatches({ wsUrl = 'ws://127.0.0.1:9090' }) {
  // --- STATE SYSTEM ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(true);

  // System Configuration States (Editable in Settings Modal)
  const [systemSettings, setSystemSettings] = useState({
    taxRate: 10,
    welcomeBonus: 100,
    minBet: 10,
    maxBet: 50000,
    maxDailyLoss: 20000,
    oddsRefreshRate: 5
  });

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Main Datasets with Live Update Support
  const [matches, setMatches] = useState([
    {
      id: 'sr:match:101',
      sport: 'Football',
      homeTeam: 'Man City',
      awayTeam: 'Real Madrid',
      status: 'Live',
      score: { home: 1, away: 0, elapsed: "65'" },
      startTime: 'Today, 21:45',
      odds: { '1': 1.85, 'X': 3.40, '2': 3.70 },
      oddsUp: {},
      oddsDown: {}
    },
    {
      id: 'sr:match:102',
      sport: 'Football',
      homeTeam: 'Liverpool',
      awayTeam: 'Chelsea',
      status: 'Live',
      score: { home: 0, away: 0, elapsed: "20'" },
      startTime: 'Today, 21:00',
      odds: { '1': 1.90, 'X': 3.40, '2': 2.85 },
      oddsUp: {},
      oddsDown: {}
    },
    {
      id: 'sr:match:103',
      sport: 'Football',
      homeTeam: 'Arsenal',
      awayTeam: 'Newcastle',
      status: 'Live',
      score: { home: 2, away: 1, elapsed: "70'" },
      startTime: 'Today, 19:30',
      odds: { '1': 1.75, 'X': 3.30, '2': 4.20 },
      oddsUp: {},
      oddsDown: {}
    },
    {
      id: 'sr:match:104',
      sport: 'Football',
      homeTeam: 'Barcelona',
      awayTeam: 'Sevilla',
      status: 'Live',
      score: { home: 3, away: 0, elapsed: "80'" },
      startTime: 'Today, 18:00',
      odds: { '1': 1.40, 'X': 4.50, '2': 6.00 },
      oddsUp: {},
      oddsDown: {}
    },
    {
      id: 'sr:match:105',
      sport: 'Football',
      homeTeam: 'Bayern Munich',
      awayTeam: 'Dortmund',
      status: 'Live',
      score: { home: 1, away: 1, elapsed: "45'" },
      startTime: 'Today, 16:30',
      odds: { '1': 2.05, 'X': 3.60, '2': 2.90 },
      oddsUp: {},
      oddsDown: {}
    },
    {
      id: 'sr:match:106',
      sport: 'Football',
      homeTeam: 'Inter vs AC Milan',
      awayTeam: 'AC Milan',
      status: 'Upcoming',
      startTime: 'Tomorrow, 01:30',
      odds: { '1': 2.10, 'X': 3.40, '2': 3.30 },
      oddsUp: {},
      oddsDown: {}
    },
    {
      id: 'sr:match:107',
      sport: 'Football',
      homeTeam: 'Man Utd',
      awayTeam: 'Tottenham',
      status: 'Upcoming',
      startTime: 'Tomorrow, 04:00',
      odds: { '1': 2.30, 'X': 3.40, '2': 2.90 },
      oddsUp: {},
      oddsDown: {}
    }
  ]);

  const [transactions, setTransactions] = useState([
    { id: '#TRX9852', user: 'User1234', type: 'Deposit', amount: 5000, method: 'TeleBirr', status: 'Approved', time: '10:42 PM' },
    { id: '#TRX9851', user: 'User5678', type: 'Withdrawal', amount: 2500, method: 'CBE Birr', status: 'Pending', time: '10:30 PM' },
    { id: '#TRX9850', user: 'User4321', type: 'Deposit', amount: 1000, method: 'TeleBirr', status: 'Approved', time: '10:28 PM' },
    { id: '#TRX9849', user: 'User8765', type: 'Withdrawal', amount: 3000, method: 'TeleBirr', status: 'Rejected', time: '10:15 PM' },
    { id: '#TRX9848', user: 'User2468', type: 'Deposit', amount: 2000, method: 'CBE Birr', status: 'Approved', time: '10:05 PM' }
  ]);

  const [liveBets, setLiveBets] = useState([
    { id: '#52898', user: 'User1234', match: 'Man City vs Real Madrid', market: '1X2', pick: '1', odds: 1.85, stake: 2000, possibleWin: 3700, status: 'LIVE' },
    { id: '#52897', user: 'User5678', match: 'Liverpool vs Chelsea', market: 'Over/Under 2.5', pick: 'Over', odds: 1.90, stake: 1500, possibleWin: 2850, status: 'LIVE' },
    { id: '#52896', user: 'User4321', match: 'Arsenal vs Newcastle', market: 'BTTS', pick: 'Yes', odds: 1.75, stake: 1000, possibleWin: 1750, status: 'LIVE' },
    { id: '#52895', user: 'User8765', match: 'Barcelona vs Sevilla', market: '1X2', pick: '1', odds: 1.40, stake: 3000, possibleWin: 4200, status: 'LIVE' },
    { id: '#52894', user: 'User2468', match: 'Bayern vs Dortmund', market: 'Over/Under 3.5', pick: 'Under', odds: 2.05, stake: 800, possibleWin: 1640, status: 'LIVE' }
  ]);

  const [users, setUsers] = useState([
    { id: 'User1234', email: 'user1234@shebaodds.com', role: 'Player', balance: 2450.75, joined: '2025-05-10' },
    { id: 'User5678', email: 'user5678@shebaodds.com', role: 'Player', balance: 5000.00, joined: '2025-05-12' },
    { id: 'User4321', email: 'user4321@shebaodds.com', role: 'Agent', balance: 12500.20, joined: '2025-04-18' },
    { id: 'User8765', email: 'user8765@shebaodds.com', role: 'Player', balance: 350.00, joined: '2025-05-14' },
    { id: 'User2468', email: 'user2468@shebaodds.com', role: 'Player', balance: 1800.50, joined: '2025-05-15' }
  ]);

  // Financial aggregates
  const stats = useMemo(() => {
    const totalUsersCount = 12458 + users.length - 5;
    const totalBalanceAmount = 1257850 + users.reduce((acc, u) => acc + u.balance, 0) - 22101.45;
    const totalBetsTodayCount = 8564 + liveBets.length - 5;
    const totalDepositsAmount = 523600 + transactions.filter(t => t.type === 'Deposit' && t.status === 'Approved').reduce((acc, t) => acc + t.amount, 0) - 8000;
    const totalWithdrawalsAmount = 186250 + transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Approved').reduce((acc, t) => acc + t.amount, 0);
    const profitToday = 125750 + liveBets.reduce((acc, b) => acc + b.stake, 0) * 0.15;
    const totalProfitAmount = 3245680 + profitToday - 125750;

    return {
      users: totalUsersCount,
      balance: totalBalanceAmount,
      betsToday: totalBetsTodayCount,
      deposits: totalDepositsAmount,
      withdrawals: totalWithdrawalsAmount,
      profitToday: profitToday,
      totalProfit: totalProfitAmount
    };
  }, [users, transactions, liveBets]);

  // Modals controller states
  const [modals, setModals] = useState({
    user: false,
    match: false,
    deposit: false,
    withdrawal: false,
    settings: false,
    betSlip: false
  });

  // Form Inputs
  const [newUserForm, setNewUserForm] = useState({ id: '', email: '', role: 'Player', balance: 100 });
  const [newMatchForm, setNewMatchForm] = useState({ home: '', away: '', sport: 'Football', date: 'Today, 22:00', odds1: 1.9, oddsX: 3.2, odds2: 3.1 });
  const [newDepositForm, setNewDepositForm] = useState({ user: 'User1234', amount: 500, method: 'TeleBirr' });
  const [newWithdrawForm, setNewWithdrawForm] = useState({ user: 'User1234', amount: 500, method: 'TeleBirr' });

  // Web socket simulator & real listener
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const rawPayload = JSON.parse(event.data);
          if (rawPayload && rawPayload.eventId) {
            setMatches((prevMatches) => {
              return prevMatches.map((match) => {
                if (match.id === rawPayload.eventId) {
                  const updatedOdds = {};
                  const nextOddsUp = { ...match.oddsUp };
                  const nextOddsDown = { ...match.oddsDown };
                  const activeMarket = rawPayload.markets?.find(m => m.marketId === '1X2');
                  
                  if (activeMarket && activeMarket.odds) {
                    activeMarket.odds.forEach((item) => {
                      const outcome = item.outcome;
                      const newPrice = Number(item.price);
                      const oldPrice = match.odds[outcome];

                      if (oldPrice && newPrice !== oldPrice) {
                        if (newPrice > oldPrice) {
                          nextOddsUp[outcome] = true;
                          nextOddsDown[outcome] = false;
                        } else if (newPrice < oldPrice) {
                          nextOddsDown[outcome] = true;
                          nextOddsUp[outcome] = false;
                        }
                        
                        setTimeout(() => {
                          setMatches((current) => 
                            current.map((m) => {
                              if (m.id === match.id) {
                                const clearedUp = { ...m.oddsUp };
                                const clearedDown = { ...m.oddsDown };
                                delete clearedUp[outcome];
                                delete clearedDown[outcome];
                                return { ...m, oddsUp: clearedUp, oddsDown: clearedDown };
                              }
                              return m;
                            })
                          );
                        }, 1500);
                      }
                      updatedOdds[outcome] = newPrice;
                    });
                  }

                  return {
                    ...match,
                    score: rawPayload.score ? { 
                      home: rawPayload.score.home, 
                      away: rawPayload.score.away, 
                      elapsed: rawPayload.score.elapsed 
                    } : match.score,
                    odds: { ...match.odds, ...updatedOdds },
                    oddsUp: nextOddsUp,
                    oddsDown: nextOddsDown,
                    status: rawPayload.status || match.status
                  };
                }
                return match;
              });
            });
          }
        } catch (e) {
          // Fallback to beautiful simulated real-time updates
        }
      };
    }

    connect();

    // Secondary highly reliable simulated stream
    const simInterval = setInterval(() => {
      setMatches((current) => 
        current.map((match) => {
          if (match.status === 'Live' && Math.random() > 0.6) {
            const keys = ['1', 'X', '2'];
            const keyToChange = keys[Math.floor(Math.random() * keys.length)];
            const oldVal = match.odds[keyToChange];
            const change = (Math.random() * 0.3 - 0.15);
            const newVal = Math.max(1.1, parseFloat((oldVal + change).toFixed(2)));
            
            const nextOddsUp = { ...match.oddsUp };
            const nextOddsDown = { ...match.oddsDown };

            if (newVal > oldVal) {
              nextOddsUp[keyToChange] = true;
            } else {
              nextOddsDown[keyToChange] = true;
            }

            setTimeout(() => {
              setMatches((mList) => mList.map((m) => {
                if (m.id === match.id) {
                  const u = { ...m.oddsUp };
                  const d = { ...m.oddsDown };
                  delete u[keyToChange];
                  delete d[keyToChange];
                  return { ...m, oddsUp: u, oddsDown: d };
                }
                return m;
              }));
            }, 1500);

            // Periodically advance live elapsed timers
            let nextElapsed = match.score.elapsed;
            if (nextElapsed.includes("'")) {
              const currentMin = parseInt(nextElapsed.replace("'", ''));
              if (currentMin < 90) {
                nextElapsed = `${currentMin + 1}'`;
              } else {
                nextElapsed = "FT";
              }
            }

            return {
              ...match,
              score: {
                ...match.score,
                elapsed: nextElapsed,
                home: Math.random() > 0.95 ? match.score.home + 1 : match.score.home,
                away: Math.random() > 0.97 ? match.score.away + 1 : match.score.away
              },
              odds: {
                ...match.odds,
                [keyToChange]: newVal
              },
              oddsUp: nextOddsUp,
              oddsDown: nextOddsDown
            };
          }
          return match;
        })
      );
    }, 4000);

    return () => {
      if (ws) ws.close();
      clearInterval(simInterval);
    };
  }, [wsUrl]);

  // Clock running effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter datasets based on Search
  const filteredMatches = useMemo(() => {
    return matches.filter(m => 
      m.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sport.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matches, searchQuery]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const filteredLiveBets = useMemo(() => {
    return liveBets.filter(b => 
      b.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.match.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [liveBets, searchQuery]);

  // Action handlers
  const handleApproveTransaction = (trxId) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === trxId) {
        // Find user to adjust balance
        const targetUser = users.find(u => u.id === t.user);
        if (targetUser) {
          setUsers(ul => ul.map(u => {
            if (u.id === t.user) {
              const modifier = t.type === 'Deposit' ? t.amount : -t.amount;
              return { ...u, balance: Math.max(0, u.balance + modifier) };
            }
            return u;
          }));
        }
        return { ...t, status: 'Approved' };
      }
      return t;
    }));
  };

  const handleRejectTransaction = (trxId) => {
    setTransactions(prev => prev.map(t => t.id === trxId ? { ...t, status: 'Rejected' } : t));
  };

  const handleDeleteMatch = (matchId) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const handleSettleBet = (betId, outcome) => {
    setLiveBets(prev => prev.filter(b => b.id !== betId));
    // Simulate transaction for settlement
    const bet = liveBets.find(b => b.id === betId);
    if (bet && outcome === 'Won') {
      const trxId = `#TRX${Math.floor(1000 + Math.random() * 9000)}`;
      setTransactions(prev => [
        { id: trxId, user: bet.user, type: 'Deposit', amount: bet.possibleWin, method: 'Winnings Settle', status: 'Approved', time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...prev
      ]);
      setUsers(ul => ul.map(u => u.id === bet.user ? { ...u, balance: u.balance + bet.possibleWin } : u));
    }
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUserForm.id || !newUserForm.email) return;
    setUsers(prev => [
      ...prev,
      {
        id: newUserForm.id,
        email: newUserForm.email,
        role: newUserForm.role,
        balance: parseFloat(newUserForm.balance),
        joined: new Date().toISOString().split('T')[0]
      }
    ]);
    setNewUserForm({ id: '', email: '', role: 'Player', balance: 100 });
    setModals(m => ({ ...m, user: false }));
  };

  const handleAddMatch = (e) => {
    e.preventDefault();
    if (!newMatchForm.home || !newMatchForm.away) return;
    const matchId = `sr:match:${100 + matches.length + 1}`;
    setMatches(prev => [
      ...prev,
      {
        id: matchId,
        sport: newMatchForm.sport,
        homeTeam: newMatchForm.home,
        awayTeam: newMatchForm.away,
        status: 'Upcoming',
        startTime: newMatchForm.date,
        odds: { '1': parseFloat(newMatchForm.odds1), 'X': parseFloat(newMatchForm.oddsX), '2': parseFloat(newMatchForm.odds2) },
        oddsUp: {},
        oddsDown: {}
      }
    ]);
    setNewMatchForm({ home: '', away: '', sport: 'Football', date: 'Today, 22:00', odds1: 1.9, oddsX: 3.2, odds2: 3.1 });
    setModals(m => ({ ...m, match: false }));
  };

  const handleDepositRequest = (e) => {
    e.preventDefault();
    const trxId = `#TRX${Math.floor(1000 + Math.random() * 9000)}`;
    setTransactions(prev => [
      { id: trxId, user: newDepositForm.user, type: 'Deposit', amount: parseFloat(newDepositForm.amount), method: newDepositForm.method, status: 'Pending', time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev
    ]);
    setModals(m => ({ ...m, deposit: false }));
  };

  const handleWithdrawRequest = (e) => {
    e.preventDefault();
    const trxId = `#TRX${Math.floor(1000 + Math.random() * 9000)}`;
    setTransactions(prev => [
      { id: trxId, user: newWithdrawForm.user, type: 'Withdrawal', amount: parseFloat(newWithdrawForm.amount), method: newWithdrawForm.method, status: 'Pending', time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev
    ]);
    setModals(m => ({ ...m, withdrawal: false }));
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans antialiased flex">
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#111625]/95 border-r border-slate-800 w-64 transition-transform duration-300 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col justify-between`}
      >
        <div className="flex-1 overflow-y-auto py-5 px-4 scrollbar-thin">
          {/* Brand Identity Header */}
          <div className="flex items-center gap-3 px-3 mb-8 cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#EAB308] to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              SO
            </div>
            <div>
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                SHEBA<span className="text-amber-400">ODDS</span>
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest leading-none">Admin Panel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'users' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Users</span>
            </button>

            <button 
              onClick={() => setActiveTab('matches')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'matches' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Trophy className="h-4.5 w-4.5" />
              <span>Matches & Odds</span>
            </button>

            <button 
              onClick={() => setActiveTab('bets')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'bets' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Receipt className="h-4.5 w-4.5" />
              <span>Bet Management</span>
            </button>

            {/* Collapsible Finance Section */}
            <div>
              <button 
                onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <Landmark className="h-4.5 w-4.5" />
                  <span>Finance</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transform transition-transform ${isFinanceExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isFinanceExpanded && (
                <div className="pl-11 mt-1 space-y-1">
                  <button 
                    onClick={() => setActiveTab('deposits')}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'deposits' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Deposits
                  </button>
                  <button 
                    onClick={() => setActiveTab('withdrawals')}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'withdrawals' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Withdrawals
                  </button>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'transactions' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Transactions
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'reports' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <FileBarChart2 className="h-4.5 w-4.5" />
              <span>Reports</span>
            </button>

            <button 
              onClick={() => setActiveTab('bonuses')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'bonuses' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Gift className="h-4.5 w-4.5" />
              <span>Bonus Management</span>
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'settings' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              <span>System Settings</span>
            </button>

            <button 
              onClick={() => setActiveTab('admins')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'admins' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ShieldAlert className="h-4.5 w-4.5" />
              <span>Admin Management</span>
            </button>

            <button 
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'logs' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <FileText className="h-4.5 w-4.5" />
              <span>Logs & Activity</span>
            </button>

            <button 
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'support' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-400 text-amber-300 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Mail className="h-4.5 w-4.5" />
              <span>Support Messages</span>
            </button>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0F1321] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-400">
              SA
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">Super Admin</p>
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
          </div>
          <button 
            onClick={() => alert('Administrative settings profile launched.')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* --- MAIN PAGE WRAPPER --- */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        
        {/* --- TOP HEADER --- */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#111625]/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Mobile menu and Search Bar */}
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Activity className="h-5 w-5" />
            </button>

            {/* Global Search */}
            <div className="relative w-full max-w-md hidden sm:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, matches, transactions..."
                className="w-full bg-[#090D16] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            {/* Running Digital Clock */}
            <div className="hidden md:flex items-center gap-3.5 text-slate-400 text-xs font-bold bg-[#151C2E] px-3.5 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <span className="text-slate-500">|</span>
              <span className="font-mono text-amber-300 font-extrabold">{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Notification triggers */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 bg-[#151C2E] hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all relative"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-[9px] font-black text-white rounded-full flex items-center justify-center animate-bounce">
                  8
                </span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-[#111625] border border-slate-800 rounded-xl shadow-2xl p-4 space-y-3 z-50">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-extrabold text-white">System Notifications</span>
                    <button onClick={() => setIsNotificationsOpen(false)} className="text-xs text-amber-400 hover:underline">Mark all read</button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2 bg-[#1C1F2E] rounded-lg border border-slate-800/50">
                      <p className="font-semibold text-amber-300">New Deposit Request</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">User1234 initiated 5,000.00 ETB deposit via TeleBirr.</p>
                    </div>
                    <div className="p-2 bg-[#1C1F2E] rounded-lg border border-slate-800/50">
                      <p className="font-semibold text-rose-400">Large Withdrawal Alert</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">User5678 requested a 12,500.00 ETB payout.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 bg-[#151C2E] border border-slate-800 p-1.5 pr-3.5 rounded-xl text-left hover:border-slate-700 transition-colors"
              >
                <div className="h-7.5 w-7.5 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs">
                  SA
                </div>
                <div className="hidden sm:block">
                  <p className="text-[11px] font-bold text-white leading-none">Super Admin</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Administrator</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2.5 w-48 bg-[#111625] border border-slate-800 rounded-xl shadow-2xl p-2.5 z-50 text-xs">
                  <a href="#profile" className="block px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg hover:text-white transition-colors">My Profile</a>
                  <a href="#logs" className="block px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg hover:text-white transition-colors">Activity Logs</a>
                  <hr className="border-slate-800 my-1.5" />
                  <button onClick={() => alert('Log out successfully.')} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-semibold">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- MAIN WORKSPACE GRID --- */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* SEARCH BAR (Mobile Viewports Only) */}
          <div className="relative w-full sm:hidden">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, match, odds..."
              className="w-full bg-[#111625] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* DYNAMIC VIEW SWITCHING */}

          {activeTab === 'dashboard' && (
            <>
              {/* --- 1. STATISTICS CAPSULES PANEL --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Total Users card */}
                <div className="bg-[#111625] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Users</span>
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black font-mono text-white leading-none">
                      {stats.users.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-green-400 mt-2">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+5.4% <span className="text-slate-500 font-medium">from yesterday</span></span>
                    </div>
                  </div>
                  {/* Miniature Trend Line Spark */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40">
                    <svg viewBox="0 0 100 30" className="w-full h-full text-blue-400" preserveAspectRatio="none">
                      <path d="M0 25 Q15 20, 30 10 T60 18 T90 5 T100 2" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Total Balance card */}
                <div className="bg-[#111625] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Balance</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                      <Wallet className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black font-mono text-emerald-400 leading-none">
                      {stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[11px] font-sans font-medium text-slate-400">ETB</span>
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-green-400 mt-2">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+8.7% <span className="text-slate-500 font-medium">from yesterday</span></span>
                    </div>
                  </div>
                  {/* Miniature Trend Line Spark */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40">
                    <svg viewBox="0 0 100 30" className="w-full h-full text-emerald-400" preserveAspectRatio="none">
                      <path d="M0 20 Q15 15, 30 25 T60 10 T90 5 T100 1" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Total Bets Today card */}
                <div className="bg-[#111625] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Bets Today</span>
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                      <Trophy className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black font-mono text-white leading-none">
                      {stats.betsToday.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-green-400 mt-2">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+12.5% <span className="text-slate-500 font-medium">from yesterday</span></span>
                    </div>
                  </div>
                  {/* Miniature Trend Line Spark */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40">
                    <svg viewBox="0 0 100 30" className="w-full h-full text-purple-400" preserveAspectRatio="none">
                      <path d="M0 28 Q15 25, 30 18 T60 22 T90 8 T100 2" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Total Deposits card */}
                <div className="bg-[#111625] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Deposits</span>
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                      <ArrowUpRight className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black font-mono text-white leading-none">
                      {stats.deposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[11px] font-sans font-medium text-slate-400">ETB</span>
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-green-400 mt-2">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+7.2% <span className="text-slate-500 font-medium">from yesterday</span></span>
                    </div>
                  </div>
                  {/* Miniature Trend Line Spark */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40">
                    <svg viewBox="0 0 100 30" className="w-full h-full text-amber-400" preserveAspectRatio="none">
                      <path d="M0 25 Q15 22, 30 15 T60 18 T90 5 T100 1" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Total Withdrawals card */}
                <div className="bg-[#111625] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Withdrawals</span>
                    <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                      <ArrowDownRight className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black font-mono text-white leading-none">
                      {stats.withdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[11px] font-sans font-medium text-slate-400">ETB</span>
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 mt-2">
                      <ArrowDownRight className="h-3 w-3" />
                      <span>-3.1% <span className="text-slate-500 font-medium">from yesterday</span></span>
                    </div>
                  </div>
                  {/* Miniature Trend Line Spark */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40">
                    <svg viewBox="0 0 100 30" className="w-full h-full text-rose-400" preserveAspectRatio="none">
                      <path d="M0 5 Q15 10, 30 18 T60 15 T90 22 T100 25" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* --- 2. GRID SPLIT CONTENT AREA --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- LEFT HAND PANELS (Tables) --- */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* --- LIVE BETS CONTAINER CARD --- */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 bg-[#151C2E] border-b border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Live Bets Today</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('bets')}
                        className="text-[11px] text-amber-400 hover:underline font-bold"
                      >
                        View All Bets
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="p-3.5 pl-4">ID</th>
                            <th className="p-3.5">User</th>
                            <th className="p-3.5">Match</th>
                            <th className="p-3.5">Market</th>
                            <th className="p-3.5">Pick</th>
                            <th className="p-3.5">Odds</th>
                            <th className="p-3.5">Stake</th>
                            <th className="p-3.5">Payout</th>
                            <th className="p-3.5 text-right pr-4">Resolve</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {filteredLiveBets.slice(0, 5).map((bet) => (
                            <tr key={bet.id} className="hover:bg-slate-800/25 transition-colors">
                              <td className="p-3.5 pl-4 font-mono font-bold text-slate-400">{bet.id}</td>
                              <td className="p-3.5 font-bold text-white">{bet.user}</td>
                              <td className="p-3.5 text-slate-300">{bet.match}</td>
                              <td className="p-3.5 text-slate-400">{bet.market}</td>
                              <td className="p-3.5 font-mono text-amber-400 font-bold">{bet.pick}</td>
                              <td className="p-3.5 font-mono text-slate-300 font-bold">{bet.odds.toFixed(2)}</td>
                              <td className="p-3.5 font-mono font-bold text-emerald-400">{bet.stake.toLocaleString()}</td>
                              <td className="p-3.5 font-mono font-bold text-white">{bet.possibleWin.toLocaleString()}</td>
                              <td className="p-3.5 text-right pr-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleSettleBet(bet.id, 'Won')}
                                    className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-md border border-emerald-500/20 transition-all"
                                    title="Settle as Won"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleSettleBet(bet.id, 'Lost')}
                                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-md border border-rose-500/20 transition-all"
                                    title="Settle as Lost"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* --- UPCOMING MATCHS SCHEDULER CARD --- */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 bg-[#151C2E] border-b border-slate-800 flex justify-between items-center">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Fixture scheduler & Live odds</h3>
                      <button 
                        onClick={() => setModals(m => ({ ...m, match: true }))}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add New Match</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="p-3.5 pl-4">Kickoff / Sport</th>
                            <th className="p-3.5">Fixture</th>
                            <th className="p-3.5 font-mono text-center">Home (1)</th>
                            <th className="p-3.5 font-mono text-center">Draw (X)</th>
                            <th className="p-3.5 font-mono text-center">Away (2)</th>
                            <th className="p-3.5 text-center">State</th>
                            <th className="p-3.5 text-right pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {filteredMatches.map((match) => (
                            <tr key={match.id} className="hover:bg-slate-800/25 transition-colors">
                              <td className="p-3.5 pl-4">
                                <span className="block font-bold text-white">{match.startTime}</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">{match.sport}</span>
                              </td>
                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-sm">{match.homeTeam}</span>
                                  <span className="text-slate-500">vs</span>
                                  <span className="font-bold text-white text-sm">{match.awayTeam}</span>
                                  {match.status === 'Live' && (
                                    <span className="ml-1.5 font-mono text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                      {match.score.home} - {match.score.away} ({match.score.elapsed})
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Outcomes with Live flashes */}
                              {['1', 'X', '2'].map((outcome) => {
                                const price = match.odds?.[outcome];
                                const isUp = match.oddsUp?.[outcome];
                                const isDown = match.oddsDown?.[outcome];
                                return (
                                  <td key={outcome} className="p-3.5 text-center">
                                    <span className={`inline-block px-2.5 py-1 rounded font-mono font-bold text-xs transition-all duration-300 ${
                                      isUp ? 'bg-green-950/80 text-green-400 border border-green-500/30' :
                                      isDown ? 'bg-red-950/80 text-red-400 border border-red-500/30' :
                                      'bg-[#090D16] text-slate-300 border border-slate-800'
                                    }`}>
                                      {price ? price.toFixed(2) : '🔒'}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="p-3.5 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  match.status === 'Live' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {match.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-right pr-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                    <Lock className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMatch(match.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* --- RIGHT HAND PANELS (Overview & Actions) --- */}
                <div className="space-y-6">
                  
                  {/* --- RECENT FINANCIAL TRANSACTIONS PANEL --- */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 bg-[#151C2E] border-b border-slate-800 flex justify-between items-center">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Recent Ledger Events</h3>
                      <button 
                        onClick={() => setActiveTab('transactions')}
                        className="text-[11px] text-amber-400 hover:underline font-bold"
                      >
                        View All
                      </button>
                    </div>

                    <div className="p-2 space-y-2">
                      {filteredTransactions.map((trx) => (
                        <div key={trx.id} className="flex items-center justify-between p-3 bg-[#151C2E]/40 border border-slate-800/60 rounded-xl hover:border-slate-700/80 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${
                              trx.type === 'Deposit' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {trx.type === 'Deposit' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{trx.user}</span>
                                <span className="text-[10px] text-slate-500">•</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{trx.method}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{trx.id} ({trx.time})</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`block font-mono font-black text-xs ${
                              trx.type === 'Deposit' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {trx.type === 'Deposit' ? '+' : '-'}{trx.amount.toLocaleString()}.00 ETB
                            </span>
                            
                            {/* Actions or Status label */}
                            {trx.status === 'Pending' ? (
                              <div className="flex gap-1.5 items-center justify-end mt-1">
                                <button 
                                  onClick={() => handleApproveTransaction(trx.id)}
                                  className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold rounded text-[9px] transition-all border border-emerald-500/30"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectTransaction(trx.id)}
                                  className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold rounded text-[9px] transition-all border border-rose-500/30"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${
                                trx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {trx.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* --- COMPREHENSIVE OVERVIEW RING CHART PANEL --- */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-4">Bookmaking Overview</h3>
                    
                    <div className="flex items-center justify-center gap-6">
                      {/* Interactive Ring visual drawn purely in inline CSS/SVG */}
                      <div className="relative h-28 w-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {/* Circle Background */}
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#1E293B" strokeWidth="3" />
                          
                          {/* Segment 1: Won Bets (Green) - 33.3% */}
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#10B981" strokeWidth="3.5" 
                            strokeDasharray="33.3 100" strokeDashoffset="0" strokeLinecap="round" 
                          />
                          
                          {/* Segment 2: Lost Bets (Red) - 55.6% */}
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#EF4444" strokeWidth="3.5" 
                            strokeDasharray="55.6 100" strokeDashoffset="-33.3" strokeLinecap="round" 
                          />

                          {/* Segment 3: Pending Bets (Yellow) - 11.1% */}
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#F59E0B" strokeWidth="3.5" 
                            strokeDasharray="11.1 100" strokeDashoffset="-88.9" strokeLinecap="round" 
                          />
                        </svg>
                        <div className="absolute text-center">
                          <p className="text-[9px] font-bold uppercase text-slate-500 leading-none">Total Bets</p>
                          <p className="text-lg font-black font-mono text-white mt-1 leading-none">{stats.betsToday.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Legend details */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#10B981]" />
                          <div>
                            <span className="font-bold text-white block leading-none">Won Bets</span>
                            <span className="text-[10px] text-slate-400 font-medium">33.3% (2,856)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#EF4444]" />
                          <div>
                            <span className="font-bold text-white block leading-none">Lost Bets</span>
                            <span className="text-[10px] text-slate-400 font-medium">55.6% (4,756)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#F59E0B]" />
                          <div>
                            <span className="font-bold text-white block leading-none">Pending Bets</span>
                            <span className="text-[10px] text-slate-400 font-medium">11.1% (952)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 mt-5 pt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#151C2E]/50 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Net Profit</span>
                        <span className="text-sm font-black font-mono text-emerald-400 mt-1 block">
                          {stats.profitToday.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB
                        </span>
                      </div>
                      <div className="p-3 bg-[#151C2E]/50 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Book Profit</span>
                        <span className="text-sm font-black font-mono text-emerald-400 mt-1 block">
                          {stats.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* --- QUICK ACTION CENTER PANEL --- */}
                  <div className="bg-[#111625] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2.5">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-3 pl-1">Quick Actions Panel</h3>
                    
                    <button 
                      onClick={() => setModals(m => ({ ...m, user: true }))}
                      className="w-full bg-[#1E293B] hover:bg-[#334155] border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-blue-400" />
                        <span>Add New User Profile</span>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-slate-500" />
                    </button>

                    <button 
                      onClick={() => setModals(m => ({ ...m, match: true }))}
                      className="w-full bg-[#1E293B] hover:bg-[#334155] border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="h-4 w-4 text-amber-400" />
                        <span>Schedule Football Fixture</span>
                      </div>
                      <Plus className="h-3.5 w-3.5 text-slate-500" />
                    </button>

                    <button 
                      onClick={() => setModals(m => ({ ...m, deposit: true }))}
                      className="w-full bg-[#1E293B] hover:bg-[#334155] border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all relative"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                        <span>Initialize Deposit Request</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black">12</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                    </button>

                    <button 
                      onClick={() => setModals(m => ({ ...m, withdrawal: true }))}
                      className="w-full bg-[#1E293B] hover:bg-[#334155] border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowDownRight className="h-4 w-4 text-rose-400" />
                        <span>Initialize Withdrawal Request</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-black">7</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="w-full bg-[#1E293B] hover:bg-[#334155] border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Open Panel System Settings</span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    </button>

                  </div>

                </div>

              </div>
            </>
          )}

          {/* --- VIEW: USERS MANAGEMENT --- */}
          {activeTab === 'users' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-[#151C2E] border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Registered Users Profile Registry</h3>
                <button 
                  onClick={() => setModals(m => ({ ...m, user: true }))}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  Create User
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-4 pl-6">ID</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4 font-mono">Balance</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="p-4 pl-6 font-bold text-white">{user.id}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${
                            user.role === 'Agent' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-400">{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</td>
                        <td className="p-4 text-slate-400">{user.joined}</td>
                        <td className="p-4 text-right pr-6">
                          <button onClick={() => alert(`Reviewing user credentials for ${user.id}`)} className="text-xs text-amber-400 hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- VIEW: MATCHES MANAGEMENT --- */}
          {activeTab === 'matches' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">Full Match Odds Matrices</h3>
                <button 
                  onClick={() => setModals(m => ({ ...m, match: true }))}
                  className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  Create Match
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map(m => (
                  <div key={m.id} className="bg-[#151C2E]/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-400 font-bold">{m.sport}</span>
                      <span className="text-slate-500">{m.startTime}</span>
                    </div>
                    <div className="text-center font-bold text-base py-2">
                      {m.homeTeam} vs {m.awayTeam}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#090D16] border border-slate-800 p-2 rounded text-center">
                        <span className="text-[10px] text-slate-500 block">Home (1)</span>
                        <span className="font-mono font-bold text-white text-xs">{m.odds['1'].toFixed(2)}</span>
                      </div>
                      <div className="bg-[#090D16] border border-slate-800 p-2 rounded text-center">
                        <span className="text-[10px] text-slate-500 block">Draw (X)</span>
                        <span className="font-mono font-bold text-white text-xs">{m.odds['X'].toFixed(2)}</span>
                      </div>
                      <div className="bg-[#090D16] border border-slate-800 p-2 rounded text-center">
                        <span className="text-[10px] text-slate-500 block">Away (2)</span>
                        <span className="font-mono font-bold text-white text-xs">{m.odds['2'].toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- VIEW: DEPOSITS & WITHDRAWALS LISTS --- */}
          {(activeTab === 'deposits' || activeTab === 'withdrawals' || activeTab === 'transactions') && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-[#151C2E] border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white">
                  {activeTab === 'deposits' ? 'Deposits Audit Ledger' : activeTab === 'withdrawals' ? 'Withdrawals Audit Ledger' : 'Global Financial Ledger'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-4 pl-6">Tx ID</th>
                      <th className="p-4">User Identity</th>
                      <th className="p-4">Transaction Class</th>
                      <th className="p-4">Payment Node</th>
                      <th className="p-4 font-mono">Ledger Value</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4 text-right pr-6">Status State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {filteredTransactions
                      .filter(t => activeTab === 'transactions' || (activeTab === 'deposits' && t.type === 'Deposit') || (activeTab === 'withdrawals' && t.type === 'Withdrawal'))
                      .map(trx => (
                        <tr key={trx.id} className="hover:bg-slate-800/25 transition-colors">
                          <td className="p-4 pl-6 font-mono font-bold text-slate-400">{trx.id}</td>
                          <td className="p-4 font-bold text-white">{trx.user}</td>
                          <td className="p-4">{trx.type}</td>
                          <td className="p-4 font-semibold text-slate-400">{trx.method}</td>
                          <td className="p-4 font-mono font-bold text-white">{trx.amount.toLocaleString()} ETB</td>
                          <td className="p-4 text-slate-500">{trx.time}</td>
                          <td className="p-4 text-right pr-6">
                            {trx.status === 'Pending' ? (
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => handleApproveTransaction(trx.id)} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Approve</button>
                                <button onClick={() => handleRejectTransaction(trx.id)} className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-1 rounded">Reject</button>
                              </div>
                            ) : (
                              <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${
                                trx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>{trx.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- OTHER COMPLETED VIEW BLOCKS (Reports, Bonuses, Settings, etc.) --- */}
          {activeTab === 'reports' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
              <FileBarChart2 className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white mb-2">Automated Bookmaker Reports & Visualizations</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">Aggregate profit schedules, commission matrices, and regional tax withholdings dynamically.</p>
              <button onClick={() => alert('Generating PDF statement...')} className="bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all">Download Quarterly Reports</button>
            </div>
          )}

          {activeTab === 'bonuses' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
              <Gift className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white mb-2">Promotional & Welcome Bonus Configurations</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">Create promotional multipliers, deposit match codes, and configure the signup matching credit system rules.</p>
              <button onClick={() => alert('Bonus engine updated.')} className="bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all">Configure Matching Scheme</button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-white">System Risk & Economic Settings</h3>
                <p className="text-xs text-slate-400 mt-1">Directly adjust core platform parameters bound to environmental database instances.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 block uppercase">Statutory Tax Rate (%)</label>
                  <input 
                    type="number" 
                    value={systemSettings.taxRate} 
                    onChange={(e) => setSystemSettings({ ...systemSettings, taxRate: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#090D16] border border-slate-800 rounded-xl py-3 px-4 font-mono font-bold text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 block uppercase">Sign-Up Matching Bonus (ETB)</label>
                  <input 
                    type="number" 
                    value={systemSettings.welcomeBonus} 
                    onChange={(e) => setSystemSettings({ ...systemSettings, welcomeBonus: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#090D16] border border-slate-800 rounded-xl py-3 px-4 font-mono font-bold text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 block uppercase">Min Bet Limit per Slip (ETB)</label>
                  <input 
                    type="number" 
                    value={systemSettings.minBet} 
                    onChange={(e) => setSystemSettings({ ...systemSettings, minBet: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#090D16] border border-slate-800 rounded-xl py-3 px-4 font-mono font-bold text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 block uppercase">Max Bet Ceiling limit (ETB)</label>
                  <input 
                    type="number" 
                    value={systemSettings.maxBet} 
                    onChange={(e) => setSystemSettings({ ...systemSettings, maxBet: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#090D16] border border-slate-800 rounded-xl py-3 px-4 font-mono font-bold text-white text-sm"
                  />
                </div>
              </div>

              <button 
                onClick={() => alert('Platform settings configuration locked.')}
                className="bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                Save Core Configuration
              </button>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
              <ShieldAlert className="h-12 w-12 text-rose-400 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white mb-2">Platform Administration & RBAC Guards</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">Inspect admin identities, allocate roles, reset hardware cryptographic identifiers, and suspend sub-admin authorization blocks.</p>
              <button onClick={() => alert('Admin registry launched.')} className="bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all">Manage Credentials</button>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-4">Audit Logs Trail Registry</h3>
              <div className="space-y-2.5 font-mono text-[11px] text-slate-400">
                <div className="p-3 bg-[#090D16] border border-slate-800 rounded-lg flex justify-between">
                  <span>[2025-05-15 10:42:10] SUPER_ADMIN: Approved transaction #TRX9852 (5,000.00 ETB) for User1234</span>
                  <span className="text-emerald-400">SUCCESS</span>
                </div>
                <div className="p-3 bg-[#090D16] border border-slate-800 rounded-lg flex justify-between">
                  <span>[2025-05-15 10:30:45] SYSTEM: Inbound Telebirr API callback matching payment ID tele_9824_104</span>
                  <span className="text-emerald-400">SUCCESS</span>
                </div>
                <div className="p-3 bg-[#090D16] border border-slate-800 rounded-lg flex justify-between">
                  <span>[2025-05-15 10:15:33] SYSTEM: User8765 withdrawal failed: Insufficient cash balance ledger holdings</span>
                  <span className="text-rose-400">FAILED</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="bg-[#111625] border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
              <Mail className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white mb-2">Unified Player Support Desk</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">Communicate in real time with clients and manage tickets related to disputed sports outcomes or TeleBirr transactions.</p>
              <button onClick={() => alert('Support portal loading...')} className="bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all">Launch Live Agent Chat</button>
            </div>
          )}

        </main>
      </div>

      {/* --- MODALS CENTER ARCHITECTURE (GORGEOUS FORMS) --- */}

      {/* 1. Modal: Add User */}
      {modals.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setModals(m => ({ ...m, user: false }))} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">Add New User Profile</h3>
            
            <form onSubmit={handleAddUser} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">User Identity Tag (e.g. User9924)</label>
                <input 
                  type="text" 
                  value={newUserForm.id} 
                  onChange={(e) => setNewUserForm({ ...newUserForm, id: e.target.value })}
                  placeholder="User8420"
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Email Address</label>
                <input 
                  type="email" 
                  value={newUserForm.email} 
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="email@domain.com"
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase">Role Type</label>
                  <select 
                    value={newUserForm.role} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full bg-[#090D16] border border-slate-800 p-3 rounded-xl focus:outline-none focus:border-amber-500 text-white"
                  >
                    <option value="Player">Player</option>
                    <option value="Agent">Agent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase">Initial Credit (ETB)</label>
                  <input 
                    type="number" 
                    value={newUserForm.balance} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, balance: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white font-mono"
                  />
                </div>
              </div>
              <button className="w-full bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all uppercase tracking-wider mt-4">Create Account</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Add Match */}
      {modals.match && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setModals(m => ({ ...m, match: false }))} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">Schedule Sports Fixture</h3>
            
            <form onSubmit={handleAddMatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase">Home Team</label>
                  <input 
                    type="text" 
                    value={newMatchForm.home} 
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, home: e.target.value })}
                    placeholder="Arsenal"
                    className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase">Away Team</label>
                  <input 
                    type="text" 
                    value={newMatchForm.away} 
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, away: e.target.value })}
                    placeholder="Chelsea"
                    className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Sport Discipline</label>
                <select 
                  value={newMatchForm.sport} 
                  onChange={(e) => setNewMatchForm({ ...newMatchForm, sport: e.target.value })}
                  className="w-full bg-[#090D16] border border-slate-800 p-3 rounded-xl focus:outline-none focus:border-amber-500 text-white"
                >
                  <option value="Football">⚽ Football</option>
                  <option value="Basketball">🏀 Basketball</option>
                  <option value="Tennis">🎾 Tennis</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Kickoff Date & Time</label>
                <input 
                  type="text" 
                  value={newMatchForm.date} 
                  onChange={(e) => setNewMatchForm({ ...newMatchForm, date: e.target.value })}
                  placeholder="Today, 22:30"
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Odds (1)</label>
                  <input type="number" step="0.01" value={newMatchForm.odds1} onChange={(e) => setNewMatchForm({ ...newMatchForm, odds1: parseFloat(e.target.value) || 1.1 })} className="w-full bg-[#090D16] border border-slate-800 p-2 rounded text-white text-center font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Odds (X)</label>
                  <input type="number" step="0.01" value={newMatchForm.oddsX} onChange={(e) => setNewMatchForm({ ...newMatchForm, oddsX: parseFloat(e.target.value) || 1.1 })} className="w-full bg-[#090D16] border border-slate-800 p-2 rounded text-white text-center font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Odds (2)</label>
                  <input type="number" step="0.01" value={newMatchForm.odds2} onChange={(e) => setNewMatchForm({ ...newMatchForm, odds2: parseFloat(e.target.value) || 1.1 })} className="w-full bg-[#090D16] border border-slate-800 p-2 rounded text-white text-center font-mono" />
                </div>
              </div>
              <button className="w-full bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all uppercase tracking-wider mt-4">Lock & Create Fixture</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Deposit */}
      {modals.deposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setModals(m => ({ ...m, deposit: false }))} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">Initialize Deposit request</h3>
            
            <form onSubmit={handleDepositRequest} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Target User Account</label>
                <select 
                  value={newDepositForm.user} 
                  onChange={(e) => setNewDepositForm({ ...newDepositForm, user: e.target.value })}
                  className="w-full bg-[#090D16] border border-slate-800 p-3 rounded-xl text-white"
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.id}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Value (ETB)</label>
                <input 
                  type="number" 
                  value={newDepositForm.amount} 
                  onChange={(e) => setNewDepositForm({ ...newDepositForm, amount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Payment Channel</label>
                <select 
                  value={newDepositForm.method} 
                  onChange={(e) => setNewDepositForm({ ...newDepositForm, method: e.target.value })}
                  className="w-full bg-[#090D16] border border-slate-800 p-3 rounded-xl text-white font-bold"
                >
                  <option value="TeleBirr">📲 TeleBirr</option>
                  <option value="CBE Birr">🏦 Commercial Bank (CBE Birr)</option>
                  <option value="Chapa">💳 Chapa payment gateway</option>
                </select>
              </div>
              <button className="w-full bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all uppercase tracking-wider mt-4">Confirm Request</button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Withdrawal */}
      {modals.withdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-[#111625] border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setModals(m => ({ ...m, withdrawal: false }))} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">Initialize Withdrawal request</h3>
            
            <form onSubmit={handleWithdrawRequest} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Target User Account</label>
                <select 
                  value={newWithdrawForm.user} 
                  onChange={(e) => setNewWithdrawForm({ ...newWithdrawForm, user: e.target.value })}
                  className="w-full bg-[#090D16] border border-slate-800 p-3 rounded-xl text-white"
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.id}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Value (ETB)</label>
                <input 
                  type="number" 
                  value={newWithdrawForm.amount} 
                  onChange={(e) => setNewWithdrawForm({ ...newWithdrawForm, amount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#090D16] border border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl p-3 text-white font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase">Payout Channel</label>
                <select 
                  value={newWithdrawForm.method} 
                  onChange={(e) => setNewWithdrawForm({ ...newWithdrawForm, method: e.target.value })}
                  className="w-full bg-[#090D16] border border-slate-800 p-3 rounded-xl text-white font-bold"
                >
                  <option value="TeleBirr">📲 TeleBirr</option>
                  <option value="CBE Birr">🏦 CBE Birr payouts</option>
                </select>
              </div>
              <button className="w-full bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all uppercase tracking-wider mt-4">Confirm Request</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
