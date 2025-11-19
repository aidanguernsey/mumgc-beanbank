import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Line 
} from 'recharts';
import { MarketPoint } from '../types';

interface MarketChartProps {
  data: MarketPoint[];
}

const MarketChart = React.memo(({ data }: MarketChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="time" 
          tick={{fontSize: 10, fill: '#64748b'}} 
          minTickGap={30}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          domain={['auto', 'auto']} 
          tick={{fontSize: 10, fill: '#64748b'}} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            color: '#1e293b'
          }}
          itemStyle={{ color: '#4f46e5' }}
          labelStyle={{ color: '#64748b', marginBottom: '0.25rem' }}
        />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#4f46e5" 
          strokeWidth={3} 
          dot={false} 
          isAnimationActive={false} 
          activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}, (prev, next) => {
  // Robust comparison to prevent unnecessary re-renders
  if (prev.data === next.data) return true;
  if (prev.data.length !== next.data.length) return false;
  if (prev.data.length === 0) return true;
  
  // Compare the last data point to see if the market actually moved
  const lastPrev = prev.data[prev.data.length - 1];
  const lastNext = next.data[next.data.length - 1];
  
  // Also compare the first point in case the window shifted (scrolled)
  const firstPrev = prev.data[0];
  const firstNext = next.data[0];
  
  return (
    lastPrev.timestamp === lastNext.timestamp && 
    lastPrev.price === lastNext.price &&
    firstPrev.timestamp === firstNext.timestamp
  );
});

export default MarketChart;