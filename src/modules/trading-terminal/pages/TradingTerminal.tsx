<<<<<<< HEAD
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
=======
import { useState, useEffect, useCallback, useMemo } from 'react';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
import { useMarketData, useAllTickers, useOrderBook, useRecentTrades } from '@/modules/trading-terminal/hooks/useMarketData';
import {
  createInitialState,
  openPosition,
  closePosition,
  updatePositions,
  checkLiquidations,
  createSpotOrder,
  cancelOrder,
  checkPendingOrders,
  calcPnl,
  type TradingState,
} from '@/modules/trading-terminal/engine/trading';
import { tickAllMarkets } from '@/modules/trading-terminal/services/marketService';
import { TradingChart } from '@/modules/trading-terminal/components/TradingChart';
import { OrderBook } from '@/modules/trading-terminal/components/OrderBook';
import { RecentTrades } from '@/modules/trading-terminal/components/RecentTrades';
import { TradePanel } from '@/modules/trading-terminal/components/TradePanel';
import { MarketList } from '@/modules/trading-terminal/components/MarketList';
import { TickerBar } from '@/modules/trading-terminal/components/TickerBar';
import { PositionsPanel } from '@/modules/trading-terminal/components/PositionsPanel';
import { BalanceBar } from '@/modules/trading-terminal/components/BalanceBar';
<<<<<<< HEAD
import { LineChart, BarChart3, CandlestickChart, Activity, Maximize2, Minimize2 } from 'lucide-react';

type ChartType = 'candles' | 'line' | 'area';
type Indicator = 'none' | 'ema' | 'rsi' | 'macd' | 'ema+rsi' | 'ema+macd' | 'all';
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
const TF_MS: Record<Timeframe, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1D': 86_400_000 };
function aggregateCandles(candles: any[], timeframe: Timeframe) {
  if (timeframe === '1m') return candles;
  const bucket = TF_MS[timeframe]; const grouped: any[] = [];
  for (const c of candles) {
    const t = Math.floor(c.time / bucket) * bucket; const last = grouped[grouped.length - 1];
    if (!last || last.time !== t) grouped.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
    else { last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; last.volume += c.volume; }
  }
  return grouped;
}
=======
import { LineChart, BarChart3, CandlestickChart, Activity } from 'lucide-react';

type ChartType = 'candles' | 'line' | 'area';
type Indicator = 'none' | 'ema' | 'rsi' | 'macd';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

