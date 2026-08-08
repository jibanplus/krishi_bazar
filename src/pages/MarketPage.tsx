import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CandlestickChart, LineChart, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useMarketData, useAllTickers } from '@/modules/trading-terminal/hooks/useMarketData';
import { TradingChart } from '@/modules/trading-terminal/components/TradingChart';
import { OrderBook } from '@/modules/trading-terminal/components/OrderBook';
import { MarketList } from '@/modules/trading-terminal/components/MarketList';
import { formatPrice } from '@/modules/trading-terminal/utils/format';
import type { Ticker } from '@/modules/trading-terminal/types';

type Side = 'buy' | 'sell';
type Position = {
  id: string; symbol: string; side: Side; entry_price: number; amount: number;
  leverage: number; margin: number; liquidation_price: number; status: string;
  opened_at: string; closed_at?: string | null; close_price?: number | null; realized_pnl?: number | null;
};
type ChartType = 'candles' | 'line' | 'area';
type Indicator = 'none' | 'ema' | 'rsi' | 'macd';
const FEE_RATE = 0.001;

function pnlFor(side: Side, entry: number, mark: number, amount: number) {
  return (side === 'buy' ? mark - entry : entry - mark) * amount;
}

function coinLabel(t: Ticker) {
  return t.symbol.split('/')[0];
}

