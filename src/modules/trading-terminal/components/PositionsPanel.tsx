import { useState } from 'react';
import type { Position, Order } from '@/modules/trading-terminal/types';
<<<<<<< HEAD
import { formatPrice, formatAmount, formatPercent, formatDateTime, formatInr, toInr } from '@/modules/trading-terminal/utils/format';
import { X, ChevronDown, ArrowUpRight, ArrowDownRight, Eye, Clock3, ReceiptText } from 'lucide-react';
=======
import { formatPrice, formatAmount, formatPercent, formatDateTime } from '@/modules/trading-terminal/utils/format';
import { X, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

type Props = {
  positions: Position[];
  orders: Order[];
  onClosePosition: (id: string) => void;
  onCancelOrder: (id: string) => void;
};

export function PositionsPanel({ positions, orders, onClosePosition, onCancelOrder }: Props) {
  const [tab, setTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [collapsed, setCollapsed] = useState(false);
<<<<<<< HEAD
  const [selected, setSelected] = useState<Position | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<Position | null>(null);

  const openPositions = positions.filter((p) => p.status === 'open');
  const openOrders = orders.filter((o) => o.status === 'open' || o.status === 'pending');
  const history = positions.filter((p) => p.status === 'closed').sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));

  const feeInr = (p: Position) => toInr((p.openFee ?? 0) + (p.closeFee ?? 0));

  return (
    <div className="border-t border-slate-800 bg-slate-900/95 shrink-0">
      <div className="flex items-center border-b border-slate-800 h-9">
        <button onClick={() => setCollapsed(!collapsed)} className="px-2.5 text-gray-500 hover:text-white">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex gap-0.5">
          {[
            { key: 'positions', label: 'Positions', count: openPositions.length },
            { key: 'orders', label: 'Open Orders', count: openOrders.length },
            { key: 'history', label: 'Trade History', count: history.length },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`px-3 py-2 text-[10px] font-semibold border-b-2 ${tab === t.key ? 'border-yellow-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}{t.count > 0 && <span className="ml-1 rounded-full bg-slate-700 px-1.5 py-0.5 text-[8px]">{t.count}</span>}
            </button>
          ))}
        </div>
        <span className="ml-auto mr-3 text-[8px] text-gray-600">All values in INR</span>
      </div>

      {!collapsed && (
        <div className="overflow-auto max-h-[220px]">
          {tab === 'positions' && (
            <table className="w-full text-[10px]">
              <thead><tr className="text-[8px] uppercase tracking-wider text-gray-500 border-b border-slate-800">
                <th className="text-left px-3 py-1.5">Symbol</th><th className="text-left px-2 py-1.5">Side</th><th className="text-right px-2 py-1.5">Size</th><th className="text-right px-2 py-1.5">Entry</th><th className="text-right px-2 py-1.5">Mark</th><th className="text-right px-2 py-1.5">Margin</th><th className="text-right px-2 py-1.5">PnL</th><th className="text-right px-3 py-1.5">Action</th>
              </tr></thead>
              <tbody>{openPositions.length === 0 ? <tr><td colSpan={8} className="text-center py-4 text-gray-600">No open positions</td></tr> : openPositions.map((p) => {
                const profit = p.pnl >= 0;
                return <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer">
                  <td className="px-3 py-1.5 text-white font-semibold">{p.symbol.split('/')[0]}</td>
                  <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${p.side === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.side === 'buy' ? 'LONG' : 'SHORT'} {p.leverage}x</span></td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-300">{formatAmount(p.amount, 4)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-300">{formatInr(p.entryPrice)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-300">{formatInr(p.currentPrice)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-300">{formatInr(p.margin)}</td>
                  <td className={`px-2 py-1.5 text-right font-mono font-bold ${profit ? 'text-green-400' : 'text-red-400'}`}>{profit ? '+' : ''}{formatInr(p.pnl)}<span className="block text-[7px] opacity-80">{formatPercent(p.pnlPercent)} ROE</span></td>
                  <td className="px-3 py-1.5 text-right"><button onClick={() => setCloseConfirm(p)} className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[9px] font-bold">Close</button></td>
                </tr>;
              })}</tbody>
=======

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
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
            </table>
          )}

          {tab === 'orders' && (
<<<<<<< HEAD
            <table className="w-full text-[10px]"><thead><tr className="text-[8px] uppercase text-gray-500 border-b border-slate-800"><th className="text-left px-3 py-1.5">Time</th><th className="text-left px-2">Symbol</th><th className="text-left px-2">Type</th><th className="text-left px-2">Side</th><th className="text-right px-2">Price</th><th className="text-right px-2">Amount</th><th className="text-right px-3">Cancel</th></tr></thead>
              <tbody>{openOrders.length === 0 ? <tr><td colSpan={7} className="text-center py-4 text-gray-600">No open orders</td></tr> : openOrders.map(o => <tr key={o.id} className="border-b border-slate-800/50"><td className="px-3 py-1.5 text-gray-500">{formatDateTime(o.createdAt)}</td><td className="px-2 text-white">{o.symbol.split('/')[0]}</td><td className="px-2 capitalize text-gray-300">{o.type}</td><td className={`px-2 ${o.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{o.side}</td><td className="px-2 text-right font-mono">{formatInr(o.price)}</td><td className="px-2 text-right font-mono">{formatAmount(o.amount)}</td><td className="px-3 text-right"><button onClick={() => onCancelOrder(o.id)} className="p-1 text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button></td></tr>)}</tbody>
=======
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
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
            </table>
          )}

          {tab === 'history' && (
<<<<<<< HEAD
            <table className="w-full text-[10px]"><thead><tr className="text-[8px] uppercase text-gray-500 border-b border-slate-800"><th className="text-left px-3 py-1.5">Date / Time</th><th className="text-left px-2">Trade</th><th className="text-right px-2">Open</th><th className="text-right px-2">Close</th><th className="text-right px-2">Fee</th><th className="text-right px-2">PnL</th><th className="text-right px-3">Details</th></tr></thead>
              <tbody>{history.length === 0 ? <tr><td colSpan={7} className="text-center py-5 text-gray-600">No closed trades</td></tr> : history.map(p => {
                const profit = p.pnl >= 0;
                return <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-slate-800/50 hover:bg-slate-800/50 cursor-pointer">
                  <td className="px-3 py-2 text-gray-400"><div>{formatDateTime(p.closedAt ?? p.openedAt)}</div><div className="text-[8px] text-gray-600">Open: {formatDateTime(p.openedAt)}</div></td>
                  <td className="px-2"><span className={`font-bold ${p.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{p.side === 'buy' ? 'LONG' : 'SHORT'}</span> <span className="text-white">{p.symbol.split('/')[0]}</span></td>
                  <td className="px-2 text-right font-mono">{formatInr(p.entryPrice)}</td><td className="px-2 text-right font-mono">{formatInr(p.currentPrice)}</td>
                  <td className="px-2 text-right font-mono text-amber-400">₹{feeInr(p).toFixed(2)}</td><td className={`px-2 text-right font-mono font-bold ${profit ? 'text-green-400' : 'text-red-400'}`}>{profit ? '+' : ''}{formatInr(p.pnl)}<span className="block text-[8px]">{formatPercent(p.pnlPercent)}</span></td>
                  <td className="px-3 text-right"><button onClick={(e) => { e.stopPropagation(); setSelected(p); }} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"><Eye className="w-3 h-3" /></button></td>
                </tr>;
              })}</tbody></table>
          )}
        </div>
      )}

      {selected && <TradeDetails position={selected} onClose={() => setSelected(null)} />}
      {closeConfirm && <CloseConfirm position={closeConfirm} onCancel={() => setCloseConfirm(null)} onConfirm={() => { onClosePosition(closeConfirm.id); setCloseConfirm(null); }} />}
    </div>
  );
}

function TradeDetails({ position: p, onClose }: { position: Position; onClose: () => void }) {
  const totalFee = (p.openFee ?? 0) + (p.closeFee ?? 0);
  const profit = p.pnl >= 0;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800"><div><p className="text-[9px] uppercase tracking-widest text-gray-500">Trade Details</p><h3 className="text-lg font-black text-white">{p.symbol.split('/')[0]} <span className={p.side === 'buy' ? 'text-green-400' : 'text-red-400'}>{p.side === 'buy' ? 'LONG' : 'SHORT'}</span></h3></div><button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button></div>
      <div className="grid grid-cols-2 gap-2 p-4">
        <Detail label="Open Price" value={formatInr(p.entryPrice)} /><Detail label="Close Price" value={formatInr(p.currentPrice)} /><Detail label="Quantity" value={formatAmount(p.amount, 6)} /><Detail label="Leverage" value={`${p.leverage}x`} /><Detail label="Margin" value={formatInr(p.margin)} /><Detail label="PnL" value={`${profit ? '+' : ''}${formatInr(p.pnl)}`} tone={profit ? 'green' : 'red'} /><Detail label="Open Fee" value={`₹${toInr(p.openFee ?? 0).toFixed(2)} (${p.openFeeType ?? 'taker'})`} /><Detail label="Close Fee" value={`₹${toInr(p.closeFee ?? 0).toFixed(2)} (${p.closeFeeType ?? 'taker'})`} />
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 grid grid-cols-2 gap-3 text-[10px]
      "><div className="flex gap-2"><Clock3 className="w-3.5 h-3.5 text-gray-500" /><div><div className="text-gray-500">Opened</div><div className="text-gray-200">{formatDateTime(p.openedAt)}</div></div></div><div className="flex gap-2"><Clock3 className="w-3.5 h-3.5 text-gray-500" /><div><div className="text-gray-500">Closed</div><div className="text-gray-200">{p.closedAt ? formatDateTime(p.closedAt) : '—'}</div></div></div></div>
      <div className="px-4 pb-4"><div className="flex items-center justify-between rounded-xl bg-slate-900 p-3"><span className="text-xs text-gray-500">Total Fees</span><span className="font-black text-amber-400">₹{toInr(totalFee).toFixed(2)}</span></div></div>
    </div>
  </div>;
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div><div className={`mt-1 text-sm font-bold font-mono ${tone === 'green' ? 'text-green-400' : tone === 'red' ? 'text-red-400' : 'text-gray-100'}`}>{value}</div></div>;
}

function CloseConfirm({ position: p, onCancel, onConfirm }: { position: Position; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={onCancel}><div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
    <div className="flex items-center gap-3 mb-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}`}><ReceiptText className={`w-5 h-5 ${p.side === 'buy' ? 'text-green-400' : 'text-red-400'}`} /></div><div><div className="text-xs text-gray-500">Close position</div><div className="font-black text-white">{p.symbol.split('/')[0]} {p.side === 'buy' ? 'Long' : 'Short'}</div></div></div>
    <div className="rounded-xl bg-slate-900 p-3 space-y-2 text-[11px]"><div className="flex justify-between"><span className="text-gray-500">Current PnL</span><span className={p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{p.pnl >= 0 ? '+' : ''}{formatInr(p.pnl)}</span></div></div>
    <div className="flex gap-2 mt-4"><button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 text-xs font-bold">Cancel</button><button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold">Confirm Close</button></div>
  </div></div>;
}
=======
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
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