export function TradingTerminal() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [indicator, setIndicator] = useState<Indicator>('ema');
<<<<<<< HEAD
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [emaPeriod, setEmaPeriod] = useState(9);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [macdFast, setMacdFast] = useState(5);
  const [macdSlow, setMacdSlow] = useState(21);
  const [macdSignal, setMacdSignal] = useState(9);
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);
  const [tradingMode, setTradingMode] = useState<'spot' | 'margin'>('margin');
  const [state, setState] = useState<TradingState>(() => createInitialState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
=======
  const [tradingMode, setTradingMode] = useState<'spot' | 'margin'>('margin');
  const [state, setState] = useState<TradingState>(() => createInitialState());
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  const [notifications, setNotifications] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'error' }[]>([]);

  const { data } = useMarketData(symbol);
  const { tickers } = useAllTickers();
  const orderBook = useOrderBook(symbol);
  const recentTrades = useRecentTrades(symbol);

  // Tick all markets and update positions/liquidations/limit orders
  useEffect(() => {
    const id = setInterval(() => {
      const prices = tickAllMarkets();
      setState((prev) => {
        let next = updatePositions(prev, prices);
        const { state: afterLiq, liquidated } = checkLiquidations(next, prices);
        next = afterLiq;
        liquidated.forEach((p) => {
          pushNotification(`Position ${p.symbol} ${p.side} liquidated at ${p.currentPrice.toFixed(2)}`, 'error');
        });
        const { state: afterOrders, filled } = checkPendingOrders(next, prices);
        next = afterOrders;
        filled.forEach((o) => {
          pushNotification(`Limit ${o.side} order filled: ${o.amount} ${o.symbol.split('/')[0]} @ ${o.price.toFixed(2)}`, 'success');
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const pushNotification = useCallback((msg: string, type: 'info' | 'success' | 'error') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setNotifications((prev) => [...prev, { id, msg, type }].slice(-5));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const handlePlaceOrder = useCallback((params: { side: 'buy' | 'sell'; type: 'market' | 'limit'; price: number; amount: number }) => {
    setState((prev) => {
      const { state: next, order, error } = createSpotOrder(prev, { symbol, ...params });
      if (error) {
        pushNotification(error, 'error');
        return prev;
      }
      pushNotification(`${params.side === 'buy' ? 'Buy' : 'Sell'} order ${order.status === 'filled' ? 'filled' : 'placed'}: ${params.amount} ${symbol.split('/')[0]} @ ${params.price.toFixed(2)}`, 'success');
      return next;
    });
  }, [symbol, pushNotification]);

<<<<<<< HEAD
  const handleOpenPosition = useCallback((params: { side: 'buy' | 'sell'; price: number; amount: number; leverage: number; feeType: 'maker' | 'taker' }) => {
=======
  const handleOpenPosition = useCallback((params: { side: 'buy' | 'sell'; price: number; amount: number; leverage: number }) => {
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
    setState((prev) => {
      const { state: next, position, error } = openPosition(prev, { symbol, ...params });
      if (error) {
        pushNotification(error, 'error');
        return prev;
      }
      pushNotification(`${params.side === 'buy' ? 'Long' : 'Short'} position opened: ${params.amount} ${symbol.split('/')[0]} @ ${params.price.toFixed(2)} (${params.leverage}x)`, 'success');
      return next;
    });
  }, [symbol, pushNotification]);

  const handleClosePosition = useCallback((id: string) => {
    setState((prev) => {
      const pos = prev.positions.find((p) => p.id === id);
      if (!pos) return prev;
      const closePrice = data.ticker.price;
<<<<<<< HEAD
      const { state: next } = closePosition(prev, id, closePrice, 'taker');
=======
      const { state: next } = closePosition(prev, id, closePrice);
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
      pushNotification(`Position closed: ${pos.symbol} ${pos.side} @ ${closePrice.toFixed(2)}`, 'info');
      return next;
    });
  }, [data.ticker.price, pushNotification]);

  const handleCancelOrder = useCallback((id: string) => {
    setState((prev) => {
      const next = cancelOrder(prev, id);
      pushNotification('Order cancelled', 'info');
      return next;
    });
  }, [pushNotification]);

  const openPositions = state.positions.filter((p) => p.status === 'open');
  const totalPnl = openPositions.reduce((sum, p) => {
    const { pnl } = calcPnl(p.side, p.entryPrice, data.ticker.price, p.amount, p.leverage);
    return sum + pnl;
  }, 0);
  const marginUsed = openPositions.reduce((sum, p) => sum + p.margin, 0);
  const totalPnlPercent = marginUsed > 0 ? (totalPnl / marginUsed) * 100 : 0;

<<<<<<< HEAD
  const showEma = indicator === 'ema' || indicator === 'ema+rsi' || indicator === 'ema+macd' || indicator === 'all';
  const showRsi = indicator === 'rsi' || indicator === 'ema+rsi' || indicator === 'all';
  const showMacd = indicator === 'macd' || indicator === 'ema+macd' || indicator === 'all';
  const chartHeight = showRsi && showMacd ? 300 : (showRsi || showMacd ? 290 : 255);
  const chartCandles = useMemo(() => aggregateCandles(data.candles, timeframe), [data.candles, timeframe]);

  const ticker = useMemo(() => tickers.find((t) => t.symbol === symbol) ?? data.ticker, [tickers, symbol, data.ticker]);

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await terminalRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={terminalRef} className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
=======
  const showEma = indicator === 'ema';
  const showRsi = indicator === 'rsi';
  const showMacd = indicator === 'macd';
  const chartHeight = showRsi || showMacd ? 460 : 400;

  const ticker = useMemo(() => tickers.find((t) => t.symbol === symbol) ?? data.ticker, [tickers, symbol, data.ticker]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
            <CandlestickChart className="w-4 h-4 text-slate-900" />
          </div>
          <span className="text-sm font-bold tracking-tight">Trading Terminal</span>
<<<<<<< HEAD
          <button onClick={toggleFullscreen} title="Fullscreen terminal" className="ml-2 p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white">{isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
=======
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[9px] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="hidden md:flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-green-400" />
            Simulated Market
          </span>
        </div>
      </header>

      {/* Ticker + Balance */}
      <TickerBar ticker={ticker} />
      <BalanceBar balance={state.balance} totalPnl={totalPnl} marginUsed={marginUsed} totalPnlPercent={totalPnlPercent} />

      {/* Main grid */}
<<<<<<< HEAD
      <div className="flex flex-1 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
=======
      <div className="flex flex-1 overflow-hidden">
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
        {/* Left: Market list */}
        <aside className="hidden lg:block w-64 border-r border-slate-800 bg-slate-900/30">
          <MarketList tickers={tickers} selectedSymbol={symbol} onSelect={setSymbol} />
        </aside>

        {/* Center: Chart + Positions */}
<<<<<<< HEAD
        <main className="flex-1 min-w-0 flex flex-col overflow-visible lg:overflow-hidden">
          {/* Chart toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-slate-800 bg-slate-900/30">
            <div className="flex gap-0.5 shrink-0">
=======
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chart toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 bg-slate-900/30">
            <div className="flex gap-0.5 mr-2">
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
              {[
                { type: 'candles' as ChartType, icon: CandlestickChart, label: 'Candles' },
                { type: 'line' as ChartType, icon: LineChart, label: 'Line' },
                { type: 'area' as ChartType, icon: BarChart3, label: 'Area' },
              ].map(({ type, icon: Icon, label }) => (
<<<<<<< HEAD
                <button key={type} onClick={() => setChartType(type)} title={label} className={`p-1.5 rounded ${chartType === type ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-white hover:bg-slate-800'}`}><Icon className="w-3.5 h-3.5" /></button>
              ))}
            </div>
            <div className="w-px h-5 bg-slate-800 mx-1" />
            <div className="flex gap-0.5 overflow-x-auto scrollbar-thin">
              {[
                { key: 'none' as Indicator, label: 'OFF' }, { key: 'ema' as Indicator, label: 'EMA' },
                { key: 'rsi' as Indicator, label: 'RSI' }, { key: 'macd' as Indicator, label: 'MACD' },
                { key: 'ema+rsi' as Indicator, label: 'EMA+RSI' }, { key: 'ema+macd' as Indicator, label: 'EMA+MACD' }, { key: 'all' as Indicator, label: 'ALL' },
              ].map(({ key, label }) => <button key={key} onClick={() => setIndicator(key)} className={`px-1.5 py-1 text-[9px] rounded whitespace-nowrap ${indicator === key ? 'bg-green-500/20 text-green-400' : 'text-gray-500 hover:text-white hover:bg-slate-800'}`}>{label}</button>)}
              <button onClick={() => setShowIndicatorSettings(v => !v)} className="px-1.5 py-1 text-[9px] rounded bg-slate-800 text-gray-400">SET</button>
            </div>
            <div className="ml-auto flex gap-0.5 shrink-0">
              {(['1m','5m','15m','1h','4h','1D'] as Timeframe[]).map(tf => <button key={tf} onClick={() => setTimeframe(tf)} className={`px-1.5 py-1 text-[9px] rounded ${timeframe === tf ? 'bg-blue-500/20 text-blue-300' : 'text-gray-500 hover:text-white hover:bg-slate-800'}`}>{tf}</button>)}
            </div>
          </div>
          {showIndicatorSettings && <div className="flex flex-wrap items-center gap-2 px-2 py-1 border-b border-slate-800 bg-slate-950 text-[9px]">
            <label className="flex items-center gap-1 text-gray-500">EMA <select value={emaPeriod} onChange={e => setEmaPeriod(+e.target.value)} className="bg-slate-800 text-white rounded px-1 py-0.5"><option value={5}>5</option><option value={9}>9</option><option value={21}>21</option></select></label>
            <label className="flex items-center gap-1 text-gray-500">RSI <select value={rsiPeriod} onChange={e => setRsiPeriod(+e.target.value)} className="bg-slate-800 text-white rounded px-1 py-0.5"><option value={5}>5</option><option value={9}>9</option><option value={14}>14</option><option value={21}>21</option></select></label>
            <label className="flex items-center gap-1 text-gray-500">MACD Fast <select value={macdFast} onChange={e => setMacdFast(+e.target.value)} className="bg-slate-800 text-white rounded px-1 py-0.5"><option value={5}>5</option><option value={9}>9</option><option value={21}>21</option></select></label>
            <label className="flex items-center gap-1 text-gray-500">Slow <select value={macdSlow} onChange={e => setMacdSlow(+e.target.value)} className="bg-slate-800 text-white rounded px-1 py-0.5"><option value={5}>5</option><option value={9}>9</option><option value={21}>21</option></select></label>
            <label className="flex items-center gap-1 text-gray-500">Signal <select value={macdSignal} onChange={e => setMacdSignal(+e.target.value)} className="bg-slate-800 text-white rounded px-1 py-0.5"><option value={5}>5</option><option value={9}>9</option><option value={21}>21</option></select></label>
          </div>}

          {/* Chart */}
          <div className="h-[280px] sm:h-[300px] lg:h-[290px] shrink-0 overflow-hidden p-1">
            <TradingChart
              candles={chartCandles}
=======
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  title={label}
                  className={`p-1.5 rounded transition-colors ${chartType === type ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-white hover:bg-slate-800'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-800 mx-1" />

            <div className="flex gap-0.5">
              {[
                { key: 'none' as Indicator, label: 'None' },
                { key: 'ema' as Indicator, label: 'EMA' },
                { key: 'rsi' as Indicator, label: 'RSI' },
                { key: 'macd' as Indicator, label: 'MACD' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setIndicator(key)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${indicator === key ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-white hover:bg-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-500">
              <span>1m</span>
              <span className="text-gray-700">|</span>
              <span className="text-white">15m</span>
              <span className="text-gray-700">|</span>
              <span>1h</span>
              <span className="text-gray-700">|</span>
              <span>4h</span>
              <span className="text-gray-700">|</span>
              <span>1D</span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 overflow-hidden p-2">
            <TradingChart
              candles={data.candles}
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
              showEma={showEma}
              showRsi={showRsi}
              showMacd={showMacd}
              height={chartHeight}
<<<<<<< HEAD
              emaPeriod={emaPeriod}
              rsiPeriod={rsiPeriod}
              macdFast={macdFast}
              macdSlow={macdSlow}
              macdSignal={macdSignal}
              chartType={chartType}
=======
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
            />
          </div>

          {/* Positions panel */}
          <PositionsPanel
            positions={state.positions}
            orders={state.orders}
            onClosePosition={handleClosePosition}
            onCancelOrder={handleCancelOrder}
          />
        </main>

<<<<<<< HEAD
        {/* Mobile trading controls */}
        <section className="lg:hidden border-t border-slate-800 bg-slate-950 p-1.5 shrink-0">
          <div className="text-[9px] text-gray-500 uppercase font-bold px-1 pb-1">Trade {symbol.split('/')[0]}</div>
          <div className="h-[330px] overflow-hidden rounded-lg border border-slate-800">
            <TradePanel symbol={symbol} currentPrice={data.ticker.price} balance={state.balance} onPlaceOrder={handlePlaceOrder} onOpenPosition={handleOpenPosition} mode={tradingMode} />
          </div>
        </section>

        {/* Right: Order book + Trade panel */}
        <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col border-l border-slate-800 bg-slate-900/30">
=======
        {/* Right: Order book + Trade panel */}
        <aside className="w-72 xl:w-80 flex flex-col border-l border-slate-800 bg-slate-900/30">
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setTradingMode('spot')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${tradingMode === 'spot' ? 'text-white border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Spot
            </button>
            <button
              onClick={() => setTradingMode('margin')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${tradingMode === 'margin' ? 'text-white border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Margin
            </button>
          </div>

<<<<<<< HEAD
          <div className="h-36 border-b border-slate-800 overflow-hidden">
            <OrderBook bids={orderBook.bids} asks={orderBook.asks} lastPrice={data.ticker.price} />
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
=======
          <div className="h-48 border-b border-slate-800 overflow-hidden">
            <OrderBook bids={orderBook.bids} asks={orderBook.asks} lastPrice={data.ticker.price} />
          </div>

          <div className="flex-1 overflow-hidden">
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
            <TradePanel
              symbol={symbol}
              currentPrice={data.ticker.price}
              balance={state.balance}
              onPlaceOrder={handlePlaceOrder}
              onOpenPosition={handleOpenPosition}
              mode={tradingMode}
            />
          </div>
        </aside>
      </div>

<<<<<<< HEAD
      {/* Mobile market selector */}
      <div className="lg:hidden border-t border-slate-800 bg-slate-950 overflow-x-auto shrink-0">
        <div className="flex gap-1 p-1.5 min-w-max">
          {tickers.map(t => <button key={t.symbol} onClick={() => setSymbol(t.symbol)} className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black ${symbol === t.symbol ? 'bg-green-500/15 border-green-500/40 text-green-300' : 'bg-slate-900 border-slate-800 text-gray-400'}`}>{t.symbol.split('/')[0]} <span className={t.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>{t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%</span></button>)}
        </div>
=======
      {/* Mobile market list */}
      <div className="lg:hidden border-t border-slate-800 max-h-32 overflow-y-auto">
        <MarketList tickers={tickers} selectedSymbol={symbol} onSelect={setSymbol} />
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-4 py-2 rounded-lg text-xs font-medium shadow-lg border animate-in slide-in-from-right ${
              n.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              n.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-slate-800 border-slate-700 text-gray-300'
            }`}
          >
            {n.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
