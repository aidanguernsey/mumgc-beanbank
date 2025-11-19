const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- IN-MEMORY DATABASE STATE ---
const db = {
    users: [
        { id: 'admin1', username: 'Choir_Manager', password: 'admin', section: 'Conductor', balance: 10000, beanCoinBalance: 100, avatarUrl: 'https://picsum.photos/seed/admin1/150/150', isAdmin: true },
        { id: 'u1', username: 'Maestro_John', password: '123', section: 'Conductor', balance: 1000, beanCoinBalance: 10, avatarUrl: 'https://picsum.photos/seed/u1/150/150' },
        { id: 'u2', username: 'Tim_TenorOne', password: '123', section: 'Tenor I', balance: 500, beanCoinBalance: 5, avatarUrl: 'https://picsum.photos/seed/u2/150/150' },
        { id: 'u3', username: 'Tom_TenorTwo', password: '123', section: 'Tenor II', balance: 25, beanCoinBalance: 0, avatarUrl: 'https://picsum.photos/seed/u3/150/150' },
        { id: 'u4', username: 'Ben_Baritone', password: '123', section: 'Baritone', balance: 450, beanCoinBalance: 2, avatarUrl: 'https://picsum.photos/seed/u4/150/150' },
        { id: 'u5', username: 'Barry_Bass', password: '123', section: 'Bass', balance: 300, beanCoinBalance: 0, avatarUrl: 'https://picsum.photos/seed/u5/150/150' },
    ],
    transactions: [],
    bets: [],
    dares: [],
    orders: [],
    marketHistory: []
};

// --- BUSINESS LOGIC HELPERS ---

function recordTransaction(fromId, toId, amount, description, category) {
    const tx = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromUserId: fromId,
        toUserId: toId,
        amount,
        description,
        category,
        timestamp: Date.now()
    };
    db.transactions.unshift(tx);
    return tx;
}

function processTransactionLogic(fromId, toId, amount, description, category) {
    // Debit
    if (fromId !== 'SYSTEM') {
        const sender = db.users.find(u => u.id === fromId);
        if (!sender) throw new Error("Sender not found");
        if (sender.balance < amount) throw new Error("Insufficient funds");
        sender.balance -= amount;
    }
    // Credit
    if (toId !== 'SYSTEM') {
        const receiver = db.users.find(u => u.id === toId);
        if (!receiver) throw new Error("Receiver not found");
        receiver.balance += amount;
    }
    // Record
    return recordTransaction(fromId, toId, amount, description, category);
}

// --- API ROUTES ---

// 0. Root / Health Check
app.get('/', (req, res) => {
    res.send('BeanBank Server is Running. Access API at /api/state');
});

// 1. Get Full State (Client Polling)
app.get('/api/state', (req, res) => {
    res.json(db);
});

