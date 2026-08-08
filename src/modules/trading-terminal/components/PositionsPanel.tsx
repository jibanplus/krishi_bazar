import { useState } from 'react';
import type { Position, Order } from '@/modules/trading-terminal/types';
import { formatPrice, formatAmount, formatPercent, formatDateTime } from '@/modules/trading-terminal/utils/format';
import { X, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Props = {
  positions: Position[];
  orders: Order[];
  onClosePosition: (id: string) => void;
  onCancelOrder: (id: string) => void;
};

export function PositionsPanel({ positions, orders, onClosePosition, onCancelOrder }: Props) {
  const [tab, setTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [collapsed, setCollapsed] = useState(false);

  const openPositions = positions.filter((p) => p.status === 'open');
  const openOrders = orders.filter((o) => o.status === 'open' || o.status === 'pending');

  return (
    <div className="border-t border-slate-800 bg-slate-900">
      <div className="flex items-center border-b border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="px-3 py-2 text-gray-500 hover:text-white transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex gap-1">
          {[
            { key: 'positions', label: 'Positions', count: openPositions.length },
            { key: 'orders', label: 'Open Orders', count: openOrders.length },
            { key: 'history', label: 'History', count: positions.filter((p) => p.status === 'closed').length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${tab === t.key ? 'border-yellow-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-700 text-[9px] text-gray-300">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          {tab === 'positions' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="text-left px-4 py-2 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2 font-medium">Side</th>
                  <th className="text-right px-4 py-2 font-medium">Size</th>
                  <th className="text-right px-4 py-2 font-medium">Entry</th>
                  <th className="text-right px-4 py-2 font-medium">Mark</th>
                  <th className="text-right px-4 py-2 font-medium">Liq. Price</th>
                  <th className="text-right px-4 py-2 font-medium">Margin</th>
                  <th className="text-right px-4 py-2 font-medium">PnL (ROE)</th>
                  <th className="text-right px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-6 text-gray-600">No open positions</td></tr>
                ) : (
                  openPositions.map((p) => {
                    const isProfit = p.pnl >= 0;
                    return (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-2 text-white font-medium">{p.symbol}</td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.side === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.side === 'buy' ? 'Long' : 'Short'} {p.leverage}x
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatAmount(p.amount, 4)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(p.entryPrice)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(p.currentPrice)}</td>
                      <td className="px-4 py-2 text-right text-gray-500 font-mono">{formatPrice(p.liquidationPrice)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(p.margin)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                        <span className="inline-flex items-center gap-1">
                          {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {formatPrice(p.pnl)}
                        </span>
                        <span className={`block text-[9px] ${isProfit ? 'text-green-500/80' : 'text-red-500/80'}`}>
                          {formatPercent(p.pnlPercent)} ROE
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => onClosePosition(p.id)}
                          className="px-2 py-1 text-[10px] rounded bg-slate-700 text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );})
                )}
              </tbody>
            </table>
          )}

          {tab === 'orders' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                  <th className="text-left px-4 py-2 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Side</th>
                  <th className="text-right px-4 py-2 font-medium">Price</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-right px-4 py-2 font-medium">Cancel</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-6 text-gray-600">No open orders</td></tr>
                ) : (
                  openOrders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-2 text-gray-500">{formatDateTime(o.createdAt)}</td>
                      <td className="px-4 py-2 text-white font-medium">{o.symbol}</td>
                      <td className="px-4 py-2 text-gray-300 capitalize">{o.type}</td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${o.side === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {o.side}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(o.price)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatAmount(o.amount, 4)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(o.total)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => onCancelOrder(o.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === 'history' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                  <th className="text-left px-4 py-2 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2 font-medium">Side</th>
                  <th className="text-right px-4 py-2 font-medium">Entry</th>
                  <th className="text-right px-4 py-2 font-medium">Close</th>
                  <th className="text-right px-4 py-2 font-medium">Size</th>
                  <th className="text-right px-4 py-2 font-medium">PnL (ROE)</th>
                  <th className="text-right px-4 py-2 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {positions.filter((p) => p.status === 'closed').length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-600">No closed positions</td></tr>
                ) : (
                  positions.filter((p) => p.status === 'closed').map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-2 text-white font-medium">{p.symbol}</td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.side === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.side === 'buy' ? 'Long' : 'Short'} {p.leverage}x
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(p.entryPrice)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatPrice(p.currentPrice)}</td>
                      <td className="px-4 py-2 text-right text-gray-300 font-mono">{formatAmount(p.amount, 4)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-medium ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPrice(p.pnl)} ({formatPercent(p.pnlPercent)})
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">{p.closedAt ? formatDateTime(p.closedAt) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
