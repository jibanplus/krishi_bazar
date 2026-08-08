import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase, type Deposit, type Withdrawal, type Profile } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

type Props = { type: 'deposit' | 'withdraw' };

export function AdminTransactions({ type }: Props) {
  const { show: showToast } = useToast();
  const [items, setItems] = useState<(Deposit | Withdrawal)[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const table = type === 'deposit' ? 'deposits' : 'withdrawals';
      const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      setItems(data || []);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d) => d.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
        const map: Record<string, Profile> = {};
        (profiles || []).forEach((p) => { map[p.id] = p as Profile; });
        setUsers(map);
      }
      setLoading(false);
    }
    load();

    const table = type === 'deposit' ? 'deposits' : 'withdrawals';
    const channel = supabase
      .channel(`admin-${type}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, (payload) => {
        setItems((prev) => [payload.new as Deposit | Withdrawal, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [type]);

  async function handleAction(item: Deposit | Withdrawal, action: 'approve' | 'reject') {
    setProcessing(item.id);
    const id = item.id;

    if (type === 'deposit') {
      if (action === 'approve') {
        await supabase.rpc('admin_confirm_deposit', { p_deposit_id: id });
      } else {
        await supabase.rpc('admin_reject_deposit', { p_deposit_id: id, p_note: 'ডিপোজিট বাতিল' });
      }
    } else {
      if (action === 'approve') {
        await supabase.rpc('admin_confirm_withdrawal', { p_withdrawal_id: id });
      } else {
        await supabase.rpc('admin_reject_withdrawal', { p_withdrawal_id: id, p_note: 'উইথড্র বাতিল' });
      }
    }

    showToast(action === 'approve' ? 'success' : 'info', action === 'approve' ? 'অনুমোদিত হয়েছে' : 'বাতিল করা হয়েছে', action === 'approve' ? '✅' : '⚠️');

    const table = type === 'deposit' ? 'deposits' : 'withdrawals';
    const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setProcessing(null);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        {type === 'deposit' ? 'ডিপোজিট ব্যবস্থাপনা' : 'উইথড্র ব্যবস্থাপনা'}
      </h1>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>কোনো {type === 'deposit' ? 'ডিপোজিট' : 'উইথড্র'} নেই</p>
        </div>
      ) : (
        <div className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ইউজার</th>
                <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>পরিমাণ</th>
                {type === 'deposit' ? (
                  <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>UTR</th>
                ) : (
                  <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>পদ্ধতি</th>
                )}
                <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>স্ট্যাটাস</th>
                <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>তারিখ</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const u = users[item.user_id];
                const status = item.status;
                return (
                  <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-3 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{u?.username || item.user_id.slice(0, 8)}</td>
                    <td className="py-3 px-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(item.amount).toFixed(2)}</td>
                    <td className="py-3 px-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {type === 'deposit' ? (item as Deposit).utr : (item as Withdrawal).method === 'upi' ? `UPI: ${(item as Withdrawal).upi_id}` : `ব্যাংক: ${(item as Withdrawal).account_holder}`}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${status === 'approved' || status === 'success' ? 'bg-brand-500/10 text-brand-500' : status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{status}</span>
                    </td>
                    <td className="py-3 px-2 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-2 text-center">
                      {status === 'pending' && (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleAction(item, 'approve')} disabled={processing === item.id} className="p-2 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors" title="অনুমোদন">
                            {processing === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleAction(item, 'reject')} disabled={processing === item.id} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="বাতিল">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
