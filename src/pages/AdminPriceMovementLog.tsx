import { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Filter, Search, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

interface PriceMovementLog {
  id: string;
  product_id: string;
  product_type: 'commodity' | 'crypto';
  old_price: number;
  new_price: number;
  movement_percent: number;
  movement_type: 'up' | 'down';
  recorded_at: string;
  min_price: number | null;
  max_price: number | null;
  volatility_percentage: number | null;
  product_name?: string;
  product_symbol?: string;
}

export function AdminPriceMovementLog() {
  const { show: showToast } = useToast();
  const [logs, setLogs] = useState<PriceMovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'commodity' | 'crypto'>('all');
  const [filterMovement, setFilterMovement] = useState<'all' | 'up' | 'down'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const { data: logsData, error } = await supabase
      .from('price_movement_log')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) {
      showToast('error', 'লোড করতে ব্যর্থ', '❌');
    } else {
      // Fetch product names
      const enrichedLogs = await Promise.all(
        (logsData || []).map(async (log) => {
          let productName = '';
          let productSymbol = '';
          
          if (log.product_type === 'commodity') {
            const { data: comm } = await supabase
              .from('commodities')
              .select('name')
              .eq('id', log.product_id)
              .single();
            productName = comm?.name || '';
          } else {
            const { data: crypto } = await supabase
              .from('high_risk_assets')
              .select('name, symbol')
              .eq('id', log.product_id)
              .single();
            productName = crypto?.name || '';
            productSymbol = crypto?.symbol || '';
          }

          return {
            ...log,
            product_name: productName,
            product_symbol: productSymbol,
          } as PriceMovementLog;
        })
      );
      setLogs(enrichedLogs);
    }
    setLoading(false);
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                          log.product_symbol?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || log.product_type === filterType;
    const matchesMovement = filterMovement === 'all' || log.movement_type === filterMovement;
    return matchesSearch && matchesType && matchesMovement;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <Activity className="w-6 h-6 inline mr-2" />
            প্রাইস মুভমেন্ট লগ
          </h1>
          <button onClick={loadLogs} className="btn-outline flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> রিফ্রেশ
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="পণ্য খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="input-field"
              >
                <option value="all">সব টাইপ</option>
                <option value="commodity">কমোডিটি</option>
                <option value="crypto">ক্রিপ্টো</option>
              </select>
              <select
                value={filterMovement}
                onChange={(e) => setFilterMovement(e.target.value as any)}
                className="input-field"
              >
                <option value="all">সব মুভমেন্ট</option>
                <option value="up">বৃদ্ধি</option>
                <option value="down">হ্রাস</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      সময়
                    </th>
                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      পণ্য
                    </th>
                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      টাইপ
                    </th>
                    <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      পুরানো মূল্য
                    </th>
                    <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      নতুন মূল্য
                    </th>
                    <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      মুভমেন্ট
                    </th>
                    <th className="text-center p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      রেঞ্জ
                    </th>
                    <th className="text-center p-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      ভোলাটিলিটি
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8" style={{ color: 'var(--text-secondary)' }}>
                        কোনো লগ পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-brand-500/5 transition" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.recorded_at).toLocaleString('bn-BD')}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {log.product_name}
                          </div>
                          {log.product_symbol && (
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {log.product_symbol}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.product_type === 'commodity' 
                              ? 'bg-brand-500/10 text-brand-500' 
                              : 'bg-purple-500/10 text-purple-500'
                          }`}>
                            {log.product_type === 'commodity' ? 'কমোডিটি' : 'ক্রিপ্টো'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                          ₹{Number(log.old_price).toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                          ₹{Number(log.new_price).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          <div className={`flex items-center justify-end gap-1 ${
                            log.movement_type === 'up' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {log.movement_type === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="font-semibold">
                              {log.movement_type === 'up' ? '+' : ''}{Number(log.movement_percent).toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {log.min_price && log.max_price ? (
                            <div>
                              <div className="text-emerald-500">₹{Number(log.min_price).toFixed(0)}</div>
                              <div className="text-rose-500">₹{Number(log.max_price).toFixed(0)}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {log.volatility_percentage ? `${Number(log.volatility_percentage).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
