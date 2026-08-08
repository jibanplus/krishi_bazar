import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase, type Commodity } from '@/lib/supabase';

const formatINR = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function LiveTicker() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('commodities').select('*').eq('is_active', true).order('sort_order');
      setCommodities(data || []);
    }
    load();

    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (commodities.length === 0) return null;
  const doubled = [...commodities, ...commodities];

  return (
    <div className="ticker-pause overflow-hidden bg-slate-900 text-white">
      <div className="flex whitespace-nowrap animate-ticker py-1.5">
        {doubled.map((c, i) => {
          const up = c.change_percent >= 0;
          return (
            <div key={`${c.id}-${i}`} className="flex items-center gap-2 px-5 text-sm">
              <span className="font-semibold text-emerald-300">{c.name}</span>
              <span className="font-bold">{formatINR(c.current_price)}</span>
              <span className="text-xs text-slate-400">/{c.unit}</span>
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {up ? '+' : ''}{Number(c.change_percent).toFixed(2)}%
              </span>
              <span className="text-slate-600">|</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
