import { useMemo } from 'react';

type Props = {
  data: { price: number; recorded_at: string }[];
  height?: number;
  color?: string;
};

export function MiniChart({ data, height = 60, color = '#22c55e' }: Props) {
  const { points, isUp } = useMemo(() => {
    if (!data || data.length < 2) return { points: '', isUp: true };
    const prices = data.map((d) => Number(d.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const width = 100;
    const step = width / (data.length - 1);
    const pts = data
      .map((d, i) => {
        const x = i * step;
        const y = height - ((Number(d.price) - min) / range) * (height - 4) - 2;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
    return { points: pts, isUp: prices[prices.length - 1] >= prices[0] };
  }, [data, height]);

  if (!points) {
    return <div className="skeleton w-full" style={{ height }} />;
  }

  const strokeColor = isUp ? color : '#ef4444';

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
    </svg>
  );
}
