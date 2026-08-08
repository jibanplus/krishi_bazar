import type { OrderBookLevel } from '@/modules/trading-terminal/types';

export function generateOrderBook(midPrice: number, levels = 18, depth = 1.5): {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
} {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  let bidTotal = 0;
  let askTotal = 0;
  const spread = midPrice * 0.0002;

  for (let i = 0; i < levels; i++) {
    const stepFactor = 1 + i * 0.0008;
    const bidPrice = midPrice - spread * stepFactor;
    const askPrice = midPrice + spread * stepFactor;

    const bidAmount = Math.random() * depth * (1 + i * 0.15) + 0.05;
    const askAmount = Math.random() * depth * (1 + i * 0.15) + 0.05;

    bidTotal += bidAmount;
    askTotal += askAmount;

    bids.push({ price: bidPrice, amount: bidAmount, total: bidTotal });
    asks.push({ price: askPrice, amount: askAmount, total: askTotal });
  }

  return { bids, asks };
}

export function generateRecentTrades(midPrice: number, count = 40): { price: number; amount: number; side: 'buy' | 'sell'; time: number }[] {
  const trades: { price: number; amount: number; side: 'buy' | 'sell'; time: number }[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const variance = midPrice * 0.0005;
    const price = midPrice + (Math.random() - 0.5) * variance;
    const amount = Math.random() * 2 + 0.001;
    trades.push({ price, amount, side, time: now - i * (Math.random() * 4000 + 500) });
  }
  return trades;
}
