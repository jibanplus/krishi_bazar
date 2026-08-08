import { useEffect, useRef, useMemo } from 'react';
import type { Candle } from '@/modules/trading-terminal/types';
import { ema, rsi, macd } from '@/modules/trading-terminal/utils/indicators';

type Props = {
  candles: Candle[];
  showEma?: boolean;
  showRsi?: boolean;
  showMacd?: boolean;
  height?: number;
};

export function TradingChart({ candles, showEma = true, showRsi = false, showMacd = false, height = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ema12 = useMemo(() => ema(candles, 12), [candles]);
  const ema26 = useMemo(() => ema(candles, 26), [candles]);
  const rsiData = useMemo(() => rsi(candles, 14), [candles]);
  const macdData = useMemo(() => macd(candles), [candles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const totalHeight = height;
    const priceHeight = showRsi || showMacd ? totalHeight * 0.6 : totalHeight;
    const indicatorHeight = showRsi && showMacd ? totalHeight * 0.2 : showRsi || showMacd ? totalHeight * 0.4 : 0;

    canvas.width = w * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${totalHeight}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, totalHeight);

    const padding = { top: 10, right: 70, bottom: 10, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = priceHeight - padding.top - padding.bottom;

    const prices = candles.flatMap((c) => [c.high, c.low]);
    if (showEma) {
      ema12.forEach((v) => { if (Number.isFinite(v)) prices.push(v); });
      ema26.forEach((v) => { if (Number.isFinite(v)) prices.push(v); });
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const pricePad = priceRange * 0.05;
    const minP = minPrice - pricePad;
    const maxP = maxPrice + pricePad;

    const candleWidth = chartW / candles.length;
    const bodyWidth = Math.max(candleWidth * 0.7, 1);

    const yPrice = (p: number) => padding.top + chartH - ((p - minP) / (maxP - minP)) * chartH;
    const xCandle = (i: number) => padding.left + i * candleWidth + candleWidth / 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const price = maxP - ((maxP - minP) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(price.toFixed(2), w - padding.right + 6, y + 3);
    }

    // Candles
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = xCandle(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#0ecb81' : '#f6465d';
      const wickColor = isUp ? '#0ecb8177' : '#f6465d77';

      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yPrice(c.high));
      ctx.lineTo(x, yPrice(c.low));
      ctx.stroke();

      ctx.fillStyle = color;
      const yOpen = yPrice(c.open);
      const yClose = yPrice(c.close);
      const top = Math.min(yOpen, yClose);
      const h = Math.max(Math.abs(yClose - yOpen), 1);
      ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, h);
    }

    // EMA lines
    if (showEma) {
      const drawLine = (data: number[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < data.length; i++) {
          if (!Number.isFinite(data[i])) continue;
          const x = xCandle(i);
          const y = yPrice(data[i]);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      drawLine(ema12, '#f0b90b');
      drawLine(ema26, '#a855f7');
    }

    // Current price line
    const lastPrice = candles[candles.length - 1].close;
    const yLast = yPrice(lastPrice);
    ctx.strokeStyle = 'rgba(240,185,11,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, yLast);
    ctx.lineTo(w - padding.right, yLast);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f0b90b';
    ctx.fillRect(w - padding.right, yLast - 9, 64, 18);
    ctx.fillStyle = '#0a0e14';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.fillText(lastPrice.toFixed(2), w - padding.right + 4, yLast + 3);

    // RSI panel
    if (showRsi) {
      const rsiTop = priceHeight + 8;
      const rsiH = indicatorHeight - 16;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.moveTo(padding.left, rsiTop);
      ctx.lineTo(w - padding.right, rsiTop);
      ctx.stroke();

      [30, 50, 70].forEach((level) => {
        const y = rsiTop + (rsiH / 100) * (100 - level);
        ctx.strokeStyle = level === 50 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(String(level), w - padding.right + 6, y + 3);
      });

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < rsiData.length; i++) {
        const x = xCandle(i);
        const y = rsiTop + (rsiH / 100) * (100 - rsiData[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // MACD panel
    if (showMacd) {
      const macdTop = showRsi ? priceHeight + indicatorHeight * 0.5 + 8 : priceHeight + 8;
      const macdH = (showRsi ? indicatorHeight * 0.5 : indicatorHeight) - 16;
      const allMacd = [...macdData.macdLine, ...macdData.signalLine].filter(Number.isFinite);
      const macdMax = Math.max(...allMacd.map(Math.abs), 0.01);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.moveTo(padding.left, macdTop + macdH / 2);
      ctx.lineTo(w - padding.right, macdTop + macdH / 2);
      ctx.stroke();

      const yMacd = (v: number) => macdTop + macdH / 2 - (v / macdMax) * (macdH / 2);

      for (let i = 0; i < macdData.histogram.length; i++) {
        const x = xCandle(i);
        const v = macdData.histogram[i];
        if (!Number.isFinite(v)) continue;
        ctx.fillStyle = v >= 0 ? '#0ecb8188' : '#f6465d88';
        const y = yMacd(v);
        ctx.fillRect(x - bodyWidth / 2, Math.min(y, macdTop + macdH / 2), bodyWidth, Math.abs(y - (macdTop + macdH / 2)));
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < macdData.macdLine.length; i++) {
        if (!Number.isFinite(macdData.macdLine[i])) continue;
        const x = xCandle(i);
        const y = yMacd(macdData.macdLine[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#f0b90b';
      ctx.beginPath();
      started = false;
      for (let i = 0; i < macdData.signalLine.length; i++) {
        if (!Number.isFinite(macdData.signalLine[i])) continue;
        const x = xCandle(i);
        const y = yMacd(macdData.signalLine[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [candles, ema12, ema26, rsiData, macdData, showEma, showRsi, showMacd, height]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
