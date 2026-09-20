// ============================================
// SHEBAODDS - DEMO PAYMENT REQUEST STORE
// ============================================
// Purely in-memory, client-side demo state shared between WalletPage (where a
// user submits a deposit/withdrawal ticket) and AdminDepositReview.jsx (where an
// admin matches and approves/rejects it). Nothing here calls the server, reads or
// writes a real wallet balance, or persists past a page refresh.
//
// DEMO_DEPOSIT_NUMBER is the mobile-money number shown to users as "where to send
// funds" in demo mode. It is a placeholder for whichever real TeleBirr/CBE Birr
// merchant number the operator would use once a licensed payment flow exists —
// swap it there, not here, when that integration happens.
// ============================================

import React, { createContext, useContext, useState } from 'react';

export const DEMO_DEPOSIT_NUMBER = '1234567890';

const DemoPaymentContext = createContext(null);

const SEED_REQUESTS = [
  { id: 'REQ-8001', user: 'User1234', type: 'deposit', method: 'TeleBirr', claimedTicket: 'TB-99A2C41', claimedAmount: 5000, payoutNumber: null, submittedAt: '10:42 AM', status: 'pending' },
  { id: 'REQ-8002', user: 'User5678', type: 'withdrawal', method: 'CBE Birr', claimedTicket: 'CBE-77X910', claimedAmount: 2500, payoutNumber: '0911223344', submittedAt: '10:30 AM', status: 'pending' },
  { id: 'REQ-8003', user: 'User4321', type: 'deposit', method: 'TeleBirr', claimedTicket: 'TB-14B7E02', claimedAmount: 1000, payoutNumber: null, submittedAt: '10:28 AM', status: 'pending' },
  { id: 'REQ-8004', user: 'User8765', type: 'withdrawal', method: 'CBE Birr', claimedTicket: 'CBE-22M304', claimedAmount: 3000, payoutNumber: '0922334455', submittedAt: '10:15 AM', status: 'pending' },
  { id: 'REQ-8005', user: 'User2468', type: 'deposit', method: 'TeleBirr', claimedTicket: 'TB-56D881', claimedAmount: 2000, payoutNumber: null, submittedAt: '10:05 AM', status: 'pending' },
];

export function DemoPaymentProvider({ children }) {
  const [requests, setRequests] = useState(SEED_REQUESTS);

  const addRequest = ({ type, method, ticket, amount, payoutNumber, user }) => {
    const id = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const entry = {
      id,
      user: user || 'You',
      type, // 'deposit' | 'withdrawal'
      method,
      claimedTicket: ticket,
      claimedAmount: parseFloat(amount) || 0,
      payoutNumber: payoutNumber || null,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
    };
    setRequests((prev) => [entry, ...prev]);
    return entry;
  };

  const decide = (id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <DemoPaymentContext.Provider value={{ requests, addRequest, decide }}>
      {children}
    </DemoPaymentContext.Provider>
  );
}

export function useDemoPayments() {
  const ctx = useContext(DemoPaymentContext);
  if (!ctx) {
    // Safe no-op fallback if a page renders outside the provider during dev
    return { requests: [], addRequest: () => {}, decide: () => {} };
  }
  return ctx;
}
