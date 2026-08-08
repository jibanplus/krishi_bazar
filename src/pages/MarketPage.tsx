import { useCallback, useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { BarChart3, CandlestickChart, LineChart, Wallet, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useMarketData, useAllTickers } from '@/modules/trading-terminal/hooks/useMarketData';
import { TradingChart } from '@/modules/trading-terminal/components/TradingChart';
import { OrderBook } from '@/modules/trading-terminal/components/OrderBook';
import { MarketList } from '@/modules/trading-terminal/components/MarketList';
=======
import { BarChart3, CandlestickChart, LineChart, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useMarketData } from '@/modules/trading-terminal/hooks/useMarketData';
import { TradingChart } from '@/modules/trading-terminal/components/TradingChart';
import { OrderBook } from '@/modules/trading-terminal/components/OrderBook';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
import { formatPrice } from '@/modules/trading-terminal/utils/format';
import type { Ticker } from '@/modules/trading-terminal/types';

type Side = 'buy' | 'sell';
type Position = {
  id: string; symbol: string; side: Side; entry_price: number; amount: number;
  leverage: number; margin: number; liquidation_price: number; status: string;
  opened_at: string; closed_at?: string | null; close_price?: number | null; realized_pnl?: number | null;
  tp_price?: number | null; sl_price?: number | null; tp_executed_at?: string | null; sl_executed_at?: string | null;
};
type ChartType = 'candles' | 'line' | 'area';
<<<<<<< HEAD
type Indicator = 'none' | 'ema' | 'rsi' | 'macd' | 'ema+rsi' | 'ema+macd';
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
const TF_MS: Record<Timeframe, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1D': 86_400_000 };

function aggregateCandles(candles: any[], timeframe: Timeframe) {
  const bucket = TF_MS[timeframe];
  if (timeframe === '1m') return candles;
  const out: any[] = [];
  for (const c of candles) {
    const key = Math.floor(c.time / bucket) * bucket;
    const last = out[out.length - 1];
    if (!last || last.time !== key) out.push({ time: key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
    else { last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; last.volume += c.volume; }
  }
  return out;
}
=======
type Indicator = 'none' | 'ema' | 'rsi' | 'macd';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
const FEE_RATE = 0.001;

function pnlFor(side: Side, entry: number, mark: number, amount: number) {
  return (side === 'buy' ? mark - entry : entry - mark) * amount;
}

function TradeBox({ side, setSide, leverage, setLeverage, amount, setAmount, walletBalance, ticker, busy, session, onOpen, onQuick, currentPrice, tp, sl, setTp, setSl }: any) {
  const [action, setAction] = useState<Side>(side);
  useEffect(() => setAction(side), [side]);
  const quick = [25, 50, 75, 100];

  // Calculate liquidation price
  const liquidationPrice = useMemo(() => {
    const entryPrice = currentPrice;
    const lev = leverage;
    if (side === 'buy') {
      return entryPrice * (1 - 1/lev);
    } else {
      return entryPrice * (1 + 1/lev);
    }
  }, [currentPrice, leverage, side]);

  // Calculate position size and TP/SL profit/loss
  const positionSize = useMemo(() => {
    const investmentAmount = Number(amount) || 0;
    return (investmentAmount * leverage) / currentPrice;
  }, [amount, leverage, currentPrice]);

  const tpProfitLoss = useMemo(() => {
    const tpPrice = Number(tp);
    if (!tpPrice || !positionSize) return null;
    const pnl = pnlFor(side, currentPrice, tpPrice, positionSize);
    return pnl;
  }, [tp, side, currentPrice, positionSize]);

  const slProfitLoss = useMemo(() => {
    const slPrice = Number(sl);
    if (!slPrice || !positionSize) return null;
    const pnl = pnlFor(side, currentPrice, slPrice, positionSize);
    return pnl;
  }, [sl, side, currentPrice, positionSize]);

  return (
    <div className="p-2 sm:p-2.5 space-y-2 text-[10px]">
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => { setSide('buy'); setAction('buy'); }} className={`py-2 rounded-lg text-xs font-extrabold transition-all ${side === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : ''}`} style={side !== 'buy' ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}>LONG</button>
        <button onClick={() => { setSide('sell'); setAction('sell'); }} className={`py-2 rounded-lg text-xs font-extrabold transition-all ${side === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : ''}`} style={side !== 'sell' ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}>SHORT</button>
      </div>

      <div className="flex items-center justify-between rounded-lg px-2 py-1.5 border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Available</span>
        <b style={{ color: 'var(--text-primary)' }}>₹{walletBalance.toFixed(2)}</b>
      </div>

      <div className="rounded-lg border p-2" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-1"><span style={{ color: 'var(--text-secondary)' }}>Leverage</span><b className="text-brand-500">{leverage}x</b></div>
        <input className="w-full accent-brand-500" type="range" min="1" max="50" value={leverage} onChange={e => setLeverage(Number(e.target.value))} />
        <div className="flex justify-between mt-1 text-[8px]" style={{ color: 'var(--text-tertiary)' }}><span>1x</span><span>10x</span><span>25x</span><span>50x</span></div>
      </div>

      <label className="block font-medium" style={{ color: 'var(--text-secondary)' }}>
        Investment Amount (₹)
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="any" className="input-field !px-2.5 !py-2 !text-xs mt-1 w-full" placeholder="Enter amount" />
      </label>

      <div className="grid grid-cols-4 gap-1">
        {quick.map(p => <button key={p} onClick={() => onQuick(p)} className="py-1.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{p}%</button>)}
      </div>

      <div className="rounded-lg border p-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--text-secondary)' }}>Liquidation Price</span>
          <b className={side === 'buy' ? 'text-red-500' : 'text-red-500'}>{formatPrice(liquidationPrice)}</b>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <label className="block font-medium" style={{ color: 'var(--text-secondary)' }}>
          TP (Take Profit)
          <input value={tp} onChange={e => setTp(e.target.value)} type="number" min="0" step="any" className="input-field !px-2.5 !py-2 !text-xs mt-1 w-full" placeholder="TP price" />
          {tpProfitLoss !== null && (
            <div className={`mt-1 text-[9px] font-bold ${tpProfitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {tpProfitLoss >= 0 ? '+' : ''}₹{tpProfitLoss.toFixed(2)}
            </div>
          )}
        </label>
        <label className="block font-medium" style={{ color: 'var(--text-secondary)' }}>
          SL (Stop Loss)
          <input value={sl} onChange={e => setSl(e.target.value)} type="number" min="0" step="any" className="input-field !px-2.5 !py-2 !text-xs mt-1 w-full" placeholder="SL price" />
          {slProfitLoss !== null && (
            <div className={`mt-1 text-[9px] font-bold ${slProfitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {slProfitLoss >= 0 ? '+' : ''}₹{slProfitLoss.toFixed(2)}
            </div>
          )}
        </label>
      </div>

      {/* Buy / Sell actions are intentionally separate from Long / Short selector. */}
      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
        <button disabled={busy || !session} onClick={() => { setSide('buy'); setAction('buy'); onOpen('buy'); }} className="py-2.5 rounded-lg text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 shadow-md shadow-emerald-500/15">BUY</button>
        <button disabled={busy || !session} onClick={() => { setSide('sell'); setAction('sell'); onOpen('sell'); }} className="py-2.5 rounded-lg text-[11px] font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 shadow-md shadow-red-500/15">SELL</button>
      </div>
      <div className="text-[8px] leading-3.5 text-center" style={{ color: 'var(--text-tertiary)' }}>Long = Buy direction · Short = Sell direction · Margin and fees are calculated internally.</div>
    </div>
  );
}

export default function MarketPage() {
  const { session, profile, refreshProfile } = useAuth();
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [indicator, setIndicator] = useState<Indicator>('ema');
<<<<<<< HEAD
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
=======
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  const [positions, setPositions] = useState<Position[]>([]);
  const [walletBalance, setWalletBalance] = useState(Number(profile?.balance || 0));
  const [tradeHistory, setTradeHistory] = useState<Position[]>([]);
  const [side, setSide] = useState<Side>('buy');
  const [leverage, setLeverage] = useState(5);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editTp, setEditTp] = useState('');
  const [editSl, setEditSl] = useState('');
  const [tradeTp, setTradeTp] = useState('');
  const [tradeSl, setTradeSl] = useState('');

  const { data } = useMarketData(symbol, 1200);
<<<<<<< HEAD
  const { tickers } = useAllTickers(1500);
  const ticker = data.ticker;
  const chartCandles = useMemo(() => aggregateCandles(data.candles, timeframe), [data.candles, timeframe]);
=======
  const ticker = data.ticker;
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

  const refreshTradingData = useCallback(async () => {
    if (!session?.user.id) { setWalletBalance(Number(profile?.balance || 0)); setPositions([]); setTradeHistory([]); return; }
    const uid = session.user.id;
    const [{ data: wallet }, { data: open }, { data: history }] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', uid).maybeSingle(),
      supabase.from('perp_positions').select('*').eq('user_id', uid).eq('status', 'open').order('opened_at', { ascending: false }),
      supabase.from('perp_positions').select('*').eq('user_id', uid).eq('status', 'closed').order('closed_at', { ascending: false }).limit(50),
    ]);
    setWalletBalance(Number(wallet?.balance ?? profile?.balance ?? 0));
    setPositions((open || []) as Position[]);
    setTradeHistory((history || []) as Position[]);
  }, [session?.user.id, profile?.balance]);

  useEffect(() => { refreshTradingData(); }, [refreshTradingData]);
  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase.channel(`trading-wallet-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${session.user.id}` }, refreshTradingData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perp_positions', filter: `user_id=eq.${session.user.id}` }, refreshTradingData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id, refreshTradingData]);

  const livePositions = positions.map(p => ({ ...p, mark: ticker.price, pnl: pnlFor(p.side, Number(p.entry_price), ticker.price, Number(p.amount)) }));
  const unrealizedPnl = livePositions.reduce((sum, p) => sum + p.pnl, 0);
  const marginUsed = positions.reduce((sum, p) => sum + Number(p.margin), 0);
  const equity = walletBalance + unrealizedPnl;
  const investmentAmount = Number(amount || 0);
  const marginRequired = investmentAmount;
<<<<<<< HEAD
  const showEma = indicator === 'ema' || indicator === 'ema+rsi' || indicator === 'ema+macd';
  const showRsi = indicator === 'rsi' || indicator === 'ema+rsi';
  const showMacd = indicator === 'macd' || indicator === 'ema+macd';
=======
  const showEma = indicator === 'ema';
  const showRsi = indicator === 'rsi';
  const showMacd = indicator === 'macd';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => { setNotice({ text, type }); window.setTimeout(() => setNotice(null), 3500); };

  const openPosition = async (requestedSide: Side = side) => {
    if (!session) { notify('Please login before trading.', 'err'); return; }
    const investmentAmount = Number(amount);
    if (!investmentAmount || investmentAmount <= 0) { notify('Enter a valid amount.', 'err'); return; }
    if (investmentAmount > walletBalance) { notify('Insufficient wallet balance.', 'err'); return; }
    
    // Calculate size based on investment amount and leverage
    const qty = (investmentAmount * leverage) / ticker.price;
    
    setBusy(true);
    const { data: result, error } = await supabase.rpc('open_perp_position', { p_symbol: symbol, p_side: requestedSide, p_entry_price: ticker.price, p_amount: qty, p_leverage: leverage, p_fee_rate: FEE_RATE });
    setBusy(false);
    if (error || !result?.success) { notify(result?.error || error?.message || 'Unable to open position.', 'err'); return; }
    
    // Set TP/SL if provided
    if (result?.position_id && (tradeTp || tradeSl)) {
      const tpPrice = tradeTp ? Number(tradeTp) : null;
      const slPrice = tradeSl ? Number(tradeSl) : null;
      await supabase.rpc('update_position_tp_sl', { 
        p_position_id: result.position_id, 
        p_tp_price: tpPrice, 
        p_sl_price: slPrice 
      });
    }
    
    setAmount(''); setTradeTp(''); setTradeSl(''); await refreshTradingData(); await refreshProfile();
    notify(`${requestedSide === 'buy' ? 'Long / Buy' : 'Short / Sell'} opened at ${formatPrice(ticker.price)}`);
  };

  const closePosition = async (id: string, markPrice = ticker.price) => {
    if (!session) return;
    setBusy(true);
    const { data: result, error } = await supabase.rpc('close_perp_position', { p_position_id: id, p_close_price: markPrice, p_fee_rate: FEE_RATE });
    setBusy(false);
    if (error || !result?.success) { notify(result?.error || error?.message || 'Unable to close position.', 'err'); return; }
    await refreshTradingData(); await refreshProfile();
    notify(`Position closed. PnL ${Number(result.realized_pnl || 0) >= 0 ? '+' : ''}${Number(result.realized_pnl || 0).toFixed(2)}`);
  };

  useEffect(() => {
    if (!positions.length || busy) return;
    const hits = positions.filter(p => (p.side === 'buy' && ticker.price <= Number(p.liquidation_price)) || (p.side === 'sell' && ticker.price >= Number(p.liquidation_price)));
    if (hits.length) hits.forEach(p => closePosition(p.id, ticker.price));
  }, [ticker.price]);

  const quickAmount = (percent: number) => setAmount((walletBalance * percent / 100).toFixed(2));

  const updatePositionTpSl = async (positionId: string) => {
    if (!session) return;
    setBusy(true);
    const tpPrice = editTp ? Number(editTp) : null;
    const slPrice = editSl ? Number(editSl) : null;
    
    const { data: result, error } = await supabase.rpc('update_position_tp_sl', { 
      p_position_id: positionId, 
      p_tp_price: tpPrice, 
      p_sl_price: slPrice 
    });
    
    setBusy(false);
    if (error || !result?.success) { 
      notify(result?.error || error?.message || 'Unable to update TP/SL.', 'err'); 
      return; 
    }
    
    setEditingPosition(null);
    setEditTp('');
    setEditSl('');
    await refreshTradingData();
    notify('TP/SL updated successfully');
  };

  return (
    <div className="market-terminal-page w-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1700px] mx-auto px-1.5 sm:px-2 py-1.5">
        <div className="rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 border-b text-[10px]" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 font-black" style={{ color: 'var(--text-primary)' }}><span className="text-sm">{ticker.symbol.split('/')[0]}</span><span className={ticker.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}>{ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%</span><span className="font-mono text-xs">{formatPrice(ticker.price)}</span><span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE</span></div>
            <div className="ml-auto flex items-center gap-2.5"><span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-brand-500" /> <b>₹{walletBalance.toFixed(2)}</b></span><span>Equity <b className={unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>₹{equity.toFixed(2)}</b></span><span>PnL <b className={unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>{unrealizedPnl >= 0 ? '+' : ''}₹{unrealizedPnl.toFixed(2)}</b></span></div>
          </div>

<<<<<<< HEAD
          <div className="grid grid-cols-1 lg:grid-cols-[205px_minmax(0,1fr)_245px] min-h-0 lg:h-[calc(100vh-160px)] lg:min-h-[650px]">
            <aside className="hidden lg:block min-h-0 border-r" style={{ borderColor: 'var(--border-color)' }}>
              <div className="h-full"><div className="px-2.5 py-2 border-b text-[9px] font-black tracking-widest" style={{borderColor:'var(--border-color)',color:'var(--text-secondary)'}}>MARKETS</div><MarketList tickers={tickers.filter(t => ['BTC/USDT','ETH/USDT','SOL/USDT','DOGE/USDT'].includes(t.symbol))} selectedSymbol={symbol} onSelect={setSymbol} /></div>
            </aside>
            <section className="min-w-0 flex flex-col min-h-0">
              <div className="lg:hidden flex gap-1.5 px-2 py-1.5 overflow-x-auto border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                {tickers.filter(t => ['BTC/USDT','ETH/USDT','SOL/USDT','DOGE/USDT'].includes(t.symbol)).map(t => (
                  <button key={t.symbol} onClick={() => setSymbol(t.symbol)} className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[9px] font-black ${symbol === t.symbol ? 'border-brand-500/50 bg-brand-500/10 text-brand-500' : ''}`} style={symbol !== t.symbol ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : undefined}>
                    {t.symbol.split('/')[0]} <span className={t.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}>{t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {([["candles", CandlestickChart], ["line", LineChart], ["area", BarChart3]] as const).map(([type, Icon]) => <button key={type} onClick={() => setChartType(type)} title={type} className={`p-1.5 rounded ${chartType === type ? 'bg-brand-500/15 text-brand-500' : ''}`} style={chartType !== type ? { color: 'var(--text-secondary)' } : undefined}><Icon className="w-3.5 h-3.5" /></button>)}
                <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
                {(['1m','5m','15m','1h','4h','1D'] as Timeframe[]).map(tf => <button key={tf} onClick={() => setTimeframe(tf)} className={`px-2 py-1 rounded text-[9px] font-bold ${tf === timeframe ? 'bg-brand-500/15 text-brand-500' : ''}`} style={tf !== timeframe ? { color: 'var(--text-secondary)' } : undefined}>{tf}</button>)}
                <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
                <div className="flex gap-1">{(['none','ema','rsi','macd','ema+rsi','ema+macd'] as Indicator[]).map(k => <button key={k} onClick={() => setIndicator(k)} className={`px-1.5 py-1 rounded text-[8px] uppercase font-bold ${indicator === k ? 'bg-brand-500/15 text-brand-500' : ''}`} style={indicator !== k ? { color: 'var(--text-secondary)' } : undefined}>{k === 'none' ? 'OFF' : k}</button>)}</div>
              </div>
              <div className="flex-1 min-h-[420px] lg:min-h-0 p-0.5 overflow-hidden"><TradingChart candles={chartCandles} chartType={chartType} showEma={showEma} showRsi={showRsi} showMacd={showMacd} height={430} /></div>
=======
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_245px] min-h-0 lg:h-[calc(100vh-160px)] lg:min-h-[650px]">
            <section className="min-w-0 flex flex-col min-h-0">
              <div className="flex items-center gap-1 px-2 py-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {([["candles", CandlestickChart], ["line", LineChart], ["area", BarChart3]] as const).map(([type, Icon]) => <button key={type} onClick={() => setChartType(type)} className={`p-1.5 rounded ${chartType === type ? 'bg-brand-500/15 text-brand-500' : ''}`} style={chartType !== type ? { color: 'var(--text-secondary)' } : undefined}><Icon className="w-3.5 h-3.5" /></button>)}
                <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
                {(['1m','5m','15m','1h','4h','1D'] as const).map(tf => <button key={tf} className={`px-2 py-1 rounded text-[9px] ${tf === '15m' ? 'bg-brand-500/15 text-brand-500' : ''}`} style={tf !== '15m' ? { color: 'var(--text-secondary)' } : undefined}>{tf}</button>)}
                <div className="ml-auto flex gap-1">{(['none','ema','rsi','macd'] as Indicator[]).map(k => <button key={k} onClick={() => setIndicator(k)} className={`px-1.5 py-1 rounded text-[8px] uppercase ${indicator === k ? 'bg-brand-500/15 text-brand-500' : ''}`} style={indicator !== k ? { color: 'var(--text-secondary)' } : undefined}>{k}</button>)}</div>
              </div>
              <div className="flex-1 min-h-[360px] lg:min-h-0 p-0.5"><TradingChart candles={data.candles} showEma={showEma} showRsi={showRsi} showMacd={showMacd} height={390} /></div>
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

              <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 px-2 py-1.5 border-b text-[9px] font-bold" style={{ borderColor: 'var(--border-color)' }}>
                  <button onClick={() => setActiveTab('open')} className={`px-2 py-1 rounded ${activeTab === 'open' ? 'bg-brand-500/15 text-brand-500' : ''}`} style={activeTab !== 'open' ? { color: 'var(--text-secondary)' } : undefined}>OPEN ({positions.length})</button>
                  <button onClick={() => setActiveTab('history')} className={`px-2 py-1 rounded ${activeTab === 'history' ? 'bg-brand-500/15 text-brand-500' : ''}`} style={activeTab !== 'history' ? { color: 'var(--text-secondary)' } : undefined}>HISTORY ({tradeHistory.length})</button>
                  <span className="ml-auto">PnL <b className={unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>{unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}</b></span>
                </div>
                <div className="max-h-48 overflow-auto">
                  {activeTab === 'open' ? (
                    positions.length ? positions.map(p => {
                      const live = livePositions.find(x => x.id === p.id)!;
                      const isEditing = editingPosition === p.id;
                      return (
                        <div key={p.id} className="border-t text-[9px]" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-2 py-1.5">
                            <div><b>{p.symbol.split('/')[0]}</b><span className={`ml-1 font-bold ${p.side === 'buy' ? 'text-emerald-500' : 'text-red-500'}`}>{p.side === 'buy' ? 'LONG' : 'SHORT'} {p.leverage}x</span></div>
                            <span>Entry {Number(p.entry_price).toFixed(2)}</span>
                            <span>Mark {live.mark.toFixed(2)}</span>
                            <span className={live.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>PnL {live.pnl >= 0 ? '+' : ''}{live.pnl.toFixed(2)}</span>
                            <div className="flex gap-1">
                              <button disabled={busy} onClick={() => closePosition(p.id)} className="px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20">Close</button>
                              <button disabled={busy} onClick={() => { setEditingPosition(p.id); setEditTp(p.tp_price?.toString() || ''); setEditSl(p.sl_price?.toString() || ''); }} className="px-2 py-1 rounded bg-brand-500/10 text-brand-500 hover:bg-brand-500/20">Edit</button>
                            </div>
                          </div>
                          {isEditing && (
                            <div className="px-2 py-2 border-t grid grid-cols-2 gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                              <div>
                                <label className="block text-[8px] mb-1" style={{ color: 'var(--text-secondary)' }}>TP Price</label>
                                <input value={editTp} onChange={e => setEditTp(e.target.value)} type="number" step="any" className="input-field !px-2 !py-1 !text-[9px] w-full" placeholder="TP price" />
                              </div>
                              <div>
                                <label className="block text-[8px] mb-1" style={{ color: 'var(--text-secondary)' }}>SL Price</label>
                                <input value={editSl} onChange={e => setEditSl(e.target.value)} type="number" step="any" className="input-field !px-2 !py-1 !text-[9px] w-full" placeholder="SL price" />
                              </div>
                              <div className="col-span-2 flex gap-1">
                                <button disabled={busy} onClick={() => updatePositionTpSl(p.id)} className="flex-1 py-1 rounded bg-emerald-500 text-white text-[9px] font-bold">Save</button>
                                <button disabled={busy} onClick={() => { setEditingPosition(null); setEditTp(''); setEditSl(''); }} className="flex-1 py-1 rounded bg-gray-500 text-white text-[9px] font-bold">Cancel</button>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 px-2 py-1 text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
                            <span>Liq: {formatPrice(Number(p.liquidation_price))}</span>
                            <span>Margin: ₹{Number(p.margin).toFixed(2)}</span>
                            {p.tp_price && <span className="text-emerald-500">TP: {formatPrice(p.tp_price)}</span>}
                            {p.sl_price && <span className="text-red-500">SL: {formatPrice(p.sl_price)}</span>}
                          </div>
                        </div>
                      );
                    }) : <div className="px-2 py-3 text-center text-[9px]" style={{ color: 'var(--text-secondary)' }}>No open positions</div>
                  ) : (
                    tradeHistory.length ? tradeHistory.map(p => (
                      <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 border-t text-[9px]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                        <span>{p.symbol.split('/')[0]} {p.side === 'buy' ? 'LONG' : 'SHORT'} • {new Date(p.closed_at || p.opened_at).toLocaleString()}</span>
                        <span>{Number(p.close_price || 0).toFixed(2)}</span>
                        <b className={Number(p.realized_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}>{Number(p.realized_pnl || 0) >= 0 ? '+' : ''}{Number(p.realized_pnl || 0).toFixed(2)}</b>
                      </div>
                    )) : <div className="px-2 py-3 text-center text-[9px]" style={{ color: 'var(--text-secondary)' }}>No trade history</div>
                  )}
                </div>
              </div>
            </section>

            <aside className="border-l min-h-0" style={{ borderColor: 'var(--border-color)' }}>
              <div className="hidden lg:block border-b" style={{ borderColor: 'var(--border-color)' }}><OrderBook bids={data.orderBook.bids} asks={data.orderBook.asks} lastPrice={ticker.price} /></div>
              <div className="lg:hidden border-b" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => setShowOrderBook(v => !v)} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}><span>ORDER BOOK</span>{showOrderBook ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>
                {showOrderBook && <div className="max-h-48 overflow-hidden"><OrderBook bids={data.orderBook.bids} asks={data.orderBook.asks} lastPrice={ticker.price} /></div>}
              </div>
              <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="px-2.5 py-1.5 border-b text-[10px] font-black" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>TRADE <span className="text-brand-500">{ticker.symbol}</span></div>
                <TradeBox side={side} setSide={setSide} leverage={leverage} setLeverage={setLeverage} amount={amount} setAmount={setAmount} walletBalance={walletBalance} ticker={ticker} busy={busy} session={session} onOpen={openPosition} onQuick={quickAmount} currentPrice={ticker.price} tp={tradeTp} sl={tradeSl} setTp={setTradeTp} setSl={setTradeSl} />
              </div>
            </aside>
          </div>
        </div>

        {!session && <div className="mt-1.5 px-3 py-2 rounded-lg border text-[10px]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>Login is required to open Long/Short positions. Live market data remains visible.</div>}
        {notice && <div className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg border text-xs shadow-lg ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>{notice.text}</div>}
      </div>
    </div>
  );
}
