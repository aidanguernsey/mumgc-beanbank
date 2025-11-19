
import { User, Transaction, Bet, MarketPoint, Order, OrderSide, OrderType, Dare } from '../types';
import { db } from './database';
import { backend } from './backend';

const SESSION_KEY = 'beanbank_current_user_id';

// --- FRONTEND API SERVICE ---
// This service connects the React UI to the 'Backend' logic and 'Database' state.

export const StorageService = {
  // 1. Subscription Wrapper
  subscribe: db.subscribe,
  resync: db.resync,

  // 2. Data Accessors (Read Only)
  getUsers: db.users.get,
  getTransactions: db.transactions.get,
  getBets: db.bets.get,
  getDares: db.dares.get,
  getOrders: db.orders.get,
  getMarketHistory: db.marketHistory.get,

  // 3. User Session Management (Frontend Only)
  getCurrentUserId: (): string | null => localStorage.getItem(SESSION_KEY),
  setCurrentUserId: (id: string) => localStorage.setItem(SESSION_KEY, id),
  logout: () => localStorage.removeItem(SESSION_KEY),

  // 4. Actions (Call Backend Logic)
  
  // User Admin
  saveUsers: (users: User[]) => db.users.set(users),

  // Transactions
  processTransaction: (fromId: string, toId: string, amount: number, description: string) => {
      return backend.processTransaction(fromId, toId, amount, description);
  },
  
  // Bets
  saveBets: (bets: Bet[]) => db.bets.set(bets), // Admin overrides
  createBet: backend.createBet, // Future method to clean up component
  resolveBet: backend.resolveBet,
  
  // Dares
  createDare: backend.createDare,
  pledgeToDare: backend.pledgeToDare,
  resolveDare: backend.resolveDare,
  saveDares: (dares: Dare[]) => db.dares.set(dares), // Admin overrides

  // Market
  processOrder: backend.processOrder,
  cancelOrder: backend.cancelOrder,
};
