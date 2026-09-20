// ============================================
// SHEBAODDS - CASINO GAMES PAGE
// ============================================
// IMPORTANT (read before wiring this up further):
// Every game below is a UI SHELL ONLY. Clicking "Play Demo" opens a self-contained,
// clearly-labeled simulation using local component state — no server call, no wallet
// mutation, no real-money logic anywhere in this file.
//
// To turn any of these into a real-money game, each card's `provider` field is where
// a licensed game-provider integration (e.g. an aggregator like Evolution, Pragmatic
// Play, EveryMatrix, etc., accessed only through their official partner/licensing
// process) would be wired in: the provider's game-launch API would replace
// `openDemo(game)`, and real bets would flow through the existing authenticated
// wallet endpoints in walletRoutes.ts — never through this component directly.
// ============================================

import React, { useMemo, useState } from 'react';
import { useTranslation } from './LanguageContext';

const CATEGORIES = ['All', 'Slots', 'Table Games', 'Live Casino', 'Crash & Instant', 'Jackpot'];

// 60 demo game shells. `provider: null` marks every game as not yet connected to
// a real game-provider — this is intentional and should stay null until a licensed
// integration exists.
function buildGameCatalog() {
  const slots = [
    'Golden Crown', 'Sheba Riches', 'Lion of Judah', 'Sunrise Safari', 'Coffee Gold',
    'Queen of the Nile', 'Diamond Cascade', 'Wild Savanna', 'Royal Jackpot 7s', 'Emerald Falls',
    'Fortune Drums', 'Habesha Fire', 'Blue Nile Bonanza', 'Mystic Pyramids', 'Firebird Spins',
    'Treasure Caravan', 'Star of Axum', 'Candy Cascade', 'Book of Legends', 'Wolf Moon Deluxe',
  ];
  const table = [
    'European Roulette', 'American Roulette', 'Blackjack Classic', 'Blackjack Gold',
    'Baccarat Prestige', 'Texas Hold\'em Poker', 'Three Card Poker', 'Casino War',
    'Sic Bo', 'Craps Table',
  ];
  const live = [
    'Live Roulette', 'Live Blackjack', 'Live Baccarat', 'Live Dream Catcher',
    'Live Monopoly', 'Live Game Show', 'Live Andar Bahar', 'Live Teen Patti',
    'Live Poker Table', 'Live Lightning Roulette',
  ];
  const crash = [
    'Sheba Crash', 'Rocket Multiplier', 'Aviator Style', 'Mines Field', 'Plinko Drop',
    'Dice Duel', 'Keno Rush', 'Hi-Lo Cards', 'Coin Flip Royale', 'Balloon Rise',
  ];
  const jackpot = [
    'Mega Sheba Jackpot', 'Progressive Gold Rush', 'Crown Millions', 'Daily Grand Jackpot',
    'Sheba Fortune Wheel', 'Empire Jackpot Slots', 'Lucky 7 Progressive', 'Jackpot Safari',
    'Golden Crown Mega Win', 'Ultimate Jackpot Reels',
  ];

  const make = (names, category, iconSeed) =>
    names.map((name, i) => ({
      id: `${category}-${i}`.toLowerCase().replace(/\s+/g, '-'),
      name,
      category,
      rtp: (94 + ((i * 7 + iconSeed) % 5) + Math.round(Math.random() * 0)).toFixed(1) + '%', // display-only, static demo value
      provider: null, // not yet connected to a real game-provider — see file header
      status: 'demo',
    }));

  return [
    ...make(slots, 'Slots', 1),
    ...make(table, 'Table Games', 2),
    ...make(live, 'Live Casino', 3),
    ...make(crash, 'Crash & Instant', 4),
    ...make(jackpot, 'Jackpot', 5),
  ];
}

const GAME_CATALOG = buildGameCatalog();

function categoryColor(category) {
  switch (category) {
    case 'Slots': return '#FFB300';
    case 'Table Games': return '#4CAF50';
    case 'Live Casino': return '#E53935';
    case 'Crash & Instant': return '#8E44AD';
    case 'Jackpot': return '#00BCD4';
    default: return '#888';
  }
}

