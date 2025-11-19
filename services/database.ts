
import { User, Transaction, Bet, MarketPoint, Order, Dare } from '../types';

// --- CONFIGURATION ---
const STORAGE_KEYS = {
  USERS: 'beanbank_users',
  TRANSACTIONS: 'beanbank_transactions',
  BETS: 'beanbank_bets',
  DARES: 'beanbank_dares',
  MARKET_HISTORY: 'beanbank_market_history',
  ORDERS: 'beanbank_orders'
};

const APP_SCOPE = 'choir_beanbank_mesh_v1'; 

const PEERS = [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wallie.io/gun',
    'https://gun-eu.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun',
    'https://plankton-app-6qfp3.ondigitalocean.app/gun'
];

// --- GUN.JS INITIALIZATION ---
let gun: any;
try {
    const Gun = (window as any).Gun;
    if (typeof Gun === 'function') {
        console.log("Connecting to BeanBank DB via:", PEERS);
        gun = Gun({ peers: PEERS, localStorage: false });
    } else {
        console.warn("Gun constructor not found. Offline mode.");
        throw new Error("Gun not found");
    }
} catch (e) {
    const mockChain = { get: () => mockChain, put: () => mockChain, on: () => mockChain, once: () => mockChain, off: () => mockChain };
    gun = { get: () => mockChain };
}

// --- IN-MEMORY STATE CACHE ---
const state: Record<string, any> = {
    [STORAGE_KEYS.USERS]: [],
    [STORAGE_KEYS.TRANSACTIONS]: [],
    [STORAGE_KEYS.BETS]: [],
    [STORAGE_KEYS.DARES]: [],
    [STORAGE_KEYS.MARKET_HISTORY]: [],
    [STORAGE_KEYS.ORDERS]: []
};

// --- PUBSUB SYSTEM ---
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach(cb => cb());

// --- PERSISTENCE LAYER ---
const persist = (key: string, data: any) => {
    state[key] = data;
    localStorage.setItem(key, JSON.stringify(data));
    try {
        gun.get(APP_SCOPE).get(key).put(JSON.stringify(data));
    } catch (e) {
        console.warn("DB Sync failed for", key);
    }
    notify();
};

// --- INITIALIZATION ---
const SEED_USERS: User[] = [
  { id: 'admin1', username: 'Choir_Manager', password: 'admin', section: 'Conductor', balance: 10000, beanCoinBalance: 100, avatarUrl: 'https://picsum.photos/seed/admin1/150/150', isAdmin: true },
  { id: 'u1', username: 'Maestro_John', password: '123', section: 'Conductor', balance: 1000, beanCoinBalance: 10, avatarUrl: 'https://picsum.photos/seed/u1/150/150' },
  { id: 'u2', username: 'Tim_TenorOne', password: '123', section: 'Tenor I', balance: 500, beanCoinBalance: 5, avatarUrl: 'https://picsum.photos/seed/u2/150/150' },
  { id: 'u3', username: 'Tom_TenorTwo', password: '123', section: 'Tenor II', balance: 25, beanCoinBalance: 0, avatarUrl: 'https://picsum.photos/seed/u3/150/150' },
  { id: 'u4', username: 'Ben_Baritone', password: '123', section: 'Baritone', balance: 450, beanCoinBalance: 2, avatarUrl: 'https://picsum.photos/seed/u4/150/150' },
  { id: 'u5', username: 'Barry_Bass', password: '123', section: 'Bass', balance: 300, beanCoinBalance: 0, avatarUrl: 'https://picsum.photos/seed/u5/150/150' },
];

const init = () => {
    // Hydrate from LocalStorage
    Object.keys(state).forEach(key => {
        const local = localStorage.getItem(key);
        if (local) {
            try { state[key] = JSON.parse(local); } catch (e) { state[key] = []; }
        }
    });

    // Seed if empty
    if (state[STORAGE_KEYS.USERS].length === 0) {
        state[STORAGE_KEYS.USERS] = SEED_USERS;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }

    // Connect to Network
    Object.keys(state).forEach(key => {
        try {
            gun.get(APP_SCOPE).get(key).on((data: any) => {
                if (typeof data === 'string' && data !== localStorage.getItem(key)) {
                    console.log(`[DB] << Inbound Update: ${key}`);
                    state[key] = JSON.parse(data);
                    localStorage.setItem(key, data);
                    notify();
                }
            });
        } catch (e) { console.warn("DB Listener Error", e); }
    });

    // Cross-tab Sync
    window.addEventListener('storage', (event) => {
        if (event.key && Object.values(STORAGE_KEYS).includes(event.key) && event.newValue) {
            state[event.key] = JSON.parse(event.newValue);
            notify();
        }
    });
};

init();

// --- PUBLIC INTERFACE ---
export const db = {
    subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
    },

    resync: () => {
        console.log("[DB] Force Resync Initiated...");
        Object.keys(state).forEach(key => {
            gun.get(APP_SCOPE).get(key).once((data: any) => {
                if (typeof data === 'string' && data !== localStorage.getItem(key)) {
                    state[key] = JSON.parse(data);
                    localStorage.setItem(key, data);
                }
            });
        });
        setTimeout(notify, 500);
    },

    // Typed Accessors
    users: {
        get: (): User[] => state[STORAGE_KEYS.USERS],
        set: (data: User[]) => persist(STORAGE_KEYS.USERS, data)
    },
    transactions: {
        get: (): Transaction[] => state[STORAGE_KEYS.TRANSACTIONS],
        set: (data: Transaction[]) => persist(STORAGE_KEYS.TRANSACTIONS, data)
    },
    bets: {
        get: (): Bet[] => state[STORAGE_KEYS.BETS],
        set: (data: Bet[]) => persist(STORAGE_KEYS.BETS, data)
    },
    dares: {
        get: (): Dare[] => state[STORAGE_KEYS.DARES],
        set: (data: Dare[]) => persist(STORAGE_KEYS.DARES, data)
    },
    orders: {
        get: (): Order[] => state[STORAGE_KEYS.ORDERS],
        set: (data: Order[]) => persist(STORAGE_KEYS.ORDERS, data)
    },
    marketHistory: {
        get: (): MarketPoint[] => state[STORAGE_KEYS.MARKET_HISTORY],
        set: (data: MarketPoint[]) => persist(STORAGE_KEYS.MARKET_HISTORY, data)
    }
};
