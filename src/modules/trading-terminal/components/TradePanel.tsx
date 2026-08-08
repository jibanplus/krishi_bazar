<<<<<<< HEAD
import { useEffect, useState } from 'react';
import type { Side, OrderType } from '@/modules/trading-terminal/types';
import { formatAmount, formatInr, fromInr } from '@/modules/trading-terminal/utils/format';
import { X, ShieldCheck } from 'lucide-react';
=======
import { useState } from 'react';
import type { Side, OrderType } from '@/modules/trading-terminal/types';
import { formatPrice } from '@/modules/trading-terminal/utils/format';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

type Props = {
  symbol: string;
  currentPrice: number;
  balance: number;
  onPlaceOrder: (params: { side: Side; type: OrderType; price: number; amount: number }) => void;
<<<<<<< HEAD
  onOpenPosition: (params: { side: Side; price: number; amount: number; leverage: number; feeType: 'maker' | 'taker' }) => void;
=======
  onOpenPosition: (params: { side: Side; price: number; amount: number; leverage: number }) => void;
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  mode: 'spot' | 'margin';
};

export function TradePanel({ symbol, currentPrice, balance, onPlaceOrder, onOpenPosition, mode }: Props) {
  const [side, setSide] = useState<Side>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
<<<<<<< HEAD
  const [priceInr, setPriceInr] = useState(currentPrice * 100);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(5);
  const [percent, setPercent] = useState(0);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setPriceInr(currentPrice * 100); }, [symbol]);

  const price = orderType === 'market' ? currentPrice : fromInr(parseFloat(String(priceInr)) || 0);
  const total = (parseFloat(amount) || 0) * price;
  const marginRequired = mode === 'margin' ? total / leverage : total;
  const isMaker = orderType === 'limit';
