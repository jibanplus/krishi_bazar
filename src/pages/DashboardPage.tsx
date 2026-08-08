import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Users, TrendingUp, Gift, ArrowDownCircle, ArrowUpCircle, Bell, Activity, Award } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, type Wallet as WalletType, type Transaction, type Referral, type Notification, type Commodity, type HighRiskAsset } from '@/lib/supabase';
import { StatsCardSkeleton, RowSkeleton } from '@/components/Skeletons';

export function DashboardPage() {
  const { session, profile } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [highRiskAssets, setHighRiskAssets] = useState<HighRiskAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const commoditiesRef = useRef(commodities);
  
  // Keep ref updated
  useEffect(() => {
    commoditiesRef.current = commodities;
  }, [commodities]);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const uid = session!.user.id;
      const [{ data: w }, { data: tx }, { data: refs }, { data: notifs }, { data: comms }, { data: hra }] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
        supabase.from('referrals').select('*').eq('referrer_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('commodities').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('high_risk_assets').select('*').eq('is_active', true).order('sort_order'),
      ]);
      setWallet(w as WalletType | null);
      setTransactions(tx || []);
      setReferrals(refs || []);
      setNotifications(notifs || []);
      setCommodities(comms || []);
      setHighRiskAssets(hra || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`dashboard-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setWallet(payload.new as WalletType);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Automatic price updates every few seconds
  useEffect(() => {
    let updateCount = 0;
    const updatePrices = () => {
      // Update commodities (0.3% to 2% change)
      setCommodities((prev) => prev.map((c) => {
        const changePercent = (Math.random() * (2 - 0.3) + 0.3) * (Math.random() > 0.5 ? 1 : -1);
        const changeAmount = c.current_price * (changePercent / 100);
        const newPrice = c.current_price + changeAmount;
        const newChange = changeAmount;
        const newChangePercent = changePercent;
        
        const newDailyHigh = Math.max(c.daily_high || c.current_price, newPrice);
        const newDailyLow = Math.min(c.daily_low || c.current_price, newPrice);
        const newDailyChanges = (c.daily_changes || 0) + 1;
        const newAvgMovement = c.avg_movement ? ((c.avg_movement * (newDailyChanges - 1)) + Math.abs(changePercent)) / newDailyChanges : Math.abs(changePercent);
        
        return {
          ...c,
          current_price: newPrice,
          change: newChange,
          change_percent: newChangePercent,
          daily_high: newDailyHigh,
          daily_low: newDailyLow,
          daily_changes: newDailyChanges,
          avg_movement: newAvgMovement,
        };
      }));

      // Update crypto index (5% to 50% change)
      setHighRiskAssets((prev) => prev.map((a) => {
        const changePercent = (Math.random() * (50 - 5) + 5) * (Math.random() > 0.5 ? 1 : -1);
        const changeAmount = a.current_price * (changePercent / 100);
        const newPrice = a.current_price + changeAmount;
        const newChange = changeAmount;
        const newChangePercent = changePercent;
        
        const newDailyHigh = Math.max(a.daily_high || a.current_price, newPrice);
        const newDailyLow = Math.min(a.daily_low || a.current_price, newPrice);
        const newDailyChanges = (a.daily_changes || 0) + 1;
        const newAvgMovement = a.avg_movement ? ((a.avg_movement * (newDailyChanges - 1)) + Math.abs(changePercent)) / newDailyChanges : Math.abs(changePercent);
        
        return {
          ...a,
          current_price: newPrice,
          change: newChange,
          change_percent: newChangePercent,
          daily_high: newDailyHigh,
          daily_low: newDailyLow,
          daily_changes: newDailyChanges,
          avg_movement: newAvgMovement,
        };
      }));

      // Update database every 10th iteration (every 30 seconds)
      updateCount++;
      if (updateCount % 10 === 0) {
        async function updateDatabase() {
          try {
            const { data: commData } = await supabase.from('commodities').select('id, current_price, change, change_percent, daily_high, daily_low, daily_changes, avg_movement').eq('is_active', true);
            if (commData) {
              commData.forEach((c) => {
                const updatedCommodity = commoditiesRef.current.find((item: Commodity) => item.id === c.id);
                if (updatedCommodity) {
                  supabase.from('commodities').update({
                    current_price: updatedCommodity.current_price,
                    change: updatedCommodity.change,
                    change_percent: updatedCommodity.change_percent,
                    daily_high: updatedCommodity.daily_high,
                    daily_low: updatedCommodity.daily_low,
                    daily_changes: updatedCommodity.daily_changes,
                    avg_movement: updatedCommodity.avg_movement,
                  }).eq('id', c.id);
                }
              });
            }
          } catch (error) {
            console.error('Database update error:', error);
          }
        }
        updateDatabase();
      }
    };

    // Update every 3 seconds
    const interval = setInterval(updatePrices, 3000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent infinite loop

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
      </div>
    );
  }

  const stats = [
    { label: 'ওয়ালেট ব্যালেন্স', value: `₹${Number(wallet?.balance || 0).toFixed(2)}`, icon: Wallet, color: 'text-brand-500', bg: 'bg-brand-500/10', link: '/wallet' },
    { label: 'রেফারেল আয়', value: `₹${Number(wallet?.referral_income || 0).toFixed(2)}`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/referral' },
    { label: 'বোনাস', value: `₹${Number(wallet?.bonus || 0).toFixed(2)}`, icon: Gift, color: 'text-gold-400', bg: 'bg-gold-400/10', link: '/wallet' },
    { label: 'মোট ডিপোজিট', value: `₹${Number(wallet?.total_deposit || 0).toFixed(2)}`, icon: ArrowDownCircle, color: 'text-brand-500', bg: 'bg-brand-500/10', link: '/wallet' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          স্বাগতম, {profile?.username || 'User'}!
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>আপনার ড্যাশবোর্ড ওভারভিউ</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.link} className="card card-hover p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>সাম্প্রতিক লেনদেন</h2>
            <Link to="/wallet" className="text-sm text-brand-500 hover:underline">সব দেখুন</Link>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>কোনো লেনদেন নেই</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isCredit = tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'referral' || tx.type === 'sell' || tx.type === 'admin_credit';
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCredit ? 'bg-brand-500/10' : 'bg-red-500/10'}`}>
                        {isCredit ? <ArrowDownCircle className="w-4 h-4 text-brand-500" /> : <ArrowUpCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{tx.type}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isCredit ? 'text-brand-500' : 'text-red-500'}`}>
                        {isCredit ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                      </p>
                      {tx.type === 'deposit' || tx.type === 'withdraw' ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'approved' || tx.status === 'success' ? 'bg-brand-500/10 text-brand-500' : tx.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.status === 'approved' ? 'অনুমোদিত' : tx.status === 'pending' ? 'অপেক্ষমান' : tx.status === 'rejected' ? 'বাতিল' : tx.status}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500">
                          সম্পন্ন
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications + Referrals */}
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>নোটিফিকেশন</h2>
              <Link to="/notifications" className="text-sm text-brand-500 hover:underline">সব দেখুন</Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো নোটিফিকেশন নেই</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="p-1.5 rounded-lg bg-brand-500/10 flex-shrink-0 mt-0.5">
                      <Bell className="w-3.5 h-3.5 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>রেফারেল</h2>
              <Link to="/referral" className="text-sm text-brand-500 hover:underline">বিস্তারিত</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{referrals.length}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>মোট রেফারেল</p>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Award className="w-5 h-5 text-gold-400 mx-auto mb-1" />
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(wallet?.referral_income || 0).toFixed(0)}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>মোট আয়</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