function CompactCoinStrip({ tickers, selectedSymbol, onSelect }: { tickers: Ticker[]; selectedSymbol: string; onSelect: (s: string) => void }) {
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto px-2 py-1.5 border-b scrollbar-hide" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
      {tickers.map((t, i) => {
        const up = t.changePercent >= 0;
        const active = t.symbol === selectedSymbol;
        return (
          <button key={t.symbol} onClick={() => onSelect(t.symbol)} className={`min-w-[112px] sm:min-w-[126px] shrink-0 rounded-lg px-2.5 py-1.5 text-left transition-all border ${active ? 'ring-1 ring-brand-500/50' : ''}`} style={{ background: active ? 'linear-gradient(135deg, rgba(59,130,246,.18), rgba(139,92,246,.10))' : 'var(--bg-card)', borderColor: active ? 'rgba(59,130,246,.45)' : 'var(--border-color)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-[11px]" style={{ color: 'var(--text-primary)' }}>{coinLabel(t)}/USDT</span>
              <span className={`text-[9px] font-bold ${up ? 'text-emerald-500' : 'text-red-500'}`}>{up ? '+' : ''}{t.changePercent.toFixed(2)}%</span>
            </div>
            <div className="mt-0.5 font-mono text-[12px] font-black tracking-tight" style={{ color: up ? '#10b981' : '#ef4444' }}>{formatPrice(t.price)}</div>
          </button>
        );
      })}
    </div>
  );
}

function TradeBox({ side, setSide, leverage, setLeverage, amount, setAmount, walletBalance, ticker, busy, session, onOpen, onQuick }: any) {
  const [action, setAction] = useState<Side>(side);
  useEffect(() => setAction(side), [side]);
  const quick = [25, 50, 75, 100];
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
        Size ({ticker.symbol.split('/')[0]})
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="any" className="input-field !px-2.5 !py-2 !text-xs mt-1 w-full" placeholder="Enter size" />
      </label>

      <div className="grid grid-cols-4 gap-1">
        {quick.map(p => <button key={p} onClick={() => onQuick(p)} className="py-1.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{p}%</button>)}
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
  const [positions, setPositions] = useState<Position[]>([]);
  const [walletBalance, setWalletBalance] = useState(Number(profile?.balance || 0));
  const [tradeHistory, setTradeHistory] = useState<Position[]>([]);
  const [side, setSide] = useState<Side>('buy');
  const [leverage, setLeverage] = useState(5);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [showOrderBook, setShowOrderBook] = useState(true);

  const { data } = useMarketData(symbol, 1200);
  const { tickers } = useAllTickers(1800);
  const ticker = useMemo(() => tickers.find(t => t.symbol === symbol) || data.ticker, [tickers, symbol, data.ticker]);

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
  const notional = Number(amount || 0) * ticker.price;
  const marginRequired = notional / leverage;
  const showEma = indicator === 'ema';
  const showRsi = indicator === 'rsi';
  const showMacd = indicator === 'macd';

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => { setNotice({ text, type }); window.setTimeout(() => setNotice(null), 3500); };

  const openPosition = async (requestedSide: Side = side) => {
    if (!session) { notify('Please login before trading.', 'err'); return; }
    const qty = Number(amount);
    if (!qty || qty <= 0) { notify('Enter a valid amount.', 'err'); return; }
    if (marginRequired > walletBalance) { notify('Insufficient wallet balance.', 'err'); return; }
    setBusy(true);
    const { data: result, error } = await supabase.rpc('open_perp_position', { p_symbol: symbol, p_side: requestedSide, p_entry_price: ticker.price, p_amount: qty, p_leverage: leverage, p_fee_rate: FEE_RATE });
    setBusy(false);
    if (error || !result?.success) { notify(result?.error || error?.message || 'Unable to open position.', 'err'); return; }
    setAmount(''); await refreshTradingData(); await refreshProfile();
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

  const quickAmount = (percent: number) => setAmount(((walletBalance * percent / 100) * leverage / ticker.price).toFixed(6));

  return (
    <div className="market-terminal-page w-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1700px] mx-auto px-1.5 sm:px-2 py-1.5">
        <div className="rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 border-b text-[10px]" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 font-black" style={{ color: 'var(--text-primary)' }}><span className="text-sm">{ticker.symbol}</span><span className={ticker.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}>{ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%</span><span className="font-mono text-xs">{formatPrice(ticker.price)}</span><span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE</span></div>
            <div className="ml-auto flex items-center gap-2.5"><span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-brand-500" /> <b>₹{walletBalance.toFixed(2)}</b></span><span>Equity <b className={unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>₹{equity.toFixed(2)}</b></span><span>PnL <b className={unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>{unrealizedPnl >= 0 ? '+' : ''}₹{unrealizedPnl.toFixed(2)}</b></span></div>
          </div>

          <CompactCoinStrip tickers={tickers} selectedSymbol={symbol} onSelect={setSymbol} />

          <div className="grid grid-cols-1 lg:grid-cols-[175px_minmax(0,1fr)_245px] min-h-0 lg:h-[calc(100vh-160px)] lg:min-h-[650px]">
            <aside className="hidden lg:block border-r min-h-0" style={{ borderColor: 'var(--border-color)' }}><MarketList tickers={tickers} selectedSymbol={symbol} onSelect={setSymbol} /></aside>

            <section className="min-w-0 flex flex-col min-h-0">
              <div className="flex items-center gap-1 px-2 py-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {([["candles", CandlestickChart], ["line", LineChart], ["area", BarChart3]] as const).map(([type, Icon]) => <button key={type} onClick={() => setChartType(type)} className={`p-1.5 rounded ${chartType === type ? 'bg-brand-500/15 text-brand-500' : ''}`} style={chartType !== type ? { color: 'var(--text-secondary)' } : undefined}><Icon className="w-3.5 h-3.5" /></button>)}
                <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
                {(['1m','5m','15m','1h','4h','1D'] as const).map(tf => <button key={tf} className={`px-2 py-1 rounded text-[9px] ${tf === '15m' ? 'bg-brand-500/15 text-brand-500' : ''}`} style={tf !== '15m' ? { color: 'var(--text-secondary)' } : undefined}>{tf}</button>)}
                <div className="ml-auto flex gap-1">{(['none','ema','rsi','macd'] as Indicator[]).map(k => <button key={k} onClick={() => setIndicator(k)} className={`px-1.5 py-1 rounded text-[8px] uppercase ${indicator === k ? 'bg-brand-500/15 text-brand-500' : ''}`} style={indicator !== k ? { color: 'var(--text-secondary)' } : undefined}>{k}</button>)}</div>
              </div>
              <div className="flex-1 min-h-[360px] lg:min-h-0 p-0.5"><TradingChart candles={data.candles} showEma={showEma} showRsi={showRsi} showMacd={showMacd} height={390} /></div>

              <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold" style={{ color: 'var(--text-secondary)' }}><span className="text-brand-500">OPEN ({positions.length})</span><span>HISTORY ({tradeHistory.length})</span><span className="ml-auto">PnL <b className={unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>{unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}</b></span></div>
                <div className="max-h-32 overflow-auto">
                  {positions.length ? positions.map(p => { const live = livePositions.find(x => x.id === p.id)!; return <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-2 py-1.5 border-t text-[9px]" style={{ borderColor: 'var(--border-color)' }}><div><b>{p.symbol.split('/')[0]}</b><span className={`ml-1 font-bold ${p.side === 'buy' ? 'text-emerald-500' : 'text-red-500'}`}>{p.side === 'buy' ? 'LONG' : 'SHORT'} {p.leverage}x</span></div><span>Entry {Number(p.entry_price).toFixed(2)}</span><span>Mark {live.mark.toFixed(2)}</span><span className={live.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>PnL {live.pnl >= 0 ? '+' : ''}{live.pnl.toFixed(2)}</span><button disabled={busy} onClick={() => closePosition(p.id)} className="px-2 py-1 rounded bg-brand-500/10 text-brand-500 hover:bg-brand-500/20">Close</button></div>; }) : <div className="px-2 py-3 text-center text-[9px]" style={{ color: 'var(--text-secondary)' }}>No open positions</div>}
                  {tradeHistory.slice(0, 6).map(p => <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 border-t text-[9px]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}><span>{p.symbol.split('/')[0]} {p.side === 'buy' ? 'LONG' : 'SHORT'} • {new Date(p.closed_at || p.opened_at).toLocaleString()}</span><span>{Number(p.close_price || 0).toFixed(2)}</span><b className={Number(p.realized_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}>{Number(p.realized_pnl || 0) >= 0 ? '+' : ''}{Number(p.realized_pnl || 0).toFixed(2)}</b></div>)}
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
                <TradeBox side={side} setSide={setSide} leverage={leverage} setLeverage={setLeverage} amount={amount} setAmount={setAmount} walletBalance={walletBalance} ticker={ticker} busy={busy} session={session} onOpen={openPosition} onQuick={quickAmount} />
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
