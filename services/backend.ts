
import { db } from './database';
import { User, Transaction, Bet, Order, OrderSide, OrderType, Dare, BetWager } from '../types';

// --- BACKEND CONTROLLER ---
// This file mimics a server-side controller. It contains business logic
// and interacts with the 'database' layer.

export const backend = {
    
    processTransaction: (fromId: string, toId: string, amount: number, description: string, category?: string): Transaction => {
        const users = db.users.get();
        
        // Validation & Debit
        if (fromId !== 'SYSTEM') {
            const senderIdx = users.findIndex(u => u.id === fromId);
            if (senderIdx === -1) throw new Error("Sender not found");
            if (users[senderIdx].balance < amount) throw new Error("Insufficient funds");
            users[senderIdx].balance -= amount;
        }

        // Credit
        if (toId !== 'SYSTEM') {
            const receiverIdx = users.findIndex(u => u.id === toId);
            if (receiverIdx === -1) throw new Error("Receiver not found");
            users[receiverIdx].balance += amount;
        }
        
        // Commit User State
        db.users.set(users);

        // Record Transaction
        const newTx: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
            fromUserId: fromId,
            toUserId: toId,
            amount,
            description,
            category,
            timestamp: Date.now()
        };

        const txs = db.transactions.get();
        db.transactions.set([newTx, ...txs]);

        return newTx;
    },

    createBet: (bet: Bet) => {
        const bets = db.bets.get();
        db.bets.set([bet, ...bets]);
    },

    placeWager: (userId: string, betId: string, optionId: string, amount: number) => {
        const bets = db.bets.get();
        const betIdx = bets.findIndex(b => b.id === betId);
        if (betIdx === -1) throw new Error("Bet not found");
        
        // 1. Process Payment
        const bet = bets[betIdx];
        const option = bet.options.find(o => o.id === optionId);
        
        backend.processTransaction(userId, 'SYSTEM', amount, `Wager on "${bet.title}" - ${option?.text}`);

        // 2. Update Bet State
        const newWager: BetWager = { userId, optionId, amount };
        bets[betIdx].wagers.push(newWager);
        
        db.bets.set(bets);
    },

    resolveBet: (betId: string, winningOptionId: string) => {
        const bets = db.bets.get();
        const betIdx = bets.findIndex(b => b.id === betId);
        if (betIdx === -1) return;

        const bet = bets[betIdx];
        if (bet.status !== 'OPEN') return;

        const winningWagers = bet.wagers.filter(w => w.optionId === winningOptionId);
        const totalPot = bet.wagers.reduce((sum, w) => sum + w.amount, 0);
        const winnerPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);

        // Payout Logic
        if (winnerPool > 0) {
            winningWagers.forEach(w => {
                const share = Math.floor((w.amount / winnerPool) * totalPot);
                if (share > 0) {
                    backend.processTransaction('SYSTEM', w.userId, share, `Win: "${bet.title}" Payout`, 'Winnings');
                }
            });
        }

        bets[betIdx].status = 'RESOLVED';
        bets[betIdx].winningOptionId = winningOptionId;
        db.bets.set(bets);
    },

    createDare: (creatorId: string, targetId: string, description: string) => {
        const dares = db.dares.get();
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
        db.dares.set([newDare, ...dares]);
    },

    pledgeToDare: (userId: string, dareId: string, amount: number) => {
        const dares = db.dares.get();
        const dareIdx = dares.findIndex(d => d.id === dareId);
        if (dareIdx === -1) throw new Error("Dare not found");
        
        const dare = dares[dareIdx];
        
        // Payment
        backend.processTransaction(userId, 'SYSTEM', amount, `Pledge for Dare: ${dare.description}`);

        // Update State
        dare.pledges.push({ userId, amount });
        dare.bounty += amount;
        db.dares.set(dares);
    },

    resolveDare: (dareId: string, proof?: string) => {
        const dares = db.dares.get();
        const dareIdx = dares.findIndex(d => d.id === dareId);
        if (dareIdx === -1) throw new Error("Dare not found");
        
        const dare = dares[dareIdx];
        if (dare.status !== 'ACTIVE') throw new Error("Dare already resolved");

        // Payout Bounty
        if (dare.bounty > 0) {
            backend.processTransaction('SYSTEM', dare.targetId, dare.bounty, `Dare Bounty: ${dare.description}`, 'Reward');
        }

        dare.status = 'COMPLETED';
        if (proof) dare.proof = proof;
        db.dares.set(dares);
    },

    // --- MARKET ENGINE ---
    
    processOrder: (userId: string, side: OrderSide, type: OrderType, amount: number, price: number): { success: boolean, message: string } => {
        const users = db.users.get();
        const userIdx = users.findIndex(u => u.id === userId);
        if (userIdx === -1) return { success: false, message: "User not found" };
        
        let user = users[userIdx];
        const cost = amount * price;

        // 1. Check & Lock Funds
        if (side === 'BUY') {
            if (type === 'LIMIT' && user.balance < cost) return { success: false, message: "Insufficient Beans" };
            if (type === 'MARKET' && user.balance < 1) return { success: false, message: "Insufficient Beans" };
            if (type === 'LIMIT') user.balance -= cost;
        } else {
            if ((user.beanCoinBalance || 0) < amount) return { success: false, message: "Insufficient BeanCoins" };
            if (type === 'LIMIT') user.beanCoinBalance = (user.beanCoinBalance || 0) - amount;
        }

        // 2. Matching Engine
        let orders = db.orders.get();
        let remainingAmount = amount;
        const isBuy = side === 'BUY';
        
        const matchOrders = orders
            .filter(o => o.side === (isBuy ? 'SELL' : 'BUY'))
            .sort((a, b) => isBuy ? a.price - b.price : b.price - a.price); // Best price first

        let historyUpdates: number[] = [];

        for (const match of matchOrders) {
            if (remainingAmount <= 0) break;
            if (type === 'LIMIT') {
                 if (isBuy && match.price > price) break;
                 if (!isBuy && match.price < price) break;
            }

            const tradeAmount = Math.min(remainingAmount, match.amount - match.filled);
            const tradePrice = match.price;
            
            // Credit Maker
            const makerIdx = users.findIndex(u => u.id === match.userId);
            if (makerIdx !== -1 && match.userId !== 'SYSTEM') {
                if (isBuy) users[makerIdx].balance += tradeAmount * tradePrice;
                else users[makerIdx].beanCoinBalance = (users[makerIdx].beanCoinBalance || 0) + tradeAmount;
            }

            // Credit Taker (User)
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

            // Record Trade TX
            const tx: Transaction = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                fromUserId: isBuy ? user.id : match.userId,
                toUserId: isBuy ? match.userId : user.id,
                amount: tradeAmount * tradePrice,
                description: `Market Trade: ${tradeAmount} BC @ ${tradePrice}`,
                timestamp: Date.now(),
                category: 'Investment'
            };
            const allTxs = db.transactions.get();
            allTxs.unshift(tx);
            db.transactions.set(allTxs);
        }

        // 3. Cleanup & Limit Order Creation
        orders = orders.filter(o => o.filled < o.amount); // Remove filled

        if (type === 'LIMIT' && remainingAmount > 0) {
            const newOrder: Order = {
                id: `ord_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                userId: user.id,
                side, type, price,
                amount: amount,
                filled: amount - remainingAmount,
                timestamp: Date.now()
            };
            orders.push(newOrder);
        }

        users[userIdx] = user; // Update user with latest balance
        
        // 4. Persist All Changes
        db.users.set(users);
        db.orders.set(orders);

        if (historyUpdates.length > 0) {
            const lastPrice = historyUpdates[historyUpdates.length - 1];
            const history = db.marketHistory.get();
            const now = new Date();
            history.push({
                timestamp: now.getTime(),
                time: now.toLocaleTimeString(),
                price: lastPrice
            });
            const recent = history.slice(-100);
            db.marketHistory.set(recent);
        }

        return { success: true, message: remainingAmount === 0 ? "Order Filled" : "Order Placed" };
    },

    cancelOrder: (orderId: string) => {
        const orders = db.orders.get();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const users = db.users.get();
            const userIdx = users.findIndex(u => u.id === order.userId);
            if (userIdx !== -1) {
                const remaining = order.amount - order.filled;
                if (order.side === 'BUY') {
                    users[userIdx].balance += (remaining * order.price);
                } else {
                    users[userIdx].beanCoinBalance = (users[userIdx].beanCoinBalance || 0) + remaining;
                }
                db.users.set(users);
            }
            const filtered = orders.filter(o => o.id !== orderId);
            db.orders.set(filtered);
        }
    }
};
