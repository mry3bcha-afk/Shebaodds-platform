import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle2, Ticket, ReceiptText } from 'lucide-react';

export default function BetSlip() {
  // Mock active wagers inside the user's bet slip matrix
  const [selections, setSelections] = useState([
    { id: 101, match: 'Ethiopia vs Egypt', market: '1X2', selection: 'Ethiopia (Home)', odds: 2.45, previousOdds: 2.45, status: 'stable' },
    { id: 102, match: 'Arsenal vs Chelsea', market: 'Both Teams to Score', selection: 'Yes', odds: 1.85, previousOdds: 1.85, status: 'stable' }
  ]);
  
  const [stake, setStake] = useState('');
  const [betPlaced, setBetPlaced] = useState(false);
  const [slipType, setSlipType] = useState('Accumulator'); // Single vs Accumulator/Combo
  const [oddsAcceptedMode, setOddsAcceptedMode] = useState('ask'); // ask, higher, any

  // Simulate real-time data provider webhook changes over WebSockets every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSelections(prev => 
        prev.map(item => {
          // 20% chance an odds shift occurs on a selection row
          if (Math.random() > 0.8) {
            const delta = (Math.random() * 0.4 - 0.2); // Random fluctuation between -0.2 and +0.2
            const newOdds = Math.max(1.10, parseFloat((item.odds + delta).toFixed(2)));
            return {
              ...item,
              previousOdds: item.odds,
              odds: newOdds,
              status: newOdds > item.odds ? 'up' : 'down'
            };
          }
          return { ...item, status: 'stable' };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Remove a particular game selection from the slip
  const removeSelection = (id) => {
    setSelections(selections.filter(item => item.id !== id));
  };

  // Clear entire betting board state arrays
  const clearSlip = () => {
    setSelections([]);
    setStake('');
  };

  // Compute total combined accumulator odds
  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1).toFixed(2);
  
  // Financial breakdown computations matching East African statutory tax rules
  const numericalStake = parseFloat(stake) || 0;
  const grossPayout = (numericalStake * totalOdds);
  const netWinnings = grossPayout > numericalStake ? grossPayout - numericalStake : 0;
  const taxAmount = netWinnings * 0.10; // 10% Withholding Tax applied strictly to net profit
  const finalNetReturn = grossPayout - taxAmount;

  const handlePlaceWager = (e) => {
    e.preventDefault();
    if (numericalStake <= 0 || selections.length === 0) return;
    
    // Fire event arrays downstream to backend RabbitMQ distributed queue
    setBetPlaced(true);
    setTimeout(() => {
      setBetPlaced(false);
      clearSlip();
    }, 4000);
  };

  return (
    <div className="w-full max-w-sm bg-[#111625] border border-slate-800 rounded-xl shadow-2xl text-slate-200 overflow-hidden font-sans">
      
      {/* Bet Slip Tab Headers */}
      <div className="bg-[#151c2e] px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-sky-400" />
          <h2 className="font-bold tracking-wide uppercase text-xs text-white">Bet Slip</h2>
          <span className="bg-sky-500/10 text-sky-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
            {selections.length}
          </span>
        </div>
        {selections.length > 0 && (
          <button 
            onClick={clearSlip} 
            className="text-slate-400 hover:text-rose-400 transition-colors text-[11px] font-medium uppercase tracking-wider"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Slip Classification Mode Selector Switches */}
      <div className="grid grid-cols-2 bg-[#090d16] p-1 border-b border-slate-800/60 text-center text-xs font-semibold">
        <button 
          onClick={() => setSlipType('Single')}
          className={`py-2 rounded-md transition-all ${slipType === 'Single' ? 'bg-[#111625] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Single
        </button>
        <button 
          onClick={() => setSlipType('Accumulator')}
          className={`py-2 rounded-md transition-all ${slipType === 'Accumulator' ? 'bg-[#111625] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Accumulator ({totalOdds}x)
        </button>
      </div>

      {/* Main Container Body */}
      <div className="p-4 max-h-[280px] overflow-y-auto space-y-3 custom-scrollbar">
        {betPlaced ? (
          <div className="py-10 text-center space-y-3 animate-fade-in">
            <div className="inline-flex p-3 bg-emerald-500/10 rounded-full text-emerald-400 mx-auto">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>
            <h3 className="text-sm font-bold text-white">Wager Successfully Placed!</h3>
            <p className="text-xs text-slate-400 px-4">Ticket transferred asynchronously to RabbitMQ queue cluster processing nodes...</p>
          </div>
        ) : selections.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <ReceiptText className="h-8 w-8 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs">Your bet slip is empty.</p>
            <p className="text-[11px] text-slate-600 px-6">Select outcome markets from live matches to configure a ticket.</p>
          </div>
        ) : (
          selections.map((item) => (
            <div 
              key={item.id} 
              className={`p-3 rounded-lg border bg-[#090d16]/60 transition-all duration-300 relative overflow-hidden ${
                item.status === 'up' ? 'border-emerald-500 bg-emerald-950/10' : 
                item.status === 'down' ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800/80'
              }`}
            >
              {/* Dynamic Flash Banner Alerts for Odds Movements */}
              {item.status !== 'stable' && (
                <div className={`absolute top-0 right-0 left-0 text-[9px] font-bold text-center py-0.5 animate-pulse uppercase tracking-widest ${
                  item.status === 'up' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  Odds Line Changed
                </div>
              )}

              <div className={`flex justify-between items-start ${item.status !== 'stable' ? 'mt-2' : ''}`}>
                <div className="space-y-0.5 pr-4">
                  <p className="text-[11px] font-bold text-white leading-tight">{item.match}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{item.market}</p>
                  <p className="text-xs font-semibold text-sky-400 mt-1">Selection: {item.selection}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button 
                    onClick={() => removeSelection(item.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                    item.status === 'up' ? 'text-emerald-400 bg-emerald-500/10 font-extrabold scale-105' :
                    item.status === 'down' ? 'text-rose-400 bg-rose-500/10 font-extrabold scale-105' : 'text-amber-400 bg-amber-500/5'
                  } transition-all duration-300`}>
                    {item.odds.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financial Accounting and Settlement Section */}
      {selections.length > 0 && !betPlaced && (
        <div className="bg-[#141b2e] border-t border-slate-800 p-4 space-y-3 font-medium text-xs">
          
          {/* Slip Totals Summary */}
          <div className="space-y-1.5 border-b border-slate-800/60 pb-3 text-slate-400">
            <div className="flex justify-between">
              <span>Total Combined Odds:</span>
              <span className="font-mono font-bold text-white text-sm text-amber-400">{totalOdds}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="flex items-center gap-1">
                Withholding Government Tax <span className="font-bold text-rose-400">(10%)</span>:
              </span>
              <span className="font-mono text-rose-400">
                {taxAmount > 0 ? `-${taxAmount.toFixed(2)}` : '0.00'} ETB
              </span>
            </div>
          </div>

          {/* Interactive Stake Management Field */}
          <form onSubmit={handlePlaceWager} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Wager Stake Amount (ETB)
              </label>
              <div className="relative rounded-lg overflow-hidden shadow-sm">
                <input 
                  type="number" 
                  min="1"
                  step="any"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="Enter custom stake..." 
                  className="w-full bg-[#090d16] border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg py-2 pl-3 pr-12 text-xs font-mono font-bold text-white outline-none transition-all"
                  required
                />
                <span className="absolute right-3 top-2 text-[10px] font-extrabold text-slate-500">ETB</span>
              </div>
            </div>

            {/* Net Estimated Payout Metrics Output */}
            <div className="p-2.5 bg-[#090d16]/80 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 font-semibold text-[11px]">Net Estimated Return:</span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {finalNetReturn > 0 ? finalNetReturn.toFixed(2) : '0.00'} ETB
              </span>
            </div>

            {/* Slip Settings Controls Option Blocks */}
            <div className="text-[10px] text-slate-500 flex justify-between items-center py-1">
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> If odds shift downwards:</span>
              <select 
                value={oddsAcceptedMode} 
                onChange={(e) => setOddsAcceptedMode(e.target.value)}
                className="bg-[#090d16] border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 font-bold outline-none cursor-pointer"
              >
                <option value="ask">Ask Me</option>
                <option value="higher">Accept Higher Only</option>
                <option value="any">Accept Any Price</option>
              </select>
            </div>

            {/* Final Execution Button Submission Gateway */}
            <button 
              type="submit"
              disabled={numericalStake <= 0}
              className={`w-full font-bold py-2.5 rounded-lg text-center tracking-wide uppercase transition-all duration-200 shadow-md ${
                numericalStake > 0 
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer active:scale-[0.99]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Place Bet Ticket
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
