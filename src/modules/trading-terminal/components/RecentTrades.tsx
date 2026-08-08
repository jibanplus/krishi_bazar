import { formatPrice, formatAmount, formatTime } from '@/modules/trading-terminal/utils/format';

type Trade = { price: number; amount: number; side: 'buy' | 'sell'; time: number };

type Props = {
  trades: Trade[];
};

export function RecentTrades({ trades }: Props) {
  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.map((t, i) => (
          <div
            key={i}
            className="grid grid-cols-3 px-3 py-[3px] hover:bg-slate-800/50 transition-colors"
          >
            <span className={t.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {formatPrice(t.price)}
            </span>
            <span className="text-right text-gray-300">{formatAmount(t.amount, 4)}</span>
            <span className="text-right text-gray-500">{formatTime(t.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
