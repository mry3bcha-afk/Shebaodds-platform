// ============================================
// SHEBAODDS - ADMIN: DEPOSIT / WITHDRAWAL TICKET REVIEW (DEMO)
// ============================================
// WHAT THIS FILE IS:
// A self-contained, sandboxed admin UI for reviewing mobile-money deposit/withdrawal
// requests by matching the ticket/reference number and amount the user submitted.
// All data below lives in local component state (`useState`). Approve/Reject only
// updates that local list — it never calls the server, never touches a real wallet
// balance, and never persists anywhere.
//
// WHAT THIS FILE IS NOT:
// This is NOT wired to POST /api/admin/transactions/:id/approve (see adminRoutes.ts),
// which is the real endpoint that credits a user's actual wallet balance in the
// database. That endpoint already exists in this codebase and is real-money-shaped.
// Connecting this screen to it — or to a live Telebirr/CBE Birr statement lookup —
// is a production/licensing decision for whoever operates this platform, not
// something to switch on by default. If/when that connection is made, it should
// go through the same authenticate + isAdmin middleware and audit logging already
// used by the real endpoint, plus a verified (not admin-typed) source of truth for
// the ticket number — e.g. a statement export or provider webhook — so a matched
// "ticket number" can't simply be typed in by whoever is reviewing it.
// ============================================

import React, { useMemo, useState } from 'react';
import { useTranslation } from './LanguageContext';
import { useDemoPayments, DEMO_DEPOSIT_NUMBER } from './DemoPaymentStore';

export default function AdminDepositReview() {
  const { language } = useTranslation();
  const isAm = language === 'am';
  const { requests, decide: decideShared } = useDemoPayments();
  const [checkTicket, setCheckTicket] = useState({}); // { [reqId]: { ticket: '', amount: '' } }
  const [log, setLog] = useState([]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  const updateCheck = (id, field, value) => {
    setCheckTicket((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const matchState = (req) => {
    const entry = checkTicket[req.id] || {};
    if (!entry.ticket && !entry.amount) return 'idle';
    const ticketMatch = entry.ticket?.trim().toUpperCase() === req.claimedTicket.toUpperCase();
    const amountMatch = parseFloat(entry.amount) === req.claimedAmount;
    if (entry.ticket && entry.amount) return ticketMatch && amountMatch ? 'match' : 'mismatch';
    return 'partial';
  };

  const decide = (req, decision) => {
    decideShared(req.id, decision);
    setLog((prev) => [
      { id: `${req.id}-${Date.now()}`, text: `${decision === 'approved' ? '✅' : '❌'} ${req.id} (${req.user}) ${decision} — demo action, no wallet updated` },
      ...prev,
    ]);
  };

  return (
    <div className="admin-deposit-review">
      <div className="demo-banner-strip">
        {isAm
          ? '⚠️ ማሳያ ብቻ — በዚህ ገጽ ላይ የሚደረግ ማንኛውም ማጽደቅ/አለመቀበል እውነተኛ ሂሳብ አይነካም።'
          : '⚠️ DEMO ONLY — approvals/rejections here are sandboxed and never touch a real wallet balance.'}
      </div>

      <div className="admin-deposit-header">
        <h2>{isAm ? 'የተቀማጭ/ማውጫ ትኬት ማረጋገጫ' : 'Deposit / Withdrawal Ticket Review'}</h2>
        <span className="pending-pill">{pendingCount} {isAm ? 'በመጠባበቅ ላይ' : 'pending'}</span>
      </div>
      <p className="admin-deposit-subnote">
        {isAm
          ? `ማሳያ የተቀማጭ ቁጥር: ${DEMO_DEPOSIT_NUMBER}`
          : `Demo deposit number shown to users: ${DEMO_DEPOSIT_NUMBER}`}
      </p>

      <table className="admin-review-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{isAm ? 'ተጠቃሚ' : 'User'}</th>
            <th>{isAm ? 'አይነት' : 'Type'}</th>
            <th>{isAm ? 'መንገድ' : 'Method'}</th>
            <th>{isAm ? 'የክፍያ ቁጥር' : 'Payout #'}</th>
            <th>{isAm ? 'የተጠየቀ መጠን' : 'Claimed Amount'}</th>
            <th>{isAm ? 'ትኬት ቁጥር አረጋግጥ' : 'Verify Ticket #'}</th>
            <th>{isAm ? 'መጠን አረጋግጥ' : 'Verify Amount'}</th>
            <th>{isAm ? 'ውጤት' : 'Match'}</th>
            <th>{isAm ? 'እርምጃ' : 'Action'}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => {
            const state = matchState(req);
            return (
              <tr key={req.id} className={`row-${req.status}`}>
                <td>{req.id}</td>
                <td>{req.user}</td>
                <td className={req.type === 'deposit' ? 'type-deposit' : 'type-withdrawal'}>
                  {req.type === 'deposit' ? (isAm ? 'ተቀማጭ' : 'Deposit') : (isAm ? 'ማውጫ' : 'Withdrawal')}
                </td>
                <td>{req.method}</td>
                <td>{req.payoutNumber || '—'}</td>
                <td>{req.claimedAmount.toLocaleString()} ETB</td>
                <td>
                  <input
                    placeholder={req.claimedTicket}
                    value={checkTicket[req.id]?.ticket || ''}
                    onChange={(e) => updateCheck(req.id, 'ticket', e.target.value)}
                    disabled={req.status !== 'pending'}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    placeholder={String(req.claimedAmount)}
                    value={checkTicket[req.id]?.amount || ''}
                    onChange={(e) => updateCheck(req.id, 'amount', e.target.value)}
                    disabled={req.status !== 'pending'}
                  />
                </td>
                <td>
                  {req.status !== 'pending' ? (
                    <span className="match-badge done">{req.status}</span>
                  ) : (
                    <span className={`match-badge ${state}`}>
                      {state === 'match' && (isAm ? 'ይመሳሰላል' : 'Match')}
                      {state === 'mismatch' && (isAm ? 'አይመሳሰልም' : 'Mismatch')}
                      {state === 'partial' && (isAm ? 'ያልተጠናቀቀ' : 'Incomplete')}
                      {state === 'idle' && '—'}
                    </span>
                  )}
                </td>
                <td className="action-cell">
                  <button
                    className="approve-btn"
                    disabled={req.status !== 'pending' || state !== 'match'}
                    onClick={() => decide(req, 'approved')}
                  >
                    {isAm ? 'አጽድቅ' : 'Approve'}
                  </button>
                  <button
                    className="reject-btn"
                    disabled={req.status !== 'pending'}
                    onClick={() => decide(req, 'rejected')}
                  >
                    {isAm ? 'አትቀበል' : 'Reject'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {log.length > 0 && (
        <div className="admin-review-log">
          <h4>{isAm ? 'የዚህ ክፍለ ጊዜ እርምጃዎች (ማሳያ)' : 'This session\'s actions (demo)'}</h4>
          <ul>
            {log.map((entry) => <li key={entry.id}>{entry.text}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
