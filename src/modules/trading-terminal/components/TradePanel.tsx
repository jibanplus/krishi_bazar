import { useState } from 'react';
import type { Side, OrderType } from '@/modules/trading-terminal/types';
import { formatPrice } from '@/modules/trading-terminal/utils/format';

type Props = {
  symbol: string;
  currentPrice: number;
  balance: number;
  onPlaceOrder: (params: { side: Side; type: OrderType; price: number; amount: number }) => void;
  onOpenPosition: (params: { side: Side; price: number; amount: number; leverage: number }) => void;
  mode: 'spot' | 'margin';
};

export function TradePanel({ symbol, currentPrice, balance, onPlaceOrder, onOpenPosition, mode }: Props) {
  const [side, setSide] = useState<Side>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(5);
  const [percent, setPercent] = useState(0);

  const handlePriceChange = (v: string) => {
    setPrice(parseFloat(v) || 0);
  };

  const handleAmountChange = (v: string) => {
    setAmount(v);
    const amt = parseFloat(v) || 0;
    const total = amt * price;
    setPercent(balance > 0 ? Math.min((total / balance) * 100, 100) : 0);
  };

  const handlePercent = (p: number) => {
    setPercent(p);
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