=======
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(5);
  const [percent, setPercent] = useState(0);

  const handlePriceChange = (v: string) => {
    setPrice(parseFloat(v) || 0);
  };
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

  const handleAmountChange = (v: string) => {
    setAmount(v);
    const amt = parseFloat(v) || 0;
<<<<<<< HEAD
    const totalUsdt = amt * price;
    setPercent(balance > 0 ? Math.min((totalUsdt / balance) * 100, 100) : 0);
=======
    const total = amt * price;
    setPercent(balance > 0 ? Math.min((total / balance) * 100, 100) : 0);
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  };

  const handlePercent = (p: number) => {
    setPercent(p);
<<<<<<< HEAD
    const totalUsdt = (balance * p) / 100;
    const amt = price > 0 ? totalUsdt / price : 0;
    setAmount(amt > 0 ? amt.toFixed(6) : '');
  };

  const submit = () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    if (mode === 'margin') onOpenPosition({ side, price, amount: amt, leverage, feeType: isMaker ? 'maker' : 'taker' });
    else onPlaceOrder({ side, type: orderType, price, amount: amt });
    setAmount(''); setPercent(0); setConfirm(false);
  };

  return <div className="flex flex-col h-full min-h-0 text-[10px] min-w-0">
    <div className="flex gap-1 p-1.5 border-b border-slate-800 sticky top-0 z-10 bg-slate-950"><button className={`flex-1 py-1 rounded ${mode === 'spot' ? 'bg-slate-700 text-white' : 'text-gray-500'}`}>Spot</button><button className={`flex-1 py-1 rounded ${mode === 'margin' ? 'bg-slate-700 text-white' : 'text-gray-500'}`}>Margin</button></div>
    <div className="flex gap-1 p-1.5"><button onClick={() => setSide('buy')} className={`flex-1 py-1.5 rounded font-black ${side === 'buy' ? 'bg-green-500 text-white' : 'bg-slate-800 text-gray-500'}`}>{mode === 'margin' ? 'Long' : 'Buy'}</button><button onClick={() => setSide('sell')} className={`flex-1 py-1.5 rounded font-black ${side === 'sell' ? 'bg-red-500 text-white' : 'bg-slate-800 text-gray-500'}`}>{mode === 'margin' ? 'Short' : 'Sell'}</button></div>
    <div className="px-2 pb-2 space-y-1.5 overflow-y-auto scrollbar-thin">
      <div className="flex gap-1"><button onClick={() => setOrderType('limit')} className={`flex-1 py-1 rounded ${orderType === 'limit' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-gray-500'}`}>Limit / Maker</button><button onClick={() => setOrderType('market')} className={`flex-1 py-1 rounded ${orderType === 'market' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-gray-500'}`}>Market / Taker</button></div>
      {mode === 'margin' && <div><div className="flex justify-between text-[9px] text-gray-500"><span>Leverage</span><b className="text-white">{leverage}x</b></div><input type="range" min={1} max={50} value={leverage} onChange={e => setLeverage(+e.target.value)} className="w-full accent-yellow-500 h-1" /></div>}
      {orderType === 'limit' && <div><label className="text-[8px] uppercase text-gray-500">Price (INR)</label><div className="flex items-center bg-slate-800 rounded border border-slate-700 mt-0.5"><span className="pl-2 text-gray-500">₹</span><input type="number" value={priceInr || ''} onChange={e => setPriceInr(parseFloat(e.target.value) || 0)} className="w-full bg-transparent px-1.5 py-1.5 text-xs text-white outline-none" /></div></div>}
      <div><label className="text-[8px] uppercase text-gray-500">Amount ({symbol.split('/')[0]})</label><input type="number" value={amount} onChange={e => handleAmountChange(e.target.value)} className="w-full bg-slate-800 rounded border border-slate-700 px-2 py-1.5 text-xs text-white outline-none" placeholder="0.00" /></div>
      <div className="flex gap-1">{[25,50,75,100].map(p => <button key={p} onClick={() => handlePercent(p)} className={`flex-1 py-1 rounded ${percent === p ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-gray-500'}`}>{p}%</button>)}</div>
      <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 space-y-1"><div className="flex justify-between"><span className="text-gray-500">Price</span><span className="text-gray-200 font-mono">{formatInr(price)}</span></div><div className="flex justify-between"><span className="text-gray-500">Notional</span><span className="text-gray-200 font-mono">{formatInr(total)}</span></div>{mode === 'margin' && <div className="flex justify-between"><span className="text-gray-500">Margin</span><span className="text-gray-200 font-mono">{formatInr(marginRequired)}</span></div>}<div className="flex justify-between"><span className="text-gray-500">Available</span><span className="text-gray-300 font-mono">{formatInr(balance)}</span></div></div>
      <div className="sticky bottom-0 z-10 pt-1 pb-1 bg-slate-950"><button onClick={() => setConfirm(true)} disabled={!amount || parseFloat(amount) <= 0} className={`w-full py-2.5 rounded-lg font-black text-xs shadow-lg ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white disabled:opacity-40`}>{mode === 'margin' ? `${side === 'buy' ? 'Open Long' : 'Open Short'}` : `${side === 'buy' ? 'Buy' : 'Sell'}`}</button></div>
    </div>

    {confirm && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={() => setConfirm(false)}><div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800"><div><div className="text-[9px] uppercase tracking-widest text-gray-500">Confirm Trade</div><h3 className="text-lg font-black text-white">{mode === 'margin' ? (side === 'buy' ? 'Open Long' : 'Open Short') : (side === 'buy' ? 'Buy' : 'Sell')} {symbol.split('/')[0]}</h3></div><button onClick={() => setConfirm(false)}><X className="w-4 h-4 text-gray-500" /></button></div>
      <div className="p-4 space-y-2"><div className="grid grid-cols-2 gap-2"><Info label="Price" value={formatInr(price)} /><Info label="Amount" value={formatAmount(parseFloat(amount) || 0, 6)} /><Info label="Notional" value={formatInr(total)} /><Info label="Order" value={isMaker ? 'Limit / Maker' : 'Market / Taker'} />{mode === 'margin' && <Info label="Leverage" value={`${leverage}x`} />}</div><div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-[10px] text-gray-400"><ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />Trade will execute using the selected side and order type.</div></div>
      <div className="flex gap-2 p-4 pt-0"><button onClick={() => setConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-bold">Cancel</button><button onClick={submit} className={`flex-1 py-2.5 rounded-xl font-black text-white ${side === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}>Confirm</button></div>
    </div></div>}
  </div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-900 border border-slate-800 p-2"><div className="text-[8px] uppercase text-gray-500">{label}</div><div className="mt-1 text-xs font-bold text-white font-mono">{value}</div></div>; }
=======
    const total = (balance * p) / 100;
    const amt = price > 0 ? total / price : 0;
    setAmount(amt > 0 ? amt.toFixed(6) : '');
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    if (mode === 'margin') {
      onOpenPosition({ side, price: orderType === 'market' ? currentPrice : price, amount: amt, leverage });
    } else {
      onPlaceOrder({ side, type: orderType, price: orderType === 'market' ? currentPrice : price, amount: amt });
    }
    setAmount('');
    setPercent(0);
  };

  const total = (parseFloat(amount) || 0) * (orderType === 'market' ? currentPrice : price);
  const marginRequired = mode === 'margin' ? total / leverage : total;

  return (
    <div className="flex flex-col h-full">
      {/* Mode tabs */}
      <div className="flex gap-1 p-2 border-b border-slate-800">
        <button
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${mode === 'spot' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Spot
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${mode === 'margin' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Margin
        </button>
      </div>

      {/* Long/Short toggle */}
      <div className="flex gap-1 p-2">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-sm font-bold rounded transition-all ${side === 'buy' ? 'bg-green-500 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
        >
          {mode === 'margin' ? 'Long' : 'Buy'}
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-sm font-bold rounded transition-all ${side === 'sell' ? 'bg-red-500 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
        >
          {mode === 'margin' ? 'Short' : 'Sell'}
        </button>
      </div>

      <div className="px-3 pb-3 space-y-3 flex-1 overflow-y-auto">
        {/* Order type */}
        <div className="flex gap-1">
          <button
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1 text-xs rounded ${orderType === 'limit' ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1 text-xs rounded ${orderType === 'market' ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            Market
          </button>
        </div>

        {/* Leverage slider (margin only) */}
        {mode === 'margin' && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>Leverage</span>
              <span className="text-white font-bold">{leverage}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full accent-yellow-500 h-1"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
              <span>1x</span>
              <span>50x</span>
            </div>
          </div>
        )}

        {/* Price input */}
        {orderType === 'limit' && (
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Price (USDT)</label>
            <div className="flex items-center bg-slate-800 rounded mt-1 border border-slate-700 focus-within:border-yellow-500/50 transition-colors">
              <input
                type="number"
                value={price || ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
                placeholder="0.00"
              />
              <span className="px-2 text-[10px] text-gray-500">USDT</span>
            </div>
          </div>
        )}

        {/* Amount input */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Amount</label>
          <div className="flex items-center bg-slate-800 rounded mt-1 border border-slate-700 focus-within:border-yellow-500/50 transition-colors">
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
              placeholder="0.00"
            />
            <span className="px-2 text-[10px] text-gray-500">{symbol.split('/')[0]}</span>
          </div>
        </div>

        {/* Quick amount presets (USDT) */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Quick Amount (USDT)</label>
          <div className="flex gap-1 mt-1">
            {[10, 50, 100, 500, 1000].map((v) => {
              const amt = (orderType === 'market' ? currentPrice : price) > 0 ? v / (orderType === 'market' ? currentPrice : price) : 0;
              return (
                <button
                  key={v}
                  onClick={() => { setAmount(amt > 0 ? amt.toFixed(6) : ''); setPercent(balance > 0 ? Math.min((v / balance) * 100, 100) : 0); }}
                  className={`flex-1 py-1 text-[10px] rounded transition-colors bg-slate-800 text-gray-500 hover:text-white hover:bg-slate-700`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Percentage slider */}
        <div>
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => handlePercent(p)}
                className={`flex-1 py-1 text-[10px] rounded transition-colors ${percent === p ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-gray-500 hover:text-white'}`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Total</label>
          <div className="flex items-center bg-slate-800 rounded mt-1 border border-slate-700">
            <input
              type="text"
              value={total > 0 ? formatPrice(total) : ''}
              readOnly
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
              placeholder="0.00"
            />
            <span className="px-2 text-[10px] text-gray-500">USDT</span>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1 pt-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Available</span>
            <span className="text-gray-300">{formatPrice(balance)} USDT</span>
          </div>
          {mode === 'margin' && (
            <div className="flex justify-between">
              <span className="text-gray-500">Margin Required</span>
              <span className="text-gray-300">{formatPrice(marginRequired)} USDT</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Est. Fee</span>
            <span className="text-gray-300">{formatPrice(total * 0.001)} USDT</span>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
          className={`w-full py-2.5 text-sm font-bold rounded-lg transition-all ${side === 'buy' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} ${(!amount || parseFloat(amount) <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {mode === 'margin' ? (side === 'buy' ? 'Open Long' : 'Open Short') : (side === 'buy' ? 'Buy' : 'Sell')} {symbol.split('/')[0]}
        </button>
      </div>
    </div>
  );
}
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
