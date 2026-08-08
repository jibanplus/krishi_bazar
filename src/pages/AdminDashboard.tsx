import { useEffect, useState } from 'react';
import { Users, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { StatsCardSkeleton } from '@/components/Skeletons';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    todayUsers: 0,
    totalDeposits: 0,
    totalWithdraws: 0,
    pendingDeposits: 0,
    pendingWithdraws: 0,
    revenue: 0,
    referralCount: 0,
    referralEarnings: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: wallets }, { data: tx }, { data: refs }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('wallets').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('referrals').select('*'),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setStats({
        totalUsers: profiles?.length || 0,
        onlineUsers: profiles?.filter((p) => p.is_online).length || 0,
        todayUsers: profiles?.filter((p) => new Date(p.created_at) >= today).length || 0,
        totalDeposits: tx?.filter((t) => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0) || 0,
        totalWithdraws: tx?.filter((t) => t.type === 'withdraw' && t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0) || 0,
        pendingDeposits: tx?.filter((t) => t.type === 'deposit' && t.status === 'pending').length || 0,
        pendingWithdraws: tx?.filter((t) => t.type === 'withdraw' && t.status === 'pending').length || 0,
        revenue: tx?.filter((t) => t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0) || 0,
        referralCount: refs?.length || 0,
        referralEarnings: refs?.reduce((s, r) => s + Number(r.earnings), 0) || 0,
      });

      setRecentUsers((profiles || []).slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: 'মোট ইউজার', value: stats.totalUsers, icon: Users, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'অনলাইন', value: stats.onlineUsers, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: "আজকের ইউজার", value: stats.todayUsers, icon: Users, color: 'text-gold-400', bg: 'bg-gold-400/10' },
    { label: 'মোট ডিপোজিট', value: `₹${stats.totalDeposits.toFixed(0)}`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'মোট উইথড্র', value: `₹${stats.totalWithdraws.toFixed(0)}`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'বিচারাধীন ডিপোজিট', value: stats.pendingDeposits, icon: Wallet, color: 'text-gold-400', bg: 'bg-gold-400/10' },
    { label: 'বিচারাধীন উইথড্র', value: stats.pendingWithdraws, icon: Wallet, color: 'text-gold-400', bg: 'bg-gold-400/10' },
    { label: 'মোট রাজস্ব', value: `₹${stats.revenue.toFixed(0)}`, icon: DollarSign, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'রেফারেল', value: stats.referralCount, icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'রেফারেল আয়', value: `₹${stats.referralEarnings.toFixed(0)}`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-500/10' },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>অ্যাডমিন ড্যাশবোর্ড</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                <div className={`p-1.5 rounded-lg ${c.bg}`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Users */}
      <div className="card p-5 mt-6 space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>সাম্প্রতিক ইউজার</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : recentUsers.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>কোনো ইউজার নেই</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-left py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ইউজারনেম</th>
                  <th className="text-left py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ইমেইল</th>
                  <th className="text-center py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ভূমিকা</th>
                  <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>তারিখ</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{u.username}</td>
                    <td className="py-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td className="py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-gold-400/10 text-gold-400' : 'bg-brand-500/10 text-brand-500'}`}>{u.role}</span>
                    </td>
                    <td className="py-3 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
