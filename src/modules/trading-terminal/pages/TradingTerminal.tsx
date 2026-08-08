import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { LineChart, BarChart3, CandlestickChart, Activity } from 'lucide-react';

type ChartType = 'candles' | 'line' | 'area';
type Indicator = 'none' | 'ema' | 'rsi' | 'macd';

export function TradingTerminal() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [indicator, setIndicator] = useState<Indicator>('ema');
  const [tradingMode, setTradingMode] = useState<'spot' | 'margin'>('margin');
  const [state, setState] = useState<TradingState>(() => createInitialState());
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

  const handleOpenPosition = useCallback((params: { side: 'buy' | 'sell'; price: number; amount: number; leverage: number }) => {
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
      const { state: next } = closePosition(prev, id, closePrice);
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

  const showEma = indicator === 'ema';
  const showRsi = indicator === 'rsi';
  const showMacd = indicator === 'macd';
  const chartHeight = showRsi || showMacd ? 460 : 400;

  const ticker = useMemo(() => tickers.find((t) => t.symbol === symbol) ?? data.ticker, [tickers, symbol, data.ticker]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
            <CandlestickChart className="w-4 h-4 text-slate-900" />
          </div>
          <span className="text-sm font-bold tracking-tight">Trading Terminal</span>
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Market list */}
        <aside className="hidden lg:block w-64 border-r border-slate-800 bg-slate-900/30">
          <MarketList tickers={tickers} selectedSymbol={symbol} onSelect={setSymbol} />
        </aside>

        {/* Center: Chart + Positions */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chart toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 bg-slate-900/30">
            <div className="flex gap-0.5 mr-2">
              {[
                { type: 'candles' as ChartType, icon: CandlestickChart, label: 'Candles' },
                { type: 'line' as ChartType, icon: LineChart, label: 'Line' },
                { type: 'area' as ChartType, icon: BarChart3, label: 'Area' },
              ].map(({ type, icon: Icon, label }) => (
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
              showEma={showEma}
              showRsi={showRsi}
              showMacd={showMacd}
              height={chartHeight}
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

        {/* Right: Order book + Trade panel */}
        <aside className="w-72 xl:w-80 flex flex-col border-l border-slate-800 bg-slate-900/30">
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

          <div className="h-48 border-b border-slate-800 overflow-hidden">
            <OrderBook bids={orderBook.bids} asks={orderBook.asks} lastPrice={data.ticker.price} />
          </div>

          <div className="flex-1 overflow-hidden">
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

      {/* Mobile market list */}
      <div className="lg:hidden border-t border-slate-800 max-h-32 overflow-y-auto">
        <MarketList tickers={tickers} selectedSymbol={symbol} onSelect={setSymbol} />
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
