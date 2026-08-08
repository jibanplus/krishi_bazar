import { useEffect, useState } from 'react';
import { Activity, Check, RefreshCw, Save, Settings2, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

type Row = {
  id?: string;
  symbol: string;
  name: string;
  min_price: string;
  max_price: string;
  enabled: boolean;
};

const DEFAULTS: Row[] = [
  { symbol:'BTC/USDT', name:'Bitcoin', min_price:'60000', max_price:'75000', enabled:true },
  { symbol:'ETH/USDT', name:'Ethereum', min_price:'3000', max_price:'4000', enabled:true },
  { symbol:'SOL/USDT', name:'Solana', min_price:'130', max_price:'210', enabled:true },
  { symbol:'BNB/USDT', name:'BNB', min_price:'500', max_price:'680', enabled:true },
  { symbol:'XRP/USDT', name:'XRP', min_price:'0.45', max_price:'0.85', enabled:true },
  { symbol:'ADA/USDT', name:'Cardano', min_price:'0.30', max_price:'0.60', enabled:true },
  { symbol:'DOGE/USDT', name:'Dogecoin', min_price:'0.08', max_price:'0.18', enabled:true },
  { symbol:'AVAX/USDT', name:'Avalanche', min_price:'20', max_price:'40', enabled:true },
];

export function AdminTradingTerminalSettings() {
  const { show: toast } = useToast();
  const [rows, setRows] = useState<Row[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trading_terminal_coin_settings')
      .select('*')
      .order('sort_order');
    if (error) {
      toast('error', error.message, '⚠️');
    } else if (data?.length) {
      setRows(data.map((r: any) => ({
        id:r.id, symbol:r.symbol, name:r.name,
        min_price:String(r.min_price), max_price:String(r.max_price),
        enabled:r.enabled !== false,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (index: number, patch: Partial<Row>) =>
    setRows(prev => prev.map((r,i) => i === index ? { ...r, ...patch } : r));

  const save = async () => {
    const invalid = rows.find(r => !Number.isFinite(Number(r.min_price)) || !Number.isFinite(Number(r.max_price)) || Number(r.min_price) >= Number(r.max_price));
    if (invalid) {
      toast('error', `${invalid.symbol}: minimum price must be lower than maximum price.`, '⚠️');
      return;
    }
    setSaving(true);
    const payload = rows.map((r,i) => ({
      symbol:r.symbol,
      name:r.name,
      min_price:Number(r.min_price),
      max_price:Number(r.max_price),
      enabled:r.enabled,
      sort_order:i+1,
      updated_at:new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('trading_terminal_coin_settings')
      .upsert(payload, { onConflict:'symbol' });
    setSaving(false);
    if (error) {
      toast('error', error.message, '⚠️');
      return;
    }
    toast('success', 'Terminal coin price ranges updated. The market engine will use the new range automatically.', '✓');
    await load();
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{color:'var(--text-primary)'}}>
              <SlidersHorizontal className="w-6 h-6 text-brand-500" /> Trading Terminal Coin Settings
            </h1>
            <p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>
              Set the minimum and maximum price for each terminal coin. The live price will stay inside this range until you change the setting.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Refresh</button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4"/>{saving ? 'Saving...' : 'Save All'}</button>
          </div>
        </div>

        <div className="rounded-xl border p-3 flex gap-3 items-start bg-amber-500/5" style={{borderColor:'rgba(245,158,11,.25)'}}>
          <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"/>
          <div className="text-xs" style={{color:'var(--text-secondary)'}}>
            <b style={{color:'var(--text-primary)'}}>Bounded price engine:</b> the terminal generates simulated price movement, but it will not cross the saved minimum or maximum. When a boundary is reached, the next movement is reflected back into the range.
          </div>
        </div>

        {loading ? <div className="py-12 text-center" style={{color:'var(--text-secondary)'}}>Loading settings...</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((r,i) => (
              <div key={r.symbol} className="rounded-xl border p-4" style={{borderColor:'var(--border-color)',backgroundColor:'var(--bg-card)'}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold" style={{color:'var(--text-primary)'}}>{r.symbol}</div>
                    <div className="text-xs" style={{color:'var(--text-secondary)'}}>{r.name}</div>
                  </div>
                  <button
                    onClick={() => update(i,{enabled:!r.enabled})}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                  >
                    {r.enabled ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs" style={{color:'var(--text-secondary)'}}>
                    Minimum price
                    <input type="number" value={r.min_price} onChange={e=>update(i,{min_price:e.target.value})} className="input-field mt-1"/>
                  </label>
                  <label className="text-xs" style={{color:'var(--text-secondary)'}}>
                    Maximum price
                    <input type="number" value={r.max_price} onChange={e=>update(i,{max_price:e.target.value})} className="input-field mt-1"/>
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]" style={{color:'var(--text-secondary)'}}>
                  <span>Allowed range</span>
                  <b style={{color:'var(--text-primary)'}}>{r.min_price} → {r.max_price}</b>
                </div>
              </div>
            ))}
          </div>
        }

        <div className="rounded-xl border p-4 text-xs space-y-2" style={{borderColor:'var(--border-color)',backgroundColor:'var(--bg-card)',color:'var(--text-secondary)'}}>
          <div className="flex items-center gap-2 font-semibold" style={{color:'var(--text-primary)'}}><Activity className="w-4 h-4 text-brand-500"/> How it works</div>
          <div>1. Admin saves a range for a coin.</div>
          <div>2. The terminal refreshes the settings automatically every few seconds.</div>
          <div>3. Price movement remains inside the saved range.</div>
          <div>4. Changing the range immediately affects future ticks without rebuilding the site.</div>
        </div>
      </div>
    </AdminLayout>
  );
}
