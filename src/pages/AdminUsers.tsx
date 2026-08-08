import { useEffect, useState } from 'react';
import { Loader2, Search, Shield, ShieldOff, Ban, CheckCircle, X, Wallet, TrendingUp, Gift, Calendar, User as UserIcon, Plus, Minus, Grid, List, MessageSquare, AlertCircle, CreditCard, History } from 'lucide-react';
import { supabase, type Profile, type Transaction, type Deposit, type Withdrawal, type Referral, type Wallet as WalletType } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

export function AdminUsers() {
  const { show: showToast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDetail, setUserDetail] = useState<{
    wallet: WalletType | null;
    transactions: Transaction[];
    deposits: Deposit[];
    withdrawals: Withdrawal[];
    referrals: Referral[];
    logs: { id: string; action: string; created_at: string }[];
    adjustments: { id: string; amount: number; direction: string; reason: string; balance_after: number; created_at: string; admin_id: string }[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustDirection, setAdjustDirection] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'transactions' | 'deposits' | 'withdrawals' | 'referrals' | 'activity'>('overview');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleRole(u: Profile) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    await supabase.from('profiles').update({ role: newRole }).eq('id', u.id);
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, role: newRole } : p)));
  }

  async function toggleBan(u: Profile) {
    const { data } = await supabase.rpc('admin_block_user', { p_user_id: u.id, p_block: !u.is_blocked });
    if (data?.error) { showToast('error', data.error, '⚠️'); return; }
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, is_blocked: !p.is_blocked } : p)));
    showToast('info', u.is_blocked ? 'আনব্লক করা হয়েছে' : 'ব্লক করা হয়েছে', u.is_blocked ? '✅' : '🚫');
  }

  async function openUserDetail(u: Profile) {
    setSelectedUser(u);
    setDetailLoading(true);
    const [walletRes, txRes, depRes, wdRes, refRes, logRes, adjRes] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', u.id).maybeSingle(),
      supabase.from('transactions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('deposits').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('withdrawals').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('referrals').select('*').eq('referrer_id', u.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('activity_logs').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('wallet_adjustments').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20),
    ]);

    setUserDetail({
      wallet: walletRes.data as WalletType | null,
      transactions: txRes.data || [],
      deposits: depRes.data || [],
      withdrawals: wdRes.data || [],
      referrals: refRes.data || [],
      logs: logRes.data || [],
      adjustments: adjRes.data || [],
    });
    setDetailLoading(false);
  }

  async function handleAdjust() {
    if (!selectedUser) return;
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0 || !adjustReason.trim()) {
      showToast('error', 'পরিমাণ এবং কারণ লিখুন', '⚠️');
      return;
    }
    setAdjusting(true);
    const { data, error } = await supabase.rpc('admin_adjust_wallet', {
      p_user_id: selectedUser.id,
      p_amount: amount,
      p_direction: adjustDirection,
      p_reason: adjustReason.trim(),
    });
    setAdjusting(false);
    if (error || data?.error) {
      showToast('error', error?.message || data.error, '⚠️');
      return;
    }
    const newBalance = Number(data.balance);
    showToast('success', `ব্যালেন্স আপডেট: ₹${newBalance.toFixed(2)}`, '✅');
    setAdjustAmount('');
    setAdjustReason('');
    setUsers((prev) => prev.map((p) => (p.id === selectedUser.id ? { ...p, balance: newBalance } : p)));
    setSelectedUser({ ...selectedUser, balance: newBalance });
    await openUserDetail({ ...selectedUser, balance: newBalance });
  }

  async function handleResetAllData() {
    if (!confirm('⚠️ সতর্কতা: এটা সব ইউজার ডেটা মুছে ফেলবে (notifications, transactions, wallet balances, referrals)। পূর্বাবস্থায় ফিরিয়ে আনা যাবে না!')) {
      return;
    }
    setResetting(true);
    const { data, error } = await supabase.rpc('admin_reset_all_data');
    setResetting(false);
    if (error || data?.error) {
      showToast('error', error?.message || data.error, '⚠️');
      return;
    }
    showToast('success', 'সব ইউজার ডেটা রিসেট করা হয়েছে', '✅');
    window.location.reload();
  }

  const filtered = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && !u.is_blocked) || (statusFilter === 'blocked' && u.is_blocked);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>ইউজার ব্যবস্থাপনা</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="খুঁজুন..." />
        </div>
        
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
            className="input-field px-3 py-2"
          >
            <option value="all">সকল ভূমিকা</option>
            <option value="admin">অ্যাডমিন</option>
            <option value="user">ইউজার</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked')}
            className="input-field px-3 py-2"
          >
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="active">সক্রিয়</option>
            <option value="blocked">ব্লকড</option>
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="টেবিল ভিউ"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="কার্ড ভিউ"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reset All Data Button - Danger Zone */}
      <div className="card p-4 bg-red-500/10 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-bold text-red-500">সব ইউজার ডেটা রিসেট</h3>
              <p className="text-xs text-red-400">notifications, transactions, wallet balances, referrals মুছে ফেলবে</p>
            </div>
          </div>
          <button
            onClick={handleResetAllData}
            disabled={resetting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'রিসেট করুন'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ইউজার</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ইমেইল</th>
                <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ব্যালেন্স</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>ভূমিকা</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>স্ট্যাটাস</th>
                <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>তারিখ</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.id} className="border-b cursor-pointer hover:bg-brand-500/5" style={{ borderColor: 'var(--border-color)' }} onClick={() => openUserDetail(u)}>
                  <td className="py-3 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{u.username}</td>
                  <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td className="py-3 px-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(u.balance).toFixed(0)}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-gold-400/10 text-gold-400' : 'bg-brand-500/10 text-brand-500'}`}>{u.role}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.is_blocked ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                      {u.is_blocked ? 'ব্লকড' : 'সক্রিয়'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleRole(u)} className="p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }} title="ভূমিকা পরিবর্তন">
                        {u.role === 'admin' ? <Shield className="w-4 h-4 text-gold-400" /> : <ShieldOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => toggleBan(u)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-secondary)' }} title={u.is_blocked ? 'আনব্লক' : 'ব্লক'}>
                        {u.is_blocked ? <CheckCircle className="w-4 h-4 text-brand-500" /> : <Ban className="w-4 h-4 text-red-500" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                মোট {filtered.length} ইউজার • পৃষ্ঠা {currentPage} এর {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  আগে
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  পরে
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedUsers.map((u) => (
            <div
              key={u.id}
              className="card p-4 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => openUserDetail(u)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.username}</h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{u.email}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ব্যালেন্স</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(u.balance).toFixed(0)}</span>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-gold-400/10 text-gold-400' : 'bg-brand-500/10 text-brand-500'}`}>{u.role}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_blocked ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                    {u.is_blocked ? 'ব্লকড' : 'সক্রিয়'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleRole(u); }}
                  className="flex-1 p-2 rounded-lg hover:bg-brand-500/10 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ভূমিকা
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBan(u); }}
                  className="flex-1 p-2 rounded-lg hover:bg-red-500/10 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {u.is_blocked ? 'আনব্লক' : 'ব্লক'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards Pagination */}
      {viewMode === 'cards' && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            মোট {filtered.length} ইউজার • পৃষ্ঠা {currentPage} এর {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              আগে
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              পরে
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal - Compact Tabbed Interface */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 animate-slide-up">
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>

            {/* Compact User Info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedUser.username}</h2>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{selectedUser.email}</p>
              </div>
              <div className="flex gap-1">
                <span className={`text-xs px-2 py-1 rounded-full ${selectedUser.role === 'admin' ? 'bg-gold-400/10 text-gold-400' : 'bg-brand-500/10 text-brand-500'}`}>{selectedUser.role}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${selectedUser.is_blocked ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>{selectedUser.is_blocked ? 'ব্লকড' : 'সক্রিয়'}</span>
              </div>
            </div>

            {/* Compact Wallet Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Wallet className="w-4 h-4 text-brand-500 mx-auto mb-1" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ব্যালেন্স</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(userDetail?.wallet?.balance || selectedUser.balance).toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Gift className="w-4 h-4 text-gold-400 mx-auto mb-1" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>বোনাস</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(userDetail?.wallet?.bonus || 0).toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <TrendingUp className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>রেফারেল</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(userDetail?.wallet?.referral_income || 0).toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <History className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>রেফারেল</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedUser.total_referrals}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: 'overview', label: 'ওভারভিউ', icon: UserIcon },
                { id: 'wallet', label: 'ওয়ালেট', icon: Wallet },
                { id: 'transactions', label: 'লেনদেন', icon: CreditCard },
                { id: 'deposits', label: 'ডিপোজিট', icon: Plus },
                { id: 'withdrawals', label: 'উইথড্র', icon: Minus },
                { id: 'referrals', label: 'রেফারেল', icon: Gift },
                { id: 'activity', label: 'অ্যাক্টিভিটি', icon: AlertCircle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    activeTab === tab.id 
                      ? 'bg-brand-500 text-white' 
                      : 'hover:bg-brand-500/10'
                  }`}
                  style={activeTab !== tab.id ? { color: 'var(--text-secondary)' } : undefined}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-48">
              {detailLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>অ্যাকাউন্ট তথ্য</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span style={{ color: 'var(--text-secondary)' }}>ইমেইল:</span> <span style={{ color: 'var(--text-primary)' }}>{selectedUser.email}</span></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>তৈরি:</span> <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedUser.created_at).toLocaleDateString()}</span></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>ভূমিকা:</span> <span style={{ color: 'var(--text-primary)' }}>{selectedUser.role}</span></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>স্ট্যাটাস:</span> <span style={{ color: selectedUser.is_blocked ? 'red' : 'var(--text-primary)' }}>{selectedUser.is_blocked ? 'ব্লকড' : 'সক্রিয়'}</span></div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>দ্রুত অ্যাকশন</h4>
                        <div className="flex gap-2">
                          <button onClick={() => toggleRole(selectedUser)} className="flex-1 p-2 rounded-lg hover:bg-brand-500/10 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            ভূমিকা পরিবর্তন
                          </button>
                          <button onClick={() => toggleBan(selectedUser)} className="flex-1 p-2 rounded-lg hover:bg-red-500/10 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {selectedUser.is_blocked ? 'আনব্লক' : 'ব্লক'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wallet Tab */}
                  {activeTab === 'wallet' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>ওয়ালেট সমন্বয়</h4>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <select
                            value={adjustDirection}
                            onChange={(e) => setAdjustDirection(e.target.value as 'credit' | 'debit')}
                            className="input-field px-2 py-1 text-xs"
                          >
                            <option value="credit">ক্রেডিট</option>
                            <option value="debit">ডেবিট</option>
                          </select>
                          <input
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            placeholder="পরিমাণ"
                            className="input-field text-xs py-2"
                          />
                        </div>
                        <input
                          type="text"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="কারণ"
                          className="input-field text-xs py-2 mb-2"
                        />
                        <button
                          onClick={handleAdjust}
                          disabled={adjusting || !adjustAmount || !adjustReason}
                          className="w-full btn-primary text-xs py-2"
                        >
                          {adjusting ? 'প্রসেসিং...' : 'অ্যাডজাস্ট করুন'}
                        </button>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>অ্যাডজাস্টমেন্ট ইতিহাস</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {userDetail?.adjustments.length === 0 ? (
                            <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>কোনো অ্যাডজাস্টমেন্ট নেই</p>
                          ) : (
                            userDetail?.adjustments.map((adj) => (
                              <div key={adj.id} className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <span style={{ color: adj.direction === 'credit' ? 'var(--text-primary)' : 'red' }}>
                                  {adj.direction === 'credit' ? '+' : '-'}₹{Number(adj.amount).toFixed(0)}
                                </span>
                                <span className="truncate max-w-24" style={{ color: 'var(--text-secondary)' }}>{adj.reason}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{new Date(adj.created_at).toLocaleDateString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transactions Tab */}
                  {activeTab === 'transactions' && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="max-h-48 overflow-y-auto">
                        {userDetail?.transactions.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো লেনদেন নেই</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead><tr style={{ color: 'var(--text-secondary)' }}><th className="text-left py-1">ধরন</th><th className="text-right">পরিমাণ</th><th className="text-center">স্ট্যাটাস</th><th className="text-right">তারিখ</th></tr></thead>
                            <tbody>
                              {userDetail?.transactions.map((tx) => (
                                <tr key={tx.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                                  <td className="py-1.5 capitalize" style={{ color: 'var(--text-primary)' }}>{tx.type}</td>
                                  <td className="text-right" style={{ color: tx.amount >= 0 ? 'var(--text-primary)' : 'red' }}>₹{Number(tx.amount).toFixed(0)}</td>
                                  <td className="text-center"><span className={`px-1.5 py-0.5 rounded-full ${tx.status === 'approved' ? 'bg-brand-500/10 text-brand-500' : tx.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{tx.status}</span></td>
                                  <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deposits Tab */}
                  {activeTab === 'deposits' && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {userDetail?.deposits.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো ডিপোজিট নেই</p>
                        ) : (
                          userDetail?.deposits.map((d) => (
                            <div key={d.id} className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <span style={{ color: 'var(--text-primary)' }}>₹{Number(d.amount).toFixed(0)}</span>
                              <span className={`px-1.5 py-0.5 rounded-full ${d.status === 'approved' ? 'bg-brand-500/10 text-brand-500' : d.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{d.status}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{new Date(d.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Withdrawals Tab */}
                  {activeTab === 'withdrawals' && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {userDetail?.withdrawals.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো উইথড্র নেই</p>
                        ) : (
                          userDetail?.withdrawals.map((w) => (
                            <div key={w.id} className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <span style={{ color: 'var(--text-primary)' }}>₹{Number(w.amount).toFixed(0)}</span>
                              <span className={`px-1.5 py-0.5 rounded-full ${w.status === 'success' ? 'bg-brand-500/10 text-brand-500' : w.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{w.status}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{new Date(w.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Referrals Tab */}
                  {activeTab === 'referrals' && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {userDetail?.referrals.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো রেফারেল নেই</p>
                        ) : (
                          userDetail?.referrals.map((r) => (
                            <div key={r.id} className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <span style={{ color: 'var(--text-primary)' }}>আয়: ₹{Number(r.earnings).toFixed(0)}</span>
                              <span className={`px-1.5 py-0.5 rounded-full ${r.status === 'rewarded' ? 'bg-brand-500/10 text-brand-500' : r.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{r.status}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Activity Tab */}
                  {activeTab === 'activity' && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {userDetail?.logs.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>কোনো অ্যাক্টিভিটি নেই</p>
                        ) : (
                          userDetail?.logs.map((log) => (
                            <div key={log.id} className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <span className="truncate max-w-48" style={{ color: 'var(--text-primary)' }}>{log.action}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