// 2. Transactions
app.post('/api/transaction', (req, res) => {
    try {
        const { fromId, toId, amount, description, category } = req.body;
        const tx = processTransactionLogic(fromId, toId, amount, description, category);
        res.json({ success: true, transaction: tx });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// 3. Bets
app.post('/api/bets', (req, res) => {
    const bet = req.body;
    db.bets.unshift(bet);
    res.json({ success: true });
});

app.post('/api/bets/wager', (req, res) => {
    try {
        const { userId, betId, optionId, amount } = req.body;
        const bet = db.bets.find(b => b.id === betId);
        if (!bet) throw new Error("Bet not found");

        // Helper to get Option text
        const option = bet.options.find(o => o.id === optionId);
        
        // Process Payment
        processTransactionLogic(userId, 'SYSTEM', amount, `Wager on "${bet.title}" - ${option?.text}`);
        
        // Update Bet
        bet.wagers.push({ userId, optionId, amount });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

app.post('/api/bets/resolve', (req, res) => {
    try {
        const { betId, winningOptionId } = req.body;
        const bet = db.bets.find(b => b.id === betId);
        if (!bet || bet.status !== 'OPEN') throw new Error("Invalid bet");

        const winningWagers = bet.wagers.filter(w => w.optionId === winningOptionId);
        const totalPot = bet.wagers.reduce((sum, w) => sum + w.amount, 0);
        const winnerPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);

        // Payouts
        if (winnerPool > 0) {
            winningWagers.forEach(w => {
                const share = Math.floor((w.amount / winnerPool) * totalPot);
                if (share > 0) {
                    processTransactionLogic('SYSTEM', w.userId, share, `Win: "${bet.title}" Payout`, 'Winnings');
                }
            });
        }

        bet.status = 'RESOLVED';
        bet.winningOptionId = winningOptionId;
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// 4. Dares
app.post('/api/dares', (req, res) => {
    const { creatorId, targetId, description } = req.body;
    const newDare = {
        id: `dare_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        creatorId, targetId, description,
        bounty: 0, pledges: [], status: 'ACTIVE', createdAt: Date.now()
    };
    db.dares.unshift(newDare);
    res.json({ success: true });
});

app.post('/api/dares/pledge', (req, res) => {
    try {
        const { userId, dareId, amount } = req.body;
        const dare = db.dares.find(d => d.id === dareId);
        if (!dare) throw new Error("Dare not found");

        processTransactionLogic(userId, 'SYSTEM', amount, `Pledge for Dare: ${dare.description}`);
        dare.pledges.push({ userId, amount });
        dare.bounty += amount;
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

app.post('/api/dares/resolve', (req, res) => {
    try {
        const { dareId, proof } = req.body;
        const dare = db.dares.find(d => d.id === dareId);
        if (!dare || dare.status !== 'ACTIVE') throw new Error("Invalid dare");

        if (dare.bounty > 0) {
            processTransactionLogic('SYSTEM', dare.targetId, dare.bounty, `Dare Bounty: ${dare.description}`, 'Reward');
        }
        dare.status = 'COMPLETED';
        dare.proof = proof;
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// 5. Admin
app.post('/api/users', (req, res) => {
    db.users = req.body; // Full replace for simplicity
    res.json({ success: true });
});

// 6. Market (Order Book) Engine
app.post('/api/orders', (req, res) => {
    try {
        const { userId, side, type, amount, price } = req.body;
        const user = db.users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");

        const cost = amount * price;

        // 1. Check & Lock Funds
        if (side === 'BUY') {
            if (type === 'LIMIT' && user.balance < cost) throw new Error("Insufficient Beans");
            if (type === 'MARKET' && user.balance < 1) throw new Error("Insufficient Beans");
            if (type === 'LIMIT') user.balance -= cost;
        } else {
            if ((user.beanCoinBalance || 0) < amount) throw new Error("Insufficient BeanCoins");
            if (type === 'LIMIT') user.beanCoinBalance = (user.beanCoinBalance || 0) - amount;
        }

        // 2. Matching Engine
        let remainingAmount = amount;
        const isBuy = side === 'BUY';
        
        // Find matches
        const matches = db.orders
            .filter(o => o.side === (isBuy ? 'SELL' : 'BUY') && o.filled < o.amount)
            .sort((a, b) => isBuy ? a.price - b.price : b.price - a.price);

        let historyUpdates = [];

        for (const match of matches) {
            if (remainingAmount <= 0) break;
            if (type === 'LIMIT') {
                 if (isBuy && match.price > price) break;
                 if (!isBuy && match.price < price) break;
            }

            const tradeAmount = Math.min(remainingAmount, match.amount - match.filled);
            const tradePrice = match.price;
            
            // Credit Maker (Opposite side)
            const maker = db.users.find(u => u.id === match.userId);
            if (maker) {
                if (isBuy) maker.balance += tradeAmount * tradePrice;
                else maker.beanCoinBalance = (maker.beanCoinBalance || 0) + tradeAmount;
            }

            // Credit Taker (Current User)
            if (isBuy) {
                user.beanCoinBalance = (user.beanCoinBalance || 0) + tradeAmount;
                if (type === 'MARKET') {
                    const actualCost = tradeAmount * tradePrice;
                    if (user.balance < actualCost) break;
                    user.balance -= actualCost;
                } else {
                    // Refund difference if limit price was higher than match price
                    user.balance += (price - tradePrice) * tradeAmount;
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

            // Record Market Trade
            recordTransaction(
                isBuy ? user.id : match.userId, 
                isBuy ? match.userId : user.id, 
                tradeAmount * tradePrice, 
                `Market Trade: ${tradeAmount} BC @ ${tradePrice}`, 
                'Investment'
            );
        }

        // 3. Limit Order Creation (if not filled)
        if (type === 'LIMIT' && remainingAmount > 0) {
            db.orders.push({
                id: `ord_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                userId: user.id,
                side, type, price,
                amount,
                filled: amount - remainingAmount,
                timestamp: Date.now()
            });
        }

        // 4. Update History
        if (historyUpdates.length > 0) {
            const lastPrice = historyUpdates[historyUpdates.length - 1];
            const now = new Date();
            db.marketHistory.push({
                timestamp: now.getTime(),
                time: now.toLocaleTimeString(),
                price: lastPrice
            });
            if (db.marketHistory.length > 100) db.marketHistory.shift();
        }

        res.json({ success: true, message: remainingAmount === 0 ? "Order Filled" : "Order Placed" });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const orderIdx = db.orders.findIndex(o => o.id === orderId);
    if (orderIdx !== -1) {
        const order = db.orders[orderIdx];
        // Refund
        if (order.filled < order.amount) {
            const user = db.users.find(u => u.id === order.userId);
            if (user) {
                const remaining = order.amount - order.filled;
                if (order.side === 'BUY') user.balance += (remaining * order.price);
                else user.beanCoinBalance = (user.beanCoinBalance || 0) + remaining;
            }
        }
        db.orders.splice(orderIdx, 1);
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`BeanBank Server running on port ${PORT}`);
    console.log(`Access API at http://localhost:${PORT}/api/state`);
});