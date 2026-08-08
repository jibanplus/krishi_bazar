import { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Gift, TrendingUp, Loader2, Tag, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase, type Wallet as WalletType, type Transaction } from '@/lib/supabase';
import { StatsCardSkeleton, RowSkeleton } from '@/components/Skeletons';
import { showPopup } from '@/components/PopupHost';
import { useToast } from '@/lib/toast';

export function WalletPage() {
  const { session, profile } = useAuth();
  const { show: showToast } = useToast();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw' | 'bonus' | 'referral' | 'buy' | 'sell' | 'admin_credit' | 'admin_debit' | 'coupon'>('all');
  const [showWagering, setShowWagering] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const uid = session!.user.id;
      const [{ data: w }, { data: tx }] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      setWallet(w as WalletType | null);
      setTransactions(tx || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`wallet-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setWallet(payload.new as WalletType);
        // Check if wagering just completed
        const oldWallet = payload.old as WalletType | null;
        const newWallet = payload.new as WalletType;
        if (newWallet && oldWallet && newWallet.wagering_required === 0 && oldWallet.wagering_required > 0) {
          showPopup({
            kind: 'wagering_complete',
            amount: oldWallet.bonus_wagering_locked || 0,
            message: 'আপনার বোনাস উত্তোলনে 20x ট্রেড সম্পন হয়েছে। এখন উইথড্র করতে পারবেন।',
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setTransactions((prev) => [payload.new as Transaction, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const filtered = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) {
      showToast('error', 'কুপন কোড দিন', '⚠️');
      return;
    }
    setApplyingCoupon(true);
    const { data, error } = await supabase.rpc('redeem_coupon', { p_code: couponCode.trim() });
    setApplyingCoupon(false);
    
    if (error) {
      showToast('error', error.message || 'কুপন প্রয়োগ ব্যর্থ', '⚠️');
    } else if (data?.error) {
      showToast('error', data.error, '⚠️');
    } else if (data?.success) {
      showToast('success', 'কুপন সফলভাবে প্রয়োগ হয়েছে!', '✅');
      showPopup({ kind: 'coupon_bonus', amount: Number(data.amount) });
      setCouponCode('');
      // Refresh wallet
      const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session!.user.id).maybeSingle();
      setWallet(w as WalletType | null);
    }
  }

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
    { label: 'ব্যালেন্স', value: `₹${Number(wallet?.balance || 0).toFixed(2)}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'বোনাস (লকড)', value: `₹${Number(wallet?.bonus_wagering_locked || 0).toFixed(2)}`, icon: Gift, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'রেফারেল আয়', value: `₹${Number(wallet?.referral_income || 0).toFixed(2)}`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'মোট উইথড্র', value: `₹${Number(wallet?.total_withdraw || 0).toFixed(2)}`, icon: ArrowUpCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  const typeBn: Record<string, string> = {
    deposit: 'ডিপোজিট',
    withdraw: 'উইথড্র',
    bonus: 'বোনাস',
    referral: 'রেফারেল',
    buy: 'কেনা',
    sell: 'বিক্রি',
    admin_credit: 'অ্যাডমিন ক্রেডিট',
    admin_debit: 'অ্যাডমিন ডেবিট',
    coupon: 'কুপন',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>আমার ওয়ালেট</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>ব্যালেন্স, লেনদেন ও আয়ের বিবরণ</p>
      </div>

      {/* Stats - Compact Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.border} ${s.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${s.bg}`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/deposit" className="btn-primary flex items-center justify-center gap-2 py-3">
          <ArrowDownCircle className="w-4 h-4" /> ডিপোজিট
        </Link>
        <Link to="/withdraw" className="btn-outline flex items-center justify-center gap-2 py-3" style={{ borderColor: 'var(--border-color)' }}>
          <ArrowUpCircle className="w-4 h-4" /> উইথড্র
        </Link>
      </div>

      {/* Coupon Apply Section */}
      <div className="card p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>কুপন কোড প্রয়োগ করুন</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="কুপন কোড লিখুন (যেমন: WELCOME50)"
            className="input-field flex-1 text-sm py-2"
          />
          <button
            onClick={handleApplyCoupon}
            disabled={applyingCoupon || !couponCode.trim()}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {applyingCoupon ? 'প্রসেসিং...' : 'প্রয়োগ'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          কুপন কোড প্রয়োগ করলে বোনাস আপনার বোনাস সেকশনে যোগ হবে
        </p>
      </div>

      {/* Bonus Section - Separate from Main Wallet */}
      <div className="card p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>বোনাস সেকশন</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">মোট বোনাস</p>
            <p className="text-lg font-bold text-amber-500">₹{Number(wallet?.bonus_wagering_locked || 0).toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-400">মুক্ত বোনাস</p>
            <p className="text-lg font-bold text-emerald-500">₹{Number(wallet?.bonus || 0).toFixed(2)}</p>
          </div>
        </div>

        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          ⚠️ বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম। নিচে ওয়েজারিং প্রগ্রেস দেখুন।
        </p>

        {/* Bonus Transactions */}
        <div className="border-t border-amber-500/20 pt-3">
          <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>বোনাস লেনদেন</h3>
          {transactions.filter(t => t.type === 'bonus' || t.type === 'coupon').length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো বোনাস লেনদেন নেই</p>
          ) : (
            <div className="space-y-2">
              {transactions.filter(t => t.type === 'bonus' || t.type === 'coupon').slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-emerald-500/10">
                      <ArrowDownCircle className="w-3 h-3 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{typeBn[tx.type] || tx.type}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-500">+₹{Number(tx.amount).toFixed(2)}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">ক্রেডিট</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wagering Tracker - Compact */}
      {wallet && (wallet.wagering_required || 0) > 0 && (
        <div className="card p-4 bg-gradient-to-r from-brand-500/10 to-emerald-500/10 border border-brand-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ওয়েজারিং প্রগ্রেস</span>
            </div>
            <button onClick={() => setShowWagering(!showWagering)} className="text-xs font-medium px-2 py-1 rounded bg-brand-500/20 text-brand-500">
              {showWagering ? 'লুকান' : 'দেখুন'}
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min((wallet.wagering_completed || 0) / (wallet.wagering_required || 1) * 100, 100)}%` }}
            />
          </div>
          
          {/* Progress Info */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-bold text-brand-500">
              {Math.min((wallet.wagering_completed || 0) / (wallet.wagering_required || 1) * 100, 100).toFixed(1)}%
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ₹{Number(wallet.wagering_completed || 0).toFixed(0)} / ₹{Number(wallet.wagering_required || 0).toFixed(0)}
            </span>
          </div>

          {showWagering && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-emerald-400">সম্পন্ন</p>
                <p className="text-sm font-bold text-emerald-500">₹{Number(wallet.wagering_completed || 0).toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-xs text-amber-400">প্রয়োজন</p>
                <p className="text-sm font-bold text-amber-500">₹{Number(wallet.wagering_required || 0).toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20 text-center">
                <p className="text-xs text-slate-400">বাকি</p>
                <p className="text-sm font-bold text-slate-300">₹{Number(Math.max(0, (wallet.wagering_required || 0) - (wallet.wagering_completed || 0))).toFixed(0)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction History - Compact Row Layout */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>লেনদেনের ইতিহাস</h2>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'deposit', 'withdraw', 'referral', 'buy', 'sell'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === f ? 'bg-brand-500 text-white' : ''}`} style={filter !== f ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
                {f === 'all' ? 'সব' : typeBn[f] || f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>কোনো লেনদেন নেই</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => {
              const isCredit = tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'referral' || tx.type === 'sell' || tx.type === 'admin_credit' || tx.type === 'coupon';
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCredit ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {isCredit ? (
                        <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{typeBn[tx.type] || tx.type}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isCredit ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {isCredit ? 'ক্রেডিট' : 'ডেবিট'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
