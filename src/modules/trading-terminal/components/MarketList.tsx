import type { Ticker } from '@/modules/trading-terminal/types';
import { formatPrice, formatPercent, formatCompact } from '@/modules/trading-terminal/utils/format';

type Props = { tickers: Ticker[]; selectedSymbol: string; onSelect: (symbol: string) => void };

const coinGradients = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#f97316,#eab308)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#3b82f6,#8b5cf6)',
];

export function MarketList({ tickers, selectedSymbol, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--bg-card)' }}>
      <div className="px-2.5 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>COINS / USDT</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tickers.map((t, index) => {
          const up = t.changePercent >= 0;
          const active = selectedSymbol === t.symbol;
          return (
            <button key={t.symbol} onClick={() => onSelect(t.symbol)} className="w-full px-2 py-2 border-b text-left transition-all" style={{ borderColor: 'var(--border-color)', background: active ? 'linear-gradient(90deg, rgba(59,130,246,.14), rgba(139,92,246,.07))' : 'transparent' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-sm" style={{ background: coinGradients[index % coinGradients.length] }}>{t.symbol.split('/')[0].slice(0, 2)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black truncate" style={{ color: 'var(--text-primary)' }}>{t.symbol.split('/')[0]}</span>
                    <span className={`text-[9px] font-bold ${up ? 'text-emerald-500' : 'text-red-500'}`}>{up ? '+' : ''}{formatPercent(t.changePercent)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>USDT</span>
                    <span className="font-mono text-[10px] font-bold" style={{ color: up ? '#10b981' : '#ef4444' }}>{formatPrice(t.price)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-2 py-1.5 border-t text-[8px] flex justify-between" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
        <span>Vol {formatCompact(tickers.reduce((s, t) => s + t.volume24h, 0))}</span><span>{tickers.length} coins</span>
      </div>
    </div>
  );
}
