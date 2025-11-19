
export interface User {
  id: string;
  username: string;
  password?: string; // Optional for backward compatibility, but enforced in new logic
  section: 'Tenor I' | 'Tenor II' | 'Baritone' | 'Bass' | 'Conductor';
  balance: number;
  beanCoinBalance?: number; // New Crypto Balance
  avatarUrl: string;
  isAdmin?: boolean;
}

export interface Transaction {
  id: string;
  fromUserId: string; // 'SYSTEM' if minted
  toUserId: string;
  amount: number;
  description: string;
  timestamp: number;
  category?: string; // Enriched by AI
}

export interface BetOption {
  id: string;
  text: string;
}

export interface BetWager {
  userId: string;
  optionId: string;
  amount: number;
}

export interface Bet {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  status: 'OPEN' | 'LOCKED' | 'RESOLVED';
  options: BetOption[];
  wagers: BetWager[];
  winningOptionId?: string;
  createdAt: number;
}

export interface Pledge {
  userId: string;
  amount: number;
}

export interface Dare {
  id: string;
  creatorId: string;
  targetId: string;
  description: string;
  bounty: number;
  pledges: Pledge[];
  status: 'ACTIVE' | 'COMPLETED';
  proof?: string; // Text proof or comment provided upon completion
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface MarketPoint {
  timestamp: number;
  time: string;
  price: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'OPEN' | 'FILLED' | 'kJ'; // kJ is unused, keeping generic 'FILLED' or 'CANCELLED' in logic implies removal

export interface Order {
  id: string;
  userId: string;
  side: OrderSide;
  type: OrderType;
  price: number;     // For limit orders
  amount: number;    // Total amount to buy/sell
  filled: number;    // Amount executed
  timestamp: number;
}

// Enum for views to avoid magic strings
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  LEADERBOARD = 'LEADERBOARD',
  TRANSACTIONS = 'TRANSACTIONS',
  BETS = 'BETS',
  DARES = 'DARES',
  ORACLE = 'ORACLE', // AI Chat
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  CRYPTO = 'CRYPTO'
}
