// ============================================
// SHEBAODDS - BRAND LOGO COMPONENT
// Renders the gold crown mark (+ optional wordmark)
// ============================================
import React from 'react';

// Compact crown-only mark, used in the sidebar header, footer, loading screen, favicon-esque spots
export function CrownMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size * (94 / 148)}
      viewBox="0 0 148 94"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SHEBAODDS crown"
      className={`crown-mark ${className}`}
    >
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE28A" />
          <stop offset="45%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#B8790C" />
        </linearGradient>
        <linearGradient id="bandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD873" />
          <stop offset="100%" stopColor="#E29B0E" />
        </linearGradient>
      </defs>
      <path
        d="M0 40 L0 78 Q74 92 148 78 L148 40 L112 62 L86 14 L74 34 L62 14 L36 62 Z"
        fill="url(#crownGrad)" stroke="#7A5206" strokeWidth="1.5" strokeLinejoin="round"
      />
      <rect x="0" y="78" width="148" height="16" rx="3" fill="url(#bandGrad)" stroke="#7A5206" strokeWidth="1.5" />
      <circle cx="0" cy="40" r="7" fill="#FFF3D0" stroke="#7A5206" strokeWidth="1.5" />
      <circle cx="74" cy="14" r="8" fill="#FFF3D0" stroke="#7A5206" strokeWidth="1.5" />
      <circle cx="148" cy="40" r="7" fill="#FFF3D0" stroke="#7A5206" strokeWidth="1.5" />
      <circle cx="74" cy="86" r="5" fill="#8B1E2B" stroke="#5C1019" strokeWidth="1" />
    </svg>
  );
}

// Full lockup: crown + "SHEBAODDS" wordmark + tagline, used on loading screen / auth pages
export function BrandLockup({ tagline = 'Smart Bets. Real Wins.', size = 56 }) {
  return (
    <div className="brand-lockup" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <CrownMark size={size} />
      <div style={{ textAlign: 'center' }}>
        <div className="brand-wordmark" style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontWeight: 700,
          fontSize: `${size * 0.42}px`,
          letterSpacing: '2px',
          background: 'linear-gradient(135deg, #FFE28A 0%, #FFB300 45%, #B8790C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          SHEBAODDS
        </div>
        {tagline && (
          <div style={{ fontSize: `${size * 0.16}px`, letterSpacing: '2px', color: '#C9C9C9', marginTop: '2px' }}>
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}

export default CrownMark;
