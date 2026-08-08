import { formatPrice, formatPercent } from '@/modules/trading-terminal/utils/format';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Props = {
  balance: number;
  totalPnl: number;
  marginUsed: number;
  totalPnlPercent: number;
};

export function BalanceBar({ balance, totalPnl, marginUsed, totalPnlPercent }: Props) {
  const available = balance;
  const isProfit = totalPnl >= 0;

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2">
        <Wallet className="w-4 h-4 text-yellow-500" />
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Equity</span>
          <span className="text-sm font-bold text-white font-mono">{formatPrice(available + marginUsed + totalPnl)} USDT</span>
        </div>
      </div>

      <div className="w-px h-8 bg-slate-800" />

      <div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Available</span>
        <span className="text-sm text-gray-300 font-mono">{formatPrice(available)} USDT</span>
      </div>

      <div className="w-px h-8 bg-slate-800" />

      <div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Margin Used</span>
        <span className="text-sm text-gray-300 font-mono">{formatPrice(marginUsed)} USDT</span>
      </div>

      <div className="w-px h-8 bg-slate-800" />

      <div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Unrealized PnL</span>
        <div className="flex items-center gap-1">
          {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-green-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
          <span className={`text-sm font-mono font-medium ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {formatPrice(totalPnl)} ({formatPercent(totalPnlPercent)})
          </span>
        </div>
      </div>
    </div>
  );
}
