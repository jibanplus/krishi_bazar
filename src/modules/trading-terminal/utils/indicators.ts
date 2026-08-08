import type { Candle } from '@/modules/trading-terminal/types';

export function sma(candles: Candle[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    result.push(sum / period);
  }
  return result;
}

export function ema(candles: Candle[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = candles[0]?.close ?? 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      prev = candles[0].close;
      result.push(prev);
      continue;
    }
    prev = candles[i].close * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function rsi(candles: Candle[], period = 14): number[] {
  const result: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }
    const change = candles[i].close - candles[i - 1].close;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    if (i <= period) {
      avgGain = (avgGain * (i - 1) + gain) / i;
      avgLoss = (avgLoss * (i - 1) + loss) / i;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

export function macd(candles: Candle[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(candles, fast);
  const emaSlow = ema(candles, slow);
  const macdLine = candles.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine: number[] = [];
  const k = 2 / (signal + 1);
  let prev = macdLine[0] ?? 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (i === 0) {
      prev = macdLine[0];
      signalLine.push(prev);
      continue;
    }
    prev = macdLine[i] * k + prev * (1 - k);
    signalLine.push(prev);
  }
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}
