
import { User, Transaction, Bet, MarketPoint, Order, OrderSide, OrderType, Dare } from '../types';

const SESSION_KEY = 'beanbank_current_user_id';
const POLLING_INTERVAL_MS = 2000;

// --- CLIENT SIDE STATE CACHE ---
// The frontend reads from this cache synchronously for rendering.
// The polling mechanism updates this cache from the server asynchronously.
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
    // Start polling
    const interval = setInterval(() => {
        StorageService.resync();
    }, POLLING_INTERVAL_MS);

    return () => {
        subscribers.delete(callback);
        clearInterval(interval);
    };
  },

  // Fetch latest state from Server
  resync: async () => {
      try {
          const res = await fetch('/api/state');
          if (res.ok) {
              const data = await res.json();
              cache = data;
              notify();
          }
      } catch (e) {
          console.error("Sync failed:", e);
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
      await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(users)
      });
      StorageService.resync();
  },

  processTransaction: async (fromId: string, toId: string, amount: number, description: string) => {
      const res = await fetch('/api/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId, toId, amount, description })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      StorageService.resync();
      return data.transaction;
  },

  // Bets
  saveBets: async (bets: Bet[]) => {
      // Admin override - simplistic for this demo, usually we'd have specific endpoints
      // We'll just assume state sync handles it or specific endpoints are used
      // For now, this is a no-op in the server arch unless we add a bulk endpoint
      console.warn("Bulk save not supported in Server mode");
  }, 

  createBet: async (bet: Bet) => {
      await fetch('/api/bets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bet)
      });
      StorageService.resync();
  },

  resolveBet: async (betId: string, winningOptionId: string) => {
      await fetch('/api/bets/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betId, winningOptionId })
      });
      StorageService.resync();
  },

  // Dares
  createDare: async (creatorId: string, targetId: string, description: string) => {
      await fetch('/api/dares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatorId, targetId, description })
      });
      StorageService.resync();
  },

  pledgeToDare: async (userId: string, dareId: string, amount: number) => {
      const res = await fetch('/api/dares/pledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, dareId, amount })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      StorageService.resync();
  },

  resolveDare: async (dareId: string, proof?: string) => {
      await fetch('/api/dares/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dareId, proof })
      });
      StorageService.resync();
  },
  saveDares: (dares: Dare[]) => { /* No-op in server mode */ },

  // Market
  processOrder: async (userId: string, side: OrderSide, type: OrderType, amount: number, price: number) => {
      const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, side, type, amount, price })
      });
      const data = await res.json();
      StorageService.resync();
      return data;
  },

  cancelOrder: async (orderId: string) => {
      await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      StorageService.resync();
  },
  
  // Custom wager method needed for the new architecture
  placeWager: async (userId: string, betId: string, optionId: string, amount: number) => {
      const res = await fetch('/api/bets/wager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, betId, optionId, amount })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      StorageService.resync();
  }
};
