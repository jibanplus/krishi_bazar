import {
  getMarketConfigs,
  getMarketConfig,
  generateHistoricalCandles,
  generateSparkline,
  nextTickPrice,
} from '@/modules/trading-terminal/engine/market';
import { generateOrderBook, generateRecentTrades } from '@/modules/trading-terminal/engine/orderbook';
import { getTickerFromConfig } from '@/modules/trading-terminal/engine/trading';
import { supabase } from '@/lib/supabase';
import type { Candle, OrderBookLevel, Ticker, Trade } from '@/modules/trading-terminal/types';

export type MarketData = {
  ticker: Ticker;
  candles: Candle[];
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  recentTrades: { price: number; amount: number; side: 'buy' | 'sell'; time: number }[];
};

const INTERVAL_MS = 60_000;
const CANDLE_COUNT = 120;
const sparklineCache: Record<string, number[]> = {};
const priceCache: Record<string, number> = {};
const candleCache: Record<string, Candle[]> = {};

type RangeSetting = { symbol: string; min_price: number; max_price: number; enabled: boolean };
const rangeCache: Record<string, RangeSetting> = {};
let rangeLoadedAt = 0;
let rangeLoadPromise: Promise<void> | null = null;

export async function refreshTerminalRanges(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - rangeLoadedAt < 5000) return;
  if (rangeLoadPromise) return rangeLoadPromise;
  rangeLoadPromise = (async () => {
    const { data } = await supabase
      .from('trading_terminal_coin_settings')
      .select('symbol,min_price,max_price,enabled');
    if (data) {
      for (const row of data as RangeSetting[]) {
        rangeCache[row.symbol] = row;
      }
      rangeLoadedAt = Date.now();
      for (const config of getMarketConfigs()) {
        const setting = rangeCache[config.symbol];
        if (setting?.enabled && setting.min_price < setting.max_price) {
          config.minPrice = Number(setting.min_price);
          config.maxPrice = Number(setting.max_price);
          if (priceCache[config.symbol] !== undefined) {
            priceCache[config.symbol] = Math.min(config.maxPrice, Math.max(config.minPrice, priceCache[config.symbol]));
          }
        }
      }
    }
  })().finally(() => { rangeLoadPromise = null; });
  return rangeLoadPromise;
}

export function getTerminalRange(symbol: string) {
  const config = getMarketConfig(symbol);
  return { min: config.minPrice ?? 0, max: config.maxPrice ?? Infinity, enabled: rangeCache[symbol]?.enabled !== false };
}


function initMarket(symbol: string) {
  const config = getMarketConfig(symbol);
  if (!priceCache[symbol]) {
    priceCache[symbol] = config.basePrice;
    sparklineCache[symbol] = generateSparkline(config);
    candleCache[symbol] = generateHistoricalCandles(config, CANDLE_COUNT, INTERVAL_MS);
  }
}

export function getAllTickers(): Ticker[] {
  return getMarketConfigs().map((config) => {
    initMarket(config.symbol);
    const price = priceCache[config.symbol];
    const sparkline = sparklineCache[config.symbol];
    return getTickerFromConfig(config, price, sparkline);
  });
}

export function getMarketData(symbol: string): MarketData {
  const config = getMarketConfig(symbol);
  initMarket(symbol);
  const price = priceCache[symbol];
  const sparkline = sparklineCache[symbol];
  const ticker = getTickerFromConfig(config, price, sparkline);
  const candles = candleCache[symbol];
  const orderBook = generateOrderBook(price);
  const recentTrades = generateRecentTrades(price);
  return { ticker, candles, orderBook, recentTrades };
}

export function tickMarket(symbol: string): {
  price: number;
  candles: Candle[];
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  recentTrades: { price: number; amount: number; side: 'buy' | 'sell'; time: number }[];
} {
  const config = getMarketConfig(symbol);
  initMarket(symbol);
  const prevPrice = priceCache[symbol];
  const newPrice = nextTickPrice(prevPrice, config);
  priceCache[symbol] = newPrice;

  const spark = sparklineCache[symbol];
  spark.shift();
  spark.push(newPrice);
  sparklineCache[symbol] = spark;

  const candles = candleCache[symbol];
  const last = candles[candles.length - 1];
  const now = Date.now();
  if (now - last.time >= INTERVAL_MS) {
    candles.push({
      time: now,
      open: newPrice,
      high: newPrice,
      low: newPrice,
      close: newPrice,
      volume: 0,
    });
    if (candles.length > CANDLE_COUNT) candles.shift();
  } else {
    last.close = newPrice;
    last.high = Math.max(last.high, newPrice);
    last.low = Math.min(last.low, newPrice);
    last.volume += Math.random() * config.basePrice * 0.1;
  }
  candleCache[symbol] = [...candles];

  return {
    price: newPrice,
    candles: candleCache[symbol],
    orderBook: generateOrderBook(newPrice),
    recentTrades: generateRecentTrades(newPrice),
  };
}

export function tickAllMarkets(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const config of getMarketConfigs()) {
    initMarket(config.symbol);
    const prev = priceCache[config.symbol];
    const next = nextTickPrice(prev, config);
    priceCache[config.symbol] = next;
    const spark = sparklineCache[config.symbol];
    spark.shift();
    spark.push(next);
    sparklineCache[config.symbol] = spark;
    prices[config.symbol] = next;
  }
  return prices;
}

export type { MarketData, Trade };
