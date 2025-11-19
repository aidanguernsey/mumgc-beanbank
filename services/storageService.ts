import { User, Transaction, Bet, MarketPoint, Order, OrderSide, OrderType, Dare } from '../types';

const SESSION_KEY = 'beanbank_current_user_id';
const POLLING_INTERVAL_MS = 2000;
const API_BASE_URL = 'http://localhost:3000'; // Explicitly point to the backend server

// --- CLIENT SIDE STATE CACHE ---
let cache = {
    users: [] as User[],
    transactions: [] as Transaction[],
    bets: [] as Bet[],
    dares: [] as Dare[],
    orders: [] as Order[],
    marketHistory: [] as MarketPoint[]
};

const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach(cb => cb());

export const StorageService = {
  // --- SUBSCRIPTION & SYNC ---
  subscribe: (callback: () => void) => {
    subscribers.add(callback);
    const interval = setInterval(() => {
        StorageService.resync();
    }, POLLING_INTERVAL_MS);

    return () => {
        subscribers.delete(callback);
        clearInterval(interval);
    };
  },

  // Fetch latest state from Server
  resync: async (): Promise<boolean> => {
      try {
          // Using full URL to avoid port mismatch issues in local dev
          const res = await fetch(`${API_BASE_URL}/api/state`);
          if (res.ok) {
              const data = await res.json();
              cache = data;
              notify();
              return true;
          }
          return false;
      } catch (e) {
          console.warn("BeanBank Server not reachable. Ensure 'node server.js' is running on port 3000.");
          return false;
      }
  },

  // --- READ ACCESSORS (Sync) ---
  getUsers: () => cache.users,
  getTransactions: () => cache.transactions,
  getBets: () => cache.bets,
  getDares: () => cache.dares,
  getOrders: () => cache.orders,
  getMarketHistory: () => cache.marketHistory,

  // --- USER SESSION ---
  getCurrentUserId: (): string | null => localStorage.getItem(SESSION_KEY),
  setCurrentUserId: (id: string) => localStorage.setItem(SESSION_KEY, id),
  logout: () => localStorage.removeItem(SESSION_KEY),

  // --- ACTIONS (Async Server Calls) ---
  
  saveUsers: async (users: User[]) => {
      await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(users)
      });
      StorageService.resync();
  },

  processTransaction: async (fromId: string, toId: string, amount: number, description: string) => {
      const res = await fetch(`${API_BASE_URL}/api/transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId, toId, amount, description })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      StorageService.resync();
      return data.transaction;
  },

  saveBets: async (bets: Bet[]) => {
      console.warn("Bulk save not supported in Server mode");
  }, 

  createBet: async (bet: Bet) => {
      await fetch(`${API_BASE_URL}/api/bets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bet)
      });
      StorageService.resync();
  },

  resolveBet: async (betId: string, winningOptionId: string) => {
      await fetch(`${API_BASE_URL}/api/bets/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betId, winningOptionId })
      });
      StorageService.resync();
  },

  createDare: async (creatorId: string, targetId: string, description: string) => {
      await fetch(`${API_BASE_URL}/api/dares`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatorId, targetId, description })
      });
      StorageService.resync();
  },

  pledgeToDare: async (userId: string, dareId: string, amount: number) => {
      const res = await fetch(`${API_BASE_URL}/api/dares/pledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, dareId, amount })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      StorageService.resync();
  },

  resolveDare: async (dareId: string, proof?: string) => {
      await fetch(`${API_BASE_URL}/api/dares/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dareId, proof })
      });
      StorageService.resync();
  },
  saveDares: (dares: Dare[]) => { /* No-op in server mode */ },

  processOrder: async (userId: string, side: OrderSide, type: OrderType, amount: number, price: number) => {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, side, type, amount, price })
      });
      const data = await res.json();
      StorageService.resync();
      return data;
  },

  cancelOrder: async (orderId: string) => {
      await fetch(`${API_BASE_URL}/api/orders/${orderId}`, { method: 'DELETE' });
      StorageService.resync();
  },
  
  placeWager: async (userId: string, betId: string, optionId: string, amount: number) => {
      const res = await fetch(`${API_BASE_URL}/api/bets/wager`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, betId, optionId, amount })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      StorageService.resync();
  }
};