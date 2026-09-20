import React, { useState } from 'react';
import { Menu, X, ShoppingBag, User, Wallet, ChevronDown, Globe } from 'lucide-react';
import BetSlip from './BetSlip'; // Importing the previous component

export default function SportsbookHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSlipDrawerOpen, setIsSlipDrawerOpen] = useState(false);
  const [balance, setBalance] = useState({ cash: 2450.75, bonus: 500.00 });
  const [language, setLanguage] = useState('EN');

  // Simulated active selection count for the floating mobile notification badge
  const activeSelectionCount = 2; 

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans antialiased">
      
      {/* Primary Global Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#111625]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left: Brand Identity & Desktop Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-amber-500 flex items-center justify-center font-black text-slate-950 text-lg">
                X
              </div>
              <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent hidden sm:block">
                NEXUS<span className="text-amber-400">BET</span>
              </span>
            </div>

            {/* Desktop Link Categories */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              <a href="#sports" className="px-3 py-2 text-white border-b-2 border-sky-500 transition-all">Sports</a>
              <a href="#live" className="px-3 py-2 hover:text-white transition-all flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Live In-Play
              </a>
              <a href="#casino" className="px-3 py-2 hover:text-white transition-all">Casino</a>
              <a href="#crash" className="px-3 py-2 hover:text-white text-amber-400 transition-all">Aviator</a>
            </nav>
          </div>

          {/* Right: User Ledger Financials & Actions */}
          <div className="flex items-center gap-3">
            
            {/* Desktop Balance Capsule Matrix */}
            <div className="hidden sm:flex items-center gap-2 bg-[#090d16] border border-slate-800 rounded-lg p-1.5 pr-3">
              <div className="p-1.5 bg-sky-500/10 rounded-md text-sky-400">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-mono font-bold text-emerald-400 leading-none">
                  {balance.cash.toFixed(2)} <span className="text-[9px] text-slate-400 font-sans font-normal">ETB</span>
                </p>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5 leading-none">
                  Bonus: {balance.bonus.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Language Selection Bar Dropdown */}
            <button className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#151c2e] text-xs font-bold hover:border-slate-700 transition-all">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>{language}</span>
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </button>

            {/* Profile CTA Setup */}
            <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors">
              <User className="h-4 w-4" />
            </button>

            {/* Mobile Menu Open Toggle Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white md:hidden transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Framework Content Container Layout Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Workspace Feed Layout Column */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center bg-[#111625]/40">
              <h2 className="text-lg font-bold text-white mb-2">Live Sportsbook Odd Matrices</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Main odds display board goes here. Tapping game selections here aggregates them down inside the reactive side bet slip container.
              </p>
            </div>
          </div>

          {/* Desktop Right Column Sticky Container Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <BetSlip />
            </div>
          </div>
        </div>
      </main>

      {/* --- MOBILE DRAWER ARCHITECTURE SUBSYSTEMS --- */}

      {/* 1. Floating Action Sticky Trigger Button (Mobile Viewports Only) */}
      <div className="fixed bottom-6 right-6 z-30 lg:hidden">
        <button
          onClick={() => setIsSlipDrawerOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-3 rounded-full shadow-2xl transition-transform active:scale-95 duration-150 relative"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider">View Slip</span>
          
          {activeSelectionCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#090d16] animate-pulse">
              {activeSelectionCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Side Sliding Bet Slip Backdrop overlay panel container */}
      <div 
        className={`fixed inset-0 z-50 transform lg:hidden transition-all duration-300 ease-in-out ${
          isSlipDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Clickable Dimmer Backdrop */}
        <div 
          onClick={() => setIsSlipDrawerOpen(false)}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Sliding Slip Container Core Wrapper Box */}
        <div 
          className={`absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#111625] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
            isSlipDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Close Control Header bar */}
          <div className="p-4 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Review Selection Ticket</span>
            <button 
              onClick={() => setIsSlipDrawerOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white bg-[#090d16] border border-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Embedded Bet Slip Core Screen view frame */}
          <div className="flex-1 overflow-y-auto p-2 bg-[#090d16]/30">
            {/* Standard component mounted transparently within the mobile sliding container block */}
            <BetSlip />
          </div>
        </div>
      </div>

      {/* 3. Dropdown Mobile Site Navigation Categories Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#111625] px-4 py-3 space-y-2 font-bold uppercase tracking-wide text-xs text-slate-400 animate-fade-in">
          <a href="#sports" className="block px-3 py-2 text-white bg-slate-800/50 rounded-md">Sports</a>
          <a href="#live" className="block px-3 py-2 hover:text-white transition-all">Live In-Play</a>
          <a href="#casino" className="block px-3 py-2 hover:text-white transition-all">Casino</a>
          <a href="#crash" className="block px-3 py-2 text-amber-400 transition-all">Aviator</a>
        </div>
      )}
    </div>
  );
}
