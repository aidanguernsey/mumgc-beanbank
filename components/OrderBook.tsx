
import React from 'react';
import { Order } from '../types';

interface OrderBookProps {
  orders: Order[];
  currentPrice: number;
  onPriceLevelClick?: (price: number, side: 'BUY' | 'SELL') => void;
}

const OrderBook: React.FC<OrderBookProps> = ({ orders, currentPrice, onPriceLevelClick }) => {
  // Filter and aggregate orders
  const processOrders = (side: 'BUY' | 'SELL') => {
    const filtered = orders.filter(o => o.side === side);
    // Group by price
    const grouped = filtered.reduce((acc, order) => {
      const remaining = order.amount - order.filled;
      acc[order.price] = (acc[order.price] || 0) + remaining;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(grouped)
      .map(([price, amount]) => ({ price: parseFloat(price), amount }))
      .sort((a, b) => side === 'SELL' ? b.price - a.price : b.price - a.price); 
      // Visual sorting: Asks high-to-low (so lowest is near middle), Bids high-to-low (so highest is near middle)
  };

  const asks = processOrders('SELL').sort((a,b) => b.price - a.price); // Highest price at top
  const bids = processOrders('BUY').sort((a,b) => b.price - a.price);  // Highest price at top

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Order Book</h3>
      </div>
      
      <div className="grid grid-cols-2 px-4 py-2 text-xs text-slate-500 font-medium border-b border-slate-800/50">
        <span>Price (Beans)</span>
        <span className="text-right">Amount (BC)</span>
      </div>

      <div className="flex-1 overflow-y-auto text-sm font-mono relative">
        {/* ASKS (Sells) - Red */}
        <div className="flex flex-col justify-end min-h-[120px]">
            {asks.length === 0 && <div className="text-center text-slate-700 py-4 text-xs">No Sellers</div>}
            {asks.map((ask, i) => (
            <div 
              key={`ask-${ask.price}`} 
              className="flex justify-between px-4 py-0.5 hover:bg-slate-800 cursor-pointer transition-colors group"
              onClick={() => onPriceLevelClick?.(ask.price, 'SELL')}
              title="Click to view orders"
            >
                <span className="text-rose-500 group-hover:text-rose-400">{ask.price}</span>
                <span className="text-slate-300 group-hover:text-white">{ask.amount}</span>
            </div>
            ))}
        </div>

        {/* Spread / Current Price */}
        <div className="sticky my-1 py-1 bg-slate-800 text-center border-y border-slate-700 z-10">
            <span className="text-lg font-bold text-white">{currentPrice}</span>
            {asks.length > 0 && bids.length > 0 && (
                 <span className="text-xs text-slate-500 ml-2">
                     Spread: {(asks[asks.length-1].price - bids[0].price).toFixed(1)}
                 </span>
            )}
        </div>

        {/* BIDS (Buys) - Green */}
        <div>
            {bids.map((bid, i) => (
            <div 
              key={`bid-${bid.price}`} 
              className="flex justify-between px-4 py-0.5 hover:bg-slate-800 cursor-pointer transition-colors group"
              onClick={() => onPriceLevelClick?.(bid.price, 'BUY')}
              title="Click to view orders"
            >
                <span className="text-emerald-500 group-hover:text-emerald-400">{bid.price}</span>
                <span className="text-slate-300 group-hover:text-white">{bid.amount}</span>
            </div>
            ))}
            {bids.length === 0 && <div className="text-center text-slate-700 py-4 text-xs">No Buyers</div>}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