export default function CasinoGamesPage() {
  const { t, language } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [demoGame, setDemoGame] = useState(null);

  const filtered = useMemo(() => {
    return GAME_CATALOG.filter((g) => {
      const matchesCategory = activeCategory === 'All' || g.category === activeCategory;
      const matchesQuery = g.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className="casino-games-page">
      <div className="casino-hero">
        <h1>{language === 'am' ? 'ካዚኖ' : 'Casino'}</h1>
        <p className="casino-hero-sub">
          {language === 'am'
            ? '60 የካዚኖ ጨዋታዎች — በአሁኑ ጊዜ ማሳያ ናቸው (እውነተኛ ገንዘብ አይሳተፍም)።'
            : '60 casino games — currently demo mode only. No real money is involved yet.'}
        </p>
        <span className="demo-banner">
          {language === 'am' ? 'ማሳያ ሁነታ — እውነተኛ ገንዘብ የለም' : 'DEMO MODE — real-money play is not enabled'}
        </span>
      </div>

      <div className="casino-toolbar">
        <input
          type="text"
          className="casino-search"
          placeholder={language === 'am' ? 'ጨዋታ ፈልግ...' : 'Search games...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="casino-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`casino-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="casino-grid">
        {filtered.map((game) => (
          <div key={game.id} className="casino-card">
            <div className="casino-card-thumb" style={{ background: `linear-gradient(135deg, ${categoryColor(game.category)}33, #101010)` }}>
              <span className="casino-card-badge" style={{ borderColor: categoryColor(game.category), color: categoryColor(game.category) }}>
                {game.category}
              </span>
              <span className="casino-card-icon">🎰</span>
            </div>
            <div className="casino-card-body">
              <div className="casino-card-name">{game.name}</div>
              <div className="casino-card-meta">RTP {game.rtp} · {language === 'am' ? 'ማሳያ' : 'Demo'}</div>
              <button className="casino-card-play" onClick={() => setDemoGame(game)}>
                {language === 'am' ? 'ማሳያ ተጫወት' : 'Play Demo'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {demoGame && <DemoGameModal game={demoGame} onClose={() => setDemoGame(null)} language={language} />}
    </div>
  );
}

// Purely local, in-memory demo simulation. No API calls, no wallet reads/writes.
function DemoGameModal({ game, onClose, language }) {
  const [spins, setSpins] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const symbols = ['🍒', '🔔', '⭐', '👑', '7️⃣', '🍋'];

  const spin = () => {
    const reels = [0, 1, 2].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
    const win = reels[0] === reels[1] && reels[1] === reels[2];
    setLastResult({ reels, win });
    setSpins((s) => s + 1);
  };

  return (
    <div className="demo-modal-overlay" onClick={onClose}>
      <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="demo-modal-header">
          <h3>{game.name}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <p className="demo-modal-tag">
          {language === 'am'
            ? 'ይህ የማሳያ ስሪት ብቻ ነው። ምንም እውነተኛ ገንዘብ አልተያዘም ወይም አልተከፈለም።'
            : 'This is a local demo simulation only. No real money is wagered or paid out — nothing here touches your wallet.'}
        </p>
        <div className="demo-reels">
          {(lastResult?.reels || ['❔', '❔', '❔']).map((s, i) => (
            <div key={i} className="demo-reel">{s}</div>
          ))}
        </div>
        {lastResult && (
          <div className={`demo-result ${lastResult.win ? 'win' : 'lose'}`}>
            {lastResult.win
              ? (language === 'am' ? 'አሸንፈዋል! (ማሳያ ብቻ)' : 'You won! (demo only)')
              : (language === 'am' ? 'እንደገና ይሞክሩ (ማሳያ ብቻ)' : 'No match — try again (demo only)')}
          </div>
        )}
        <button className="demo-spin-btn" onClick={spin}>
          {language === 'am' ? 'አሽከርክር' : 'Spin'} ({spins})
        </button>
      </div>
    </div>
  );
}
