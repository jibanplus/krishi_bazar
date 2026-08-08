import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getMarketData,
  tickMarket,
  tickAllMarkets,
  getAllTickers,
  refreshTerminalRanges,
} from '@/modules/trading-terminal/services/marketService';
import type { Candle, OrderBookLevel, Ticker } from '@/modules/trading-terminal/types';

export function useMarketData(symbol: string, intervalMs = 1500) {
  const [data, setData] = useState(() => getMarketData(symbol));
  const [loading, setLoading] = useState(true);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setData(getMarketData(symbol));
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    refreshTerminalRanges();
    const id = setInterval(() => {
      refreshTerminalRanges();

      const update = tickMarket(symbolRef.current);
      setData((prev) => ({
        ticker: { ...prev.ticker, price: update.price },
        candles: update.candles,
        orderBook: update.orderBook,
        recentTrades: update.recentTrades,
      }));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { data, loading };
}

export function useAllTickers(intervalMs = 2000) {
  const [tickers, setTickers] = useState<Ticker[]>(() => getAllTickers());
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    refreshTerminalRanges();
    const id = setInterval(() => {
      refreshTerminalRanges();
      const newPrices = tickAllMarkets();
      setPrices(newPrices);
      setTickers(getAllTickers());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { tickers, prices };
}

export function useCandles(symbol: string): Candle[] {
  const [candles, setCandles] = useState<Candle[]>(() => getMarketData(symbol).candles);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setCandles(getMarketData(symbol).candles);
  }, [symbol]);

  useEffect(() => {
    const id = setInterval(() => {
      const update = tickMarket(symbolRef.current);
      setCandles(update.candles);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return candles;
}

export type OrderBookData = { bids: OrderBookLevel[]; asks: OrderBookLevel[] };

export function useOrderBook(symbol: string, intervalMs = 1000): OrderBookData {
  const [book, setBook] = useState<OrderBookData>(() => getMarketData(symbol).orderBook);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setBook(getMarketData(symbol).orderBook);
  }, [symbol]);

  useEffect(() => {
    const id = setInterval(() => {
      const update = tickMarket(symbolRef.current);
      setBook(update.orderBook);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return book;
}

export function useRecentTrades(symbol: string, intervalMs = 2000) {
  const [trades, setTrades] = useState(() => getMarketData(symbol).recentTrades);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    symbolRef.current = symbol;
    setTrades(getMarketData(symbol).recentTrades);
  }, [symbol]);

  useEffect(() => {
    const id = setInterval(() => {
      const update = tickMarket(symbolRef.current);
      setTrades(update.recentTrades);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return trades;
}

export function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useTradingState() {
  const [state, setState] = useState(() => ({
    balance: 100000,
    orders: [] as any[],
    positions: [] as any[],
    tradeHistory: [] as any[],
  }));

  const updateState = useCallback((updater: (prev: typeof state) => typeof state) => {
    setState(updater);
  }, []);

  return { state, updateState, setState };
}
