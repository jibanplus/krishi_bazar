<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Candle } from '@/modules/trading-terminal/types';
import { ema, rsi, macd } from '@/modules/trading-terminal/utils/indicators';
import { Minus, Plus, RotateCcw, Trash2, MousePointer2, TrendingUp, Minus as HorizontalIcon } from 'lucide-react';
import { formatInr } from '@/modules/trading-terminal/utils/format';

type ChartType = 'candles' | 'line' | 'area';
type DrawTool = 'cursor' | 'trend' | 'horizontal';
type Drawing = { tool: Exclude<DrawTool, 'cursor'>; x1: number; y1: number; x2: number; y2: number; price1: number; price2: number };
=======
import { useEffect, useRef, useMemo } from 'react';
import type { Candle } from '@/modules/trading-terminal/types';
import { ema, rsi, macd } from '@/modules/trading-terminal/utils/indicators';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

type Props = {
  candles: Candle[];
  showEma?: boolean;
  showRsi?: boolean;
  showMacd?: boolean;
  height?: number;
<<<<<<< HEAD
  chartType?: ChartType;
  emaPeriod?: number;
  rsiPeriod?: number;
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
};

export function TradingChart({ candles, showEma = true, showRsi = false, showMacd = false, height = 400, chartType = 'candles', emaPeriod = 9, rsiPeriod = 14, macdFast = 5, macdSlow = 21, macdSignal = 9 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(Math.min(120, candles.length));
  const [offset, setOffset] = useState(0);
  const [drawTool, setDrawTool] = useState<DrawTool>('cursor');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const drawingRef = useRef<Drawing | null>(null);
  const dragRef = useRef<{ x: number; offset: number } | null>(null);

  const emaPrimary = useMemo(() => ema(candles, emaPeriod), [candles, emaPeriod]);
  const emaSecondary = useMemo(() => ema(candles, emaPeriod === 5 ? 21 : 5), [candles, emaPeriod]);
  const rsiData = useMemo(() => rsi(candles, rsiPeriod), [candles, rsiPeriod]);
  const macdData = useMemo(() => macd(candles, macdFast, macdSlow, macdSignal), [candles, macdFast, macdSlow, macdSignal]);

  useEffect(() => {
    setVisibleCount(v => Math.min(Math.max(v, 40), Math.max(40, candles.length)));
    setOffset(v => Math.min(v, Math.max(0, candles.length - 40)));
  }, [candles.length]);

  const visible = useMemo(() => {
    if (!candles.length) return [];
    const end = Math.max(1, candles.length - offset);
    const start = Math.max(0, end - visibleCount);
    return candles.slice(start, end);
  }, [candles, visibleCount, offset]);

  const zoom = (factor: number) => {
    setVisibleCount(v => Math.max(30, Math.min(candles.length || 30, Math.round(v * factor))));
  };

  const resetView = () => {
    setVisibleCount(Math.min(120, candles.length));
    setOffset(0);
  };
=======
};

export function TradingChart({ candles, showEma = true, showRsi = false, showMacd = false, height = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ema12 = useMemo(() => ema(candles, 12), [candles]);
  const ema26 = useMemo(() => ema(candles, 26), [candles]);
  const rsiData = useMemo(() => rsi(candles, 14), [candles]);
  const macdData = useMemo(() => macd(candles), [candles]);
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
<<<<<<< HEAD
    if (!canvas || !container || visible.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(320, container.clientWidth);
    const totalHeight = height;
    const priceHeight = showRsi || showMacd ? totalHeight * 0.62 : totalHeight;
    const indicatorHeight = showRsi && showMacd ? totalHeight * 0.19 : showRsi || showMacd ? totalHeight * 0.38 : 0;
=======
    if (!canvas || !container || candles.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const totalHeight = height;
    const priceHeight = showRsi || showMacd ? totalHeight * 0.6 : totalHeight;
    const indicatorHeight = showRsi && showMacd ? totalHeight * 0.2 : showRsi || showMacd ? totalHeight * 0.4 : 0;

>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
    canvas.width = w * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${totalHeight}px`;
<<<<<<< HEAD
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, totalHeight);

    const padding = { top: 18, right: 78, bottom: 24, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = priceHeight - padding.top - padding.bottom;
    const prices = visible.flatMap(c => [c.high, c.low]);
    if (showEma) {
      const startIndex = candles.length - offset - visible.length;
      for (let i = startIndex; i < startIndex + visible.length; i++) {
        if (Number.isFinite(emaPrimary[i])) prices.push(emaPrimary[i]);
        if (Number.isFinite(emaSecondary[i])) prices.push(emaSecondary[i]);
      }
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || Math.max(1, maxPrice * 0.01);
    const minP = minPrice - range * 0.06;
    const maxP = maxPrice + range * 0.06;
    const candleWidth = chartW / Math.max(1, visible.length);
    const bodyWidth = Math.max(2, Math.min(16, candleWidth * 0.68));
    const yPrice = (p: number) => padding.top + chartH - ((p - minP) / (maxP - minP)) * chartH;
    const xCandle = (i: number) => padding.left + i * candleWidth + candleWidth / 2;
    const startIndex = candles.length - offset - visible.length;

    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    for (let i = 0; i <= 6; i++) {
      const y = padding.top + chartH * i / 6;
      const price = maxP - (maxP - minP) * i / 6;
      ctx.strokeStyle = 'rgba(255,255,255,.055)';
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      ctx.fillText(formatInr(price), w - padding.right + 7, y + 3);
    }

    // time grid
    for (let i = 0; i < visible.length; i += Math.max(1, Math.floor(visible.length / 7))) {
      const x = xCandle(i);
      ctx.strokeStyle = 'rgba(255,255,255,.035)';
      ctx.beginPath(); ctx.moveTo(x, padding.top); ctx.lineTo(x, padding.top + chartH); ctx.stroke();
      const date = new Date(visible[i].time);
      ctx.fillStyle = 'rgba(255,255,255,.32)';
      ctx.fillText(`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`, x - 15, totalHeight - 7);
    }

    if (chartType === 'candles') {
      visible.forEach((c, i) => {
        const x = xCandle(i); const up = c.close >= c.open; const color = up ? '#16d98b' : '#ff4d67';
        ctx.strokeStyle = up ? '#16d98b99' : '#ff4d6799'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, yPrice(c.high)); ctx.lineTo(x, yPrice(c.low)); ctx.stroke();
        ctx.fillStyle = color;
        const yo = yPrice(c.open), yc = yPrice(c.close); const top = Math.min(yo, yc); const bh = Math.max(1, Math.abs(yc - yo));
        ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, bh);
      });
    } else {
      ctx.beginPath();
      visible.forEach((c, i) => { const x=xCandle(i), y=yPrice(c.close); i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
      if (chartType === 'area') {
        const lastX = xCandle(visible.length - 1);
        ctx.lineTo(lastX, padding.top + chartH); ctx.lineTo(xCandle(0), padding.top + chartH); ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, 'rgba(59,130,246,.30)'); grad.addColorStop(1, 'rgba(59,130,246,.02)');
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); visible.forEach((c,i)=>{const x=xCandle(i),y=yPrice(c.close);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
      }
      ctx.strokeStyle = '#4ea1ff'; ctx.lineWidth = 2; ctx.stroke();
    }

    const drawSeries = (series: number[], color: string, width=1.5) => {
      ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); let started=false;
      for(let i=0;i<visible.length;i++){const v=series[startIndex+i]; if(!Number.isFinite(v)) continue; const x=xCandle(i), y=yPrice(v); if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);} ctx.stroke();
    };
    if (showEma) { drawSeries(emaPrimary, '#ffd166', 1.7); drawSeries(emaSecondary, '#c084fc', 1.7); }

    const last = visible[visible.length - 1].close;
    const ly = yPrice(last);
    ctx.strokeStyle = 'rgba(255,209,102,.55)'; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(padding.left,ly); ctx.lineTo(w-padding.right,ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(w-padding.right, ly-10, 72, 20); ctx.fillStyle='#10151d'; ctx.font='bold 10px ui-monospace,monospace'; ctx.fillText(formatInr(last), w-padding.right+5, ly+3);

    const drawIndicatorLabel = (label: string, y: number) => { ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='bold 9px ui-monospace,monospace'; ctx.fillText(label, padding.left+4, y+12); };
    if (showRsi) {
      const top = priceHeight + 3, h = indicatorHeight - 6; drawIndicatorLabel(`RSI ${rsiPeriod}`, top);
      [30,50,70].forEach(level=>{const y=top+h*(1-level/100);ctx.strokeStyle=level===50?'rgba(255,255,255,.08)':'rgba(255,255,255,.12)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(padding.left,y);ctx.lineTo(w-padding.right,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillText(String(level),w-padding.right+7,y+3);});
      ctx.strokeStyle='#4ea1ff';ctx.lineWidth=1.5;ctx.beginPath();let st=false;for(let i=0;i<visible.length;i++){const v=rsiData[startIndex+i];if(!Number.isFinite(v))continue;const x=xCandle(i),y=top+h*(1-v/100);if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)}ctx.stroke();
    }
    if (showMacd) {
      const top = showRsi ? priceHeight + indicatorHeight * .5 : priceHeight + 3; const h = (showRsi ? indicatorHeight*.5 : indicatorHeight)-6; drawIndicatorLabel(`MACD ${macdFast} ${macdSlow} ${macdSignal}`,top);
      const vals=[...macdData.macdLine,...macdData.signalLine].filter(Number.isFinite); const max=Math.max(...vals.map(Math.abs),.0001); const yM=(v:number)=>top+h/2-(v/max)*(h/2);
      for(let i=0;i<visible.length;i++){const v=macdData.histogram[startIndex+i];if(!Number.isFinite(v))continue;const x=xCandle(i),y=yM(v);ctx.fillStyle=v>=0?'#16d98b88':'#ff4d6788';ctx.fillRect(x-bodyWidth/2,Math.min(y,top+h/2),bodyWidth,Math.abs(y-top-h/2));}
      const line=(series:number[],color:string)=>{ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();let st=false;for(let i=0;i<visible.length;i++){const v=series[startIndex+i];if(!Number.isFinite(v))continue;const x=xCandle(i),y=yM(v);if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)}ctx.stroke();};
      line(macdData.macdLine,'#4ea1ff'); line(macdData.signalLine,'#ffd166');
    }

    // Drawings are stored in normalized chart coordinates so zoom/pan remains useful.
    drawings.forEach(d => {
      const x1 = padding.left + d.x1 * chartW, x2 = padding.left + d.x2 * chartW;
      const y1 = padding.top + d.y1 * chartH, y2 = padding.top + d.y2 * chartH;
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5; ctx.setLineDash(d.tool === 'horizontal' ? [6,4] : []);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(d.tool === 'horizontal' ? w-padding.right : x2,y2); ctx.stroke(); ctx.setLineDash([]);
    });
  }, [visible, candles, emaPrimary, emaSecondary, rsiData, macdData, showEma, showRsi, showMacd, height, chartType, drawings, offset, emaPeriod, rsiPeriod, macdFast, macdSlow, macdSignal]);

  const pointFromEvent = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg touch-none cursor-crosshair"
        onWheel={(e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : .87); }}
        onPointerDown={(e) => {
          if (drawTool !== 'cursor') { const p=pointFromEvent(e); drawingRef.current={tool:drawTool,x1:p.x,y1:p.y,x2:p.x,y2:p.y,price1:0,price2:0}; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); return; }
          dragRef.current={x:e.clientX,offset};
        }}
        onPointerMove={(e) => {
          if (drawingRef.current) { const p=pointFromEvent(e); drawingRef.current.x2=p.x; drawingRef.current.y2=p.y; const current={...drawingRef.current}; setDrawings(d=>d.length ? [...d.slice(0,-1), current] : [current]); return; }
          if (dragRef.current) { const dx=e.clientX-dragRef.current.x; const step=Math.round(-dx/8); setOffset(Math.max(0,Math.min(Math.max(0,candles.length-visibleCount),dragRef.current.offset+step))); }
        }}
        onPointerUp={(e) => {
          if (drawingRef.current) { setDrawings(d=>d.length?d:d); drawingRef.current=null; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); }
          dragRef.current=null;
        }}
        onDoubleClick={() => { if(drawTool==='cursor') resetView(); }}
      />
      <div className="absolute top-2 left-2 flex items-center gap-1 rounded-lg border p-1 backdrop-blur" style={{ borderColor:'var(--border-color)', backgroundColor:'rgba(10,14,20,.82)' }}>
        <button title="Cursor / pan" onClick={()=>setDrawTool('cursor')} className={`p-1.5 rounded ${drawTool==='cursor'?'bg-brand-500/20 text-brand-500':''}`}><MousePointer2 className="w-3.5 h-3.5"/></button>
        <button title="Trend line" onClick={()=>setDrawTool('trend')} className={`p-1.5 rounded ${drawTool==='trend'?'bg-brand-500/20 text-brand-500':''}`}><TrendingUp className="w-3.5 h-3.5"/></button>
        <button title="Horizontal line" onClick={()=>setDrawTool('horizontal')} className={`p-1.5 rounded ${drawTool==='horizontal'?'bg-brand-500/20 text-brand-500':''}`}><HorizontalIcon className="w-3.5 h-3.5"/></button>
        <button title="Clear drawings" onClick={()=>setDrawings([])} className="p-1.5 rounded text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg border p-1 backdrop-blur" style={{ borderColor:'var(--border-color)', backgroundColor:'rgba(10,14,20,.82)' }}>
        <button title="Zoom out" onClick={()=>zoom(1.25)} className="p-1.5 rounded hover:bg-white/5"><Minus className="w-3.5 h-3.5"/></button>
        <button title="Zoom in" onClick={()=>zoom(.8)} className="p-1.5 rounded hover:bg-white/5"><Plus className="w-3.5 h-3.5"/></button>
        <button title="Reset chart" onClick={resetView} className="p-1.5 rounded hover:bg-white/5"><RotateCcw className="w-3.5 h-3.5"/></button>
        <span className="text-[8px] px-1.5" style={{color:'var(--text-tertiary)'}}>{visible.length}/{candles.length}</span>
      </div>
=======
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
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
    </div>
  );
}
