
import { User, Transaction, Bet, MarketPoint, Order, OrderSide, OrderType, Dare } from '../types';

const STORAGE_KEYS = {
  USERS: 'beanbank_users',
  TRANSACTIONS: 'beanbank_transactions',
  BETS: 'beanbank_bets',
  DARES: 'beanbank_dares',
  CURRENT_USER: 'beanbank_current_user_id',
  MARKET_HISTORY: 'beanbank_market_history',
  ORDERS: 'beanbank_orders'
};

// Unique App Scope - Bumped to ensure fresh mesh network channel
const APP_SCOPE = 'choir_beanbank_mesh_v1'; 

// Robust list of public Gun relay peers
const PEERS = [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wallie.io/gun',
    'https://gun-eu.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun',
    'https://plankton-app-6qfp3.ondigitalocean.app/gun'
];

// Initialize Gun with safe fallbacks
let gun: any;

try {
    // Access global Gun constructor loaded via script tag
    const Gun = (window as any).Gun;
    
    // Initialize Gun instance
    if (typeof Gun === 'function') {
        console.log("Connecting to BeanBank Network via:", PEERS);
        // we manually manage persistence to ensure React state stays in sync.
        gun = Gun({ peers: PEERS, localStorage: false });
    } else {
        console.warn("Gun constructor not found on window. Running offline.");
        throw new Error("Gun not found");
    }
} catch (e) {
    console.warn("Gun failed to initialize. Offline mode active.", e);
    // Mock Gun interface to prevent app crash
    const mockChain = {
        get: () => mockChain,
        put: () => mockChain,
        on: () => mockChain,
        map: () => mockChain,
        once: () => mockChain,
        off: () => mockChain
    };
    gun = {
        get: () => mockChain
    };
}

// Internal In-Memory State Cache
const state: Record<string, any> = {
    [STORAGE_KEYS.USERS]: [],
    [STORAGE_KEYS.TRANSACTIONS]: [],
    [STORAGE_KEYS.BETS]: [],
    [STORAGE_KEYS.DARES]: [],
    [STORAGE_KEYS.MARKET_HISTORY]: [],
    [STORAGE_KEYS.ORDERS]: []
};

// Subscription system
const subscribers = new Set<() => void>();

const notify = () => {
    subscribers.forEach(cb => cb());
};

// Seed data
const SEED_USERS: User[] = [
  { id: 'admin1', username: 'Choir_Manager', password: 'admin', section: 'Conductor', balance: 10000, beanCoinBalance: 100, avatarUrl: 'https://picsum.photos/seed/admin1/150/150', isAdmin: true },
  { id: 'u1', username: 'Maestro_John', password: '123', section: 'Conductor', balance: 1000, beanCoinBalance: 10, avatarUrl: 'https://picsum.photos/seed/u1/150/150' },
  { id: 'u2', username: 'Tim_TenorOne', password: '123', section: 'Tenor I', balance: 500, beanCoinBalance: 5, avatarUrl: 'https://picsum.photos/seed/u2/150/150' },
  { id: 'u3', username: 'Tom_TenorTwo', password: '123', section: 'Tenor II', balance: 25, beanCoinBalance: 0, avatarUrl: 'https://picsum.photos/seed/u3/150/150' },
  { id: 'u4', username: 'Ben_Baritone', password: '123', section: 'Baritone', balance: 450, beanCoinBalance: 2, avatarUrl: 'https://picsum.photos/seed/u4/150/150' },
  { id: 'u5', username: 'Barry_Bass', password: '123', section: 'Bass', balance: 300, beanCoinBalance: 0, avatarUrl: 'https://picsum.photos/seed/u5/150/150' },
];

// Internal Persistence Helper
const persist = (key: string, data: any) => {
    // 1. Update Memory
    state[key] = data;
    
    // 2. Update LocalStorage (Offline Backup)
    const jsonStr = JSON.stringify(data);
    localStorage.setItem(key, jsonStr);
    
    // 3. Update Network (Gun.js)
    try {
        gun.get(APP_SCOPE).get(key).put(jsonStr);
    } catch (e) {
        console.warn("Sync failed for", key);
    }
    
    notify();
};

