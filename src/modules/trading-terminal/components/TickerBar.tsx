import type { Ticker } from '@/modules/trading-terminal/types';
import { formatPrice, formatPercent, formatCompact } from '@/modules/trading-terminal/utils/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Props = {
  ticker: Ticker;
};

export function TickerBar({ ticker }: Props) {
  const isUp = ticker.changePercent >= 0;
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500/20 to-slate-700 flex items-center justify-center text-xs font-bold text-yellow-400">
          {ticker.name.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-base font-bold text-white">{ticker.symbol.split('/')[0]}</span>
            <span className="text-xs text-gray-500">/{ticker.symbol.split('/')[1]}</span>
          </div>
          <span className="text-[10px] text-gray-500">{ticker.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xl font-bold font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {formatPrice(ticker.price)}
        </span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {formatPercent(ticker.changePercent)}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 ml-auto text-xs">
        <Stat label="24h High" value={formatPrice(ticker.high24h)} />
        <Stat label="24h Low" value={formatPrice(ticker.low24h)} />
        <Stat label="24h Volume" value={`${formatCompact(ticker.volume24h)} USDT`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-gray-300 font-mono">{value}</span>
    </div>
  );
}
