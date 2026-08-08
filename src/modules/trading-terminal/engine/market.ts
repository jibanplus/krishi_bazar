import type { Candle, MarketConfig } from '@/modules/trading-terminal/types';

const MARKETS: MarketConfig[] = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', basePrice: 67250, volatility: 0.012, drift: 0.0002, tickSize: 0.01, minAmount: 0.0001, maxAmount: 50, minPrice: 60000, maxPrice: 75000 },
  { symbol: 'ETH/USDT', name: 'Ethereum', basePrice: 3480, volatility: 0.015, drift: 0.0003, tickSize: 0.01, minAmount: 0.001, maxAmount: 500, minPrice: 3000, maxPrice: 4000 },
  { symbol: 'SOL/USDT', name: 'Solana', basePrice: 168.5, volatility: 0.022, drift: 0.0005, tickSize: 0.01, minAmount: 0.01, maxAmount: 5000, minPrice: 130, maxPrice: 210 },
  { symbol: 'BNB/USDT', name: 'BNB', basePrice: 585, volatility: 0.014, drift: 0.0001, tickSize: 0.01, minAmount: 0.01, maxAmount: 1000, minPrice: 500, maxPrice: 680 },
  { symbol: 'XRP/USDT', name: 'XRP', basePrice: 0.623, volatility: 0.018, drift: 0.0002, tickSize: 0.0001, minAmount: 1, maxAmount: 100000, minPrice: 0.45, maxPrice: 0.85 },
  { symbol: 'ADA/USDT', name: 'Cardano', basePrice: 0.452, volatility: 0.02, drift: 0.0001, tickSize: 0.0001, minAmount: 1, maxAmount: 100000, minPrice: 0.30, maxPrice: 0.60 },
  { symbol: 'DOGE/USDT', name: 'Dogecoin', basePrice: 0.128, volatility: 0.025, drift: 0.0003, tickSize: 0.00001, minAmount: 10, maxAmount: 1000000, minPrice: 0.08, maxPrice: 0.18 },
  { symbol: 'AVAX/USDT', name: 'Avalanche', basePrice: 28.4, volatility: 0.02, drift: 0.0002, tickSize: 0.01, minAmount: 0.1, maxAmount: 10000, minPrice: 20, maxPrice: 40 },
];

export function getMarketConfigs(): MarketConfig[] {
  return MARKETS;
}

export function getMarketConfig(symbol: string): MarketConfig {
  return MARKETS.find((m) => m.symbol === symbol) ?? MARKETS[0];
}

function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateHistoricalCandles(config: MarketConfig, count: number, intervalMs: number): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  let price = config.basePrice;
  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * intervalMs;
    const open = price;
    const shock = gaussian() * config.volatility;
    const trend = config.drift;
    const change = open * (trend + shock);
    const close = Math.max(open + change, config.tickSize);
    const high = Math.max(open, close) * (1 + Math.abs(gaussian()) * config.volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.abs(gaussian()) * config.volatility * 0.5);
    const volume = (1 + Math.abs(gaussian())) * config.basePrice * 0.5;
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

export function nextTickPrice(prevPrice: number, config: MarketConfig): number {
<<<<<<< HEAD
  // Random two-sided simulated market movement.
  const direction = Math.random() < 0.5 ? -1 : 1;
  const impulse = config.volatility * (0.10 + Math.random() * 0.45);
  const noise = gaussian() * config.volatility * 0.12;
  const meanReversion = ((config.basePrice - prevPrice) / Math.max(config.basePrice, 1)) * 0.02;
  const change = prevPrice * (direction * impulse + noise + meanReversion);
  let next = Math.max(prevPrice + change, config.tickSize);

  const min = config.minPrice ?? 0;
  const max = config.maxPrice ?? Number.POSITIVE_INFINITY;
  if (Number.isFinite(max) && max > min) {
    if (next > max) next = max - (next - max);
    if (next < min) next = min + (min - next);
    next = Math.min(max, Math.max(min, next));
  }
  return Math.round(next / config.tickSize) * config.tickSize;
=======
  const shock = gaussian() * config.volatility;
  const trend = config.drift;
  const change = prevPrice * (trend + shock);
  let next = Math.max(prevPrice + change, config.tickSize);

  // Admin-controlled bounded market: price always remains inside [minPrice, maxPrice].
  const min = config.minPrice ?? 0;
  const max = config.maxPrice ?? Number.POSITIVE_INFINITY;
  if (Number.isFinite(max) && max > min) {
    if (next > max) {
      const overshoot = next - max;
      next = Math.max(min, max - overshoot);
    }
    if (next < min) {
      const undershoot = min - next;
      next = Math.min(max, min + undershoot);
    }
    next = Math.min(max, Math.max(min, next));
  }
  return next;
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
}

export function generateSparkline(config: MarketConfig, count = 24): number[] {
  const points: number[] = [];
  let price = config.basePrice * (1 - config.volatility * 2);
  for (let i = 0; i < count; i++) {
    price = nextTickPrice(price, config);
    points.push(price);
  }
  return points;
}