// Listen for changes from other tabs on the SAME computer
window.addEventListener('storage', (event) => {
    if (event.key && Object.values(STORAGE_KEYS).includes(event.key)) {
        try {
            if (event.newValue) {
                state[event.key] = JSON.parse(event.newValue);
                notify();
            }
        } catch (e) {
            console.error("Error syncing cross-tab", e);
        }
    }
});

// Initialization Logic
const init = () => {
    // 1. Hydrate from LocalStorage (Fast Boot)
    Object.keys(state).forEach(key => {
        const local = localStorage.getItem(key);
        if (local) {
            try {
                state[key] = JSON.parse(local);
            } catch (e) {
                state[key] = [];
            }
        }
    });

    // 2. Seed Users if absolutely empty locally
    if (state[STORAGE_KEYS.USERS].length === 0) {
        state[STORAGE_KEYS.USERS] = SEED_USERS;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    
    // Migration check for passwords
    let changed = false;
    const patchedUsers = state[STORAGE_KEYS.USERS].map((u: User) => {
        if (!u.password) {
            changed = true;
            return { ...u, password: '123' };
        }
        return u;
    });
    if (changed) {
        state[STORAGE_KEYS.USERS] = patchedUsers;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(patchedUsers));
    }

    // 3. Connect to Network and Listen
    Object.keys(state).forEach(key => {
        try {
            gun.get(APP_SCOPE).get(key).on((data: any) => {
                if (typeof data === 'string') {
                    try {
                        // Prevent infinite loops: only update if data is different
                        const currentLocal = localStorage.getItem(key);
                        if (data !== currentLocal) {
                            console.log(`[Mesh] Received update for ${key}`);
                            const parsed = JSON.parse(data);
                            state[key] = parsed;
                            localStorage.setItem(key, data);
                            notify();
                        }
                    } catch (e) {
                        console.error(`Sync error on ${key}`, e);
                    }
                }
            });
        } catch (e) {
            console.warn("Could not attach listener to Gun", e);
        }
    });
};

// Run initialization immediately
init();

