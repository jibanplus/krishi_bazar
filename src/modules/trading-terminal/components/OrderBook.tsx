import type { OrderBookLevel } from '@/modules/trading-terminal/types';
<<<<<<< HEAD
import { formatInr, formatAmount } from '@/modules/trading-terminal/utils/format';
=======
import { formatPrice, formatAmount } from '@/modules/trading-terminal/utils/format';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

type Props = {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastPrice: number;
};

export function OrderBook({ bids, asks, lastPrice }: Props) {
  const maxTotal = Math.max(
    ...bids.map((b) => b.total),
    ...asks.map((a) => a.total),
    1
  );

  const displayAsks = asks.slice(0, 12).reverse();
  const displayBids = bids.slice(0, 12);

  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : 0;
  const spreadPercent = lastPrice > 0 ? (spread / lastPrice) * 100 : 0;

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayAsks.map((ask, i) => (
          <OrderBookRow key={`ask-${i}`} level={ask} side="sell" maxTotal={maxTotal} />
        ))}
      </div>

      <div className="px-3 py-2 border-y border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <span className={`text-sm font-bold ${lastPrice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
<<<<<<< HEAD
          {formatInr(lastPrice)}
        </span>
        <span className="text-[10px] text-gray-500">
          Spread: {formatInr(spread)} ({spreadPercent.toFixed(3)}%)
=======
          {formatPrice(lastPrice)}
        </span>
        <span className="text-[10px] text-gray-500">
          Spread: {formatPrice(spread)} ({spreadPercent.toFixed(3)}%)
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayBids.map((bid, i) => (
          <OrderBookRow key={`bid-${i}`} level={bid} side="buy" maxTotal={maxTotal} />
        ))}
      </div>
    </div>
  );
}

function OrderBookRow({ level, side, maxTotal }: { level: OrderBookLevel; side: 'buy' | 'sell'; maxTotal: number }) {
  const pct = (level.total / maxTotal) * 100;
  const bgColor = side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10';
  const textColor = side === 'buy' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="relative grid grid-cols-3 px-3 py-[3px] hover:bg-slate-800/50 transition-colors">
      <div className={`absolute right-0 top-0 h-full ${bgColor}`} style={{ width: `${pct}%` }} />
<<<<<<< HEAD
      <span className={`relative ${textColor} font-medium`}>{formatInr(level.price)}</span>
      <span className="relative text-right text-gray-300">{formatAmount(level.amount, 4)}</span>
      <span className="relative text-right text-gray-500">{formatInr(level.total, 2)}</span>
=======
      <span className={`relative ${textColor} font-medium`}>{formatPrice(level.price)}</span>
      <span className="relative text-right text-gray-300">{formatAmount(level.amount, 4)}</span>
      <span className="relative text-right text-gray-500">{formatAmount(level.total, 2)}</span>
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
    </div>
  );
}