export const StorageService = {
  subscribe: (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
  },

  // Force a network refresh
  resync: () => {
    console.log("Forcing network resync...");
    Object.keys(state).forEach(key => {
        try {
            // Use .once() to strictly fetch the latest node value from the graph
            gun.get(APP_SCOPE).get(key).once((data: any) => {
                if (typeof data === 'string') {
                    try {
                        const currentLocal = localStorage.getItem(key);
                        if (data !== currentLocal) {
                            console.log(`[Resync] Updated ${key} from mesh`);
                            state[key] = JSON.parse(data);
                            localStorage.setItem(key, data);
                        }
                    } catch(e) { 
                        console.warn(`Resync parse error ${key}`); 
                    }
                }
            });
        } catch(e) {
            console.warn("Gun unreachable during resync");
        }
    });
    // Trigger UI update regardless of data change to show "done" state
    setTimeout(notify, 500); 
  },

  getUsers: (): User[] => state[STORAGE_KEYS.USERS],
  saveUsers: (users: User[]) => persist(STORAGE_KEYS.USERS, users),

  getTransactions: (): Transaction[] => state[STORAGE_KEYS.TRANSACTIONS],
  saveTransactions: (txs: Transaction[]) => persist(STORAGE_KEYS.TRANSACTIONS, txs),

  getBets: (): Bet[] => state[STORAGE_KEYS.BETS],
  saveBets: (bets: Bet[]) => persist(STORAGE_KEYS.BETS, bets),

  getDares: (): Dare[] => state[STORAGE_KEYS.DARES],
  saveDares: (dares: Dare[]) => persist(STORAGE_KEYS.DARES, dares),

  createDare: (creatorId: string, targetId: string, description: string) => {
    const dares = StorageService.getDares();
    const newDare: Dare = {
      id: `dare_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorId,
      targetId,
      description,
      bounty: 0,
      pledges: [],
      status: 'ACTIVE',
      createdAt: Date.now()
    };
    StorageService.saveDares([newDare, ...dares]);
  },

  pledgeToDare: (userId: string, dareId: string, amount: number) => {
    const dares = StorageService.getDares();
    const dareIdx = dares.findIndex(d => d.id === dareId);
    if (dareIdx === -1) throw new Error("Dare not found");
    
    const dare = dares[dareIdx];

    // Process transaction logic handles balance check and deduction
    StorageService.processTransaction(userId, 'SYSTEM', amount, `Pledge for Dare: ${dare.description}`);

    // Update Dare
    dare.pledges.push({ userId, amount });
    dare.bounty += amount;
    StorageService.saveDares(dares);
  },

  resolveDare: (dareId: string, proof?: string) => {
    const dares = StorageService.getDares();
    const dareIdx = dares.findIndex(d => d.id === dareId);
    if (dareIdx === -1) throw new Error("Dare not found");
    
    const dare = dares[dareIdx];
    if (dare.status !== 'ACTIVE') throw new Error("Dare already resolved");

    // Transfer bounty from SYSTEM (escrow) to target
    if (dare.bounty > 0) {
      StorageService.processTransaction('SYSTEM', dare.targetId, dare.bounty, `Dare Bounty: ${dare.description}`);
    }

    dare.status = 'COMPLETED';
    if (proof) {
        dare.proof = proof;
    }
    StorageService.saveDares(dares);
  },

  getCurrentUserId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  },

  setCurrentUserId: (id: string) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, id);
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getMarketHistory: (): MarketPoint[] => state[STORAGE_KEYS.MARKET_HISTORY],

  saveMarketHistory: (history: MarketPoint[]) => {
    const recent = history.slice(-100); // Keep last 100
    persist(STORAGE_KEYS.MARKET_HISTORY, recent);
  },

  getOrders: (): Order[] => state[STORAGE_KEYS.ORDERS],

  saveOrders: (orders: Order[]) => persist(STORAGE_KEYS.ORDERS, orders),

  clearMarket: () => {
    const users = StorageService.getUsers();
    const orders = StorageService.getOrders();

    // Refund Loop
    orders.forEach(o => {
      if (o.userId === 'SYSTEM') return; 
      if (o.filled >= o.amount) return;
      
      const userIdx = users.findIndex(u => u.id === o.userId);
      if (userIdx !== -1) {
        const remaining = o.amount - o.filled;
        if (o.side === 'BUY') {
          users[userIdx].balance += (remaining * o.price);
        } else {
          users[userIdx].beanCoinBalance = (users[userIdx].beanCoinBalance || 0) + remaining;
        }
      }
    });

    StorageService.saveUsers(users);
    persist(STORAGE_KEYS.ORDERS, []);
    persist(STORAGE_KEYS.MARKET_HISTORY, []);
  },

  cancelOrder: (orderId: string) => {
    const orders = StorageService.getOrders();
    const filtered = orders.filter(o => o.id !== orderId);
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
        const users = StorageService.getUsers();
        const userIdx = users.findIndex(u => u.id === order.userId);
        if (userIdx !== -1) {
            const remaining = order.amount - order.filled;
            if (order.side === 'BUY') {
                users[userIdx].balance += (remaining * order.price);
            } else {
                users[userIdx].beanCoinBalance = (users[userIdx].beanCoinBalance || 0) + remaining;
            }
            StorageService.saveUsers(users);
        }
    }
    StorageService.saveOrders(filtered);
  },
  
  processOrder: (userId: string, side: OrderSide, type: OrderType, amount: number, price: number): { success: boolean, message: string } => {
    const users = StorageService.getUsers();
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx === -1) return { success: false, message: "User not found" };
    
    let user = users[userIdx];
    const cost = amount * price;

    // 1. Initial Balance Check & Lock
    if (side === 'BUY') {
        if (type === 'LIMIT' && user.balance < cost) return { success: false, message: "Insufficient Beans for this Limit Order" };
        if (type === 'MARKET' && user.balance < 1) return { success: false, message: "Insufficient Beans" };
    } else {
        if ((user.beanCoinBalance || 0) < amount) return { success: false, message: "Insufficient BeanCoins" };
    }

    if (type === 'LIMIT') {
        if (side === 'BUY') {
            user.balance -= cost;
        } else {
            user.beanCoinBalance = (user.beanCoinBalance || 0) - amount;
        }
    }

    let orders = StorageService.getOrders();
    let remainingAmount = amount;
    
    const isBuy = side === 'BUY';
    const matchOrders = orders
        .filter(o => o.side === (isBuy ? 'SELL' : 'BUY'))
        .sort((a, b) => isBuy ? a.price - b.price : b.price - a.price);

    let historyUpdates: number[] = [];

    for (const match of matchOrders) {
        if (remainingAmount <= 0) break;

        if (type === 'LIMIT') {
             if (isBuy && match.price > price) break;
             if (!isBuy && match.price < price) break;
        }

        const tradeAmount = Math.min(remainingAmount, match.amount - match.filled);
        const tradePrice = match.price;
        
        // Update Maker
        const makerIdx = users.findIndex(u => u.id === match.userId);
        if (makerIdx !== -1 && match.userId !== 'SYSTEM') {
            if (isBuy) {
                users[makerIdx].balance += tradeAmount * tradePrice;
            } else {
                users[makerIdx].beanCoinBalance = (users[makerIdx].beanCoinBalance || 0) + tradeAmount;
            }
        }

        // Update Taker
        if (isBuy) {
            user.beanCoinBalance = (user.beanCoinBalance || 0) + tradeAmount;
            if (type === 'MARKET') {
                const cost = tradeAmount * tradePrice;
                if (user.balance < cost) break; 
                user.balance -= cost;
            } else {
                const refund = (price - tradePrice) * tradeAmount;
                user.balance += refund;
            }
        } else {
            user.balance += tradeAmount * tradePrice;
            if (type === 'MARKET') {
                 user.beanCoinBalance = (user.beanCoinBalance || 0) - tradeAmount;
            }
        }

        match.filled += tradeAmount;
        remainingAmount -= tradeAmount;
        historyUpdates.push(tradePrice);

        const tx: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
            fromUserId: isBuy ? user.id : match.userId,
            toUserId: isBuy ? match.userId : user.id,
            amount: tradeAmount * tradePrice,
            description: `Market Trade: ${tradeAmount} BC @ ${tradePrice}`,
            timestamp: Date.now(),
            category: 'Investment'
        };
        const allTxs = StorageService.getTransactions();
        allTxs.unshift(tx);
        state[STORAGE_KEYS.TRANSACTIONS] = allTxs; 
    }

    orders = orders.filter(o => o.filled < o.amount);

    if (type === 'LIMIT' && remainingAmount > 0) {
        const newOrder: Order = {
            id: `ord_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
            userId: user.id,
            side,
            type,
            price,
            amount: amount,
            filled: amount - remainingAmount,
            timestamp: Date.now()
        };
        orders.push(newOrder);
    }

    users[userIdx] = user;
    
    // Batch save everything to trigger sync
    StorageService.saveUsers(users);
    persist(STORAGE_KEYS.ORDERS, orders);
    persist(STORAGE_KEYS.TRANSACTIONS, state[STORAGE_KEYS.TRANSACTIONS]);

    if (historyUpdates.length > 0) {
        const lastPrice = historyUpdates[historyUpdates.length - 1];
        const history = StorageService.getMarketHistory();
        const now = new Date();
        history.push({
            timestamp: now.getTime(),
            time: now.toLocaleTimeString(),
            price: lastPrice
        });
        StorageService.saveMarketHistory(history);
    }

    return { success: true, message: remainingAmount === 0 ? "Order Filled" : "Order Placed" };
  },
  
  processTransaction: (fromId: string, toId: string, amount: number, description: string): Transaction => {
    const users = StorageService.getUsers();
    
    if (fromId !== 'SYSTEM') {
      const senderIdx = users.findIndex(u => u.id === fromId);
      if (senderIdx === -1) throw new Error("Invalid sender");
      if (users[senderIdx].balance < amount) throw new Error("Insufficient funds");
      users[senderIdx].balance -= amount;
    }

    if (toId !== 'SYSTEM') {
      const receiverIdx = users.findIndex(u => u.id === toId);
      if (receiverIdx === -1) throw new Error("Invalid receiver");
      users[receiverIdx].balance += amount;
    }
    
    StorageService.saveUsers(users);

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
      fromUserId: fromId,
      toUserId: toId,
      amount,
      description,
      timestamp: Date.now()
    };

    const txs = StorageService.getTransactions();
    StorageService.saveTransactions([newTx, ...txs]);

    return newTx;
  }
};
