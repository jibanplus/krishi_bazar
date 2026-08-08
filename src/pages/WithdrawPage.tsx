import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase, type Withdrawal, type AdminSettings } from '@/lib/supabase';
import { ArrowUpFromLine, Clock, CheckCircle, XCircle, Building, Smartphone } from 'lucide-react';
import { showPopup } from '@/components/PopupHost';

export default function WithdrawPage() {
  const { profile, refreshProfile } = useAuth();
  const { show: showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('admin_settings').select('*').limit(1).maybeSingle();
      setSettings(s as AdminSettings | null);
    })();
  }, []);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('withdrawals').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
      setWithdrawals(data || []);
    })();
  }, [profile]);

  const minWithdraw = settings?.min_withdraw || 100;
  const balance = profile?.balance || 0;
  const processingFee = 9; // Fixed ₹9 processing fee
  const gstFee = processingFee * 0.18; // 18% GST on processing fee
  const totalFee = processingFee + gstFee; // Total fee (processing + GST)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < minWithdraw) { setError(`ন্যূনতম উইথড্র ₹${minWithdraw}`); return; }
    if (amt > balance) { setError(`আপনার ব্যালেন্স অপর্যাপ্ত (₹${balance.toFixed(2)})`); return; }

    if (method === 'upi' && !upiId.trim()) { setError('UPI আইডি দিন'); return; }
    if (method === 'bank') {
      if (!accountHolder.trim()) { setError('অ্যাকাউন্ট হোল্ডার নাম দিন'); return; }
      if (!accountNumber.trim()) { setError('ব্যাংক অ্যাকাউন্ট নম্বর দিন'); return; }
      if (!bankIfsc.trim()) { setError('IFSC কোড দিন'); return; }
    }

    setLoading(true);
    const finalAmount = amt - totalFee;
    const { data, error: rpcError } = await supabase.rpc('create_withdrawal', {
      p_amount: finalAmount,
      p_method: method,
      p_upi_id: method === 'upi' ? upiId.trim() : null,
      p_account_holder: method === 'bank' ? accountHolder.trim() : null,
      p_account_number: method === 'bank' ? accountNumber.trim() : null,
      p_bank_ifsc: method === 'bank' ? bankIfsc.trim() : null,
    });
    setLoading(false);

    if (rpcError) { 
      if (rpcError.message.includes('বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম')) {
        setError('বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম। ওয়ালেট পেজে ওয়েজারিং প্রগ্রেস দেখুন।');
        showToast('error', 'বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম', '⚠️');
      } else {
        setError(rpcError.message);
        showToast('error', rpcError.message, '⚠️');
      }
      return;
    }
    if (data?.error) { 
      if (data.error.includes('বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম')) {
        setError('বোনাস উত্তোলনে 20x ট্রড সম্পন করতে হবে প্রথম। ওয়ালেট পেজে ওয়েজারিং প্রগ্রেস দেখুন।');
        showToast('error', 'বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম', '⚠️');
      } else {
        setError(data.error);
        showToast('error', data.error, '⚠️');
      }
      return;
    }

    setSuccess('উইথড্র অনুরোধ গৃহীত হয়েছে। অ্যাডমিন অনুমোদনের পর টাকা পাবেন।');
    showPopup({ kind: 'withdraw', amount: finalAmount, charge: totalFee, message: 'উইথড্র অনুরোধ জমা হয়েছে (প্রসেসিং ফি: ₹' + processingFee + ', GST: ₹' + gstFee.toFixed(2) + ', মোট ফি: ₹' + totalFee.toFixed(2) + ')' });
    setAmount('');
    refreshProfile();
    const { data: wd } = await supabase.from('withdrawals').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(20);
    setWithdrawals(wd || []);
  };

  const statusBn = (status: string) => {
    const map: Record<string, string> = { pending: 'অপেক্ষমান', approved: 'অনুমোদিত', success: 'সফল', rejected: 'বাতিল', failed: 'ব্যর্থ' };
    return map[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>টাকা উত্তোলন</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>UPI বা ব্যাংক অ্যাকাউন্টে টাকা নিন</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Withdraw Form */}
        <div className="card p-5 space-y-4">
          {/* Balance Display */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>উপলব্ধ ব্যালেন্স</span>
              <span className="text-xl font-bold text-emerald-500">₹{balance.toFixed(2)}</span>
            </div>
          </div>

          {/* Method Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMethod('upi')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                method === 'upi' ? 'bg-emerald-500 text-white' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}>
              <Smartphone className="w-4 h-4" /> UPI
            </button>
            <button onClick={() => setMethod('bank')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition ${
                method === 'bank' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
              }`}>
              <Building className="w-4 h-4" /> ব্যাংক
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>পরিমাণ (₹)</label>
              <input type="number" min={minWithdraw} max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} required
                className="input-field" placeholder={String(minWithdraw)} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>সর্বোচ্চ: ₹{balance.toFixed(2)} • ন্যূনতম: ₹{minWithdraw}</p>
            </div>

            {/* Fee Breakdown */}
            {amount && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>পরিমাণ</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{parseFloat(amount).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-400">প্রসেসিং ফি</p>
                    <p className="text-sm font-bold text-amber-500">-₹{processingFee}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-400">GST (18%)</p>
                    <p className="text-sm font-bold text-amber-500">-₹{gstFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-400">প্রাপ্ত</p>
                    <p className="text-sm font-bold text-emerald-500">₹{(parseFloat(amount) - totalFee).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            {method === 'upi' ? (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>আপনার UPI আইডি</label>
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} required
                  className="input-field" placeholder="yourname@upi" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>হোল্ডার নাম</label>
                  <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} required
                    className="input-field" placeholder="নাম" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>অ্যাকাউন্ট নম্বর</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required
                    className="input-field" placeholder="1234567890" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>IFSC কোড</label>
                  <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} required
                    className="input-field" placeholder="SBIN0000000" />
                </div>
              </div>
            )}

            {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2 text-rose-500 text-sm">{error}</div>}
            {success && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-emerald-500 text-sm">{success}</div>}

            <button type="submit" disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 py-3">
              <ArrowUpFromLine className="w-4 h-4" /> {loading ? 'প্রসেসিং...' : 'উইথড্র অনুরোধ করুন'}
            </button>
          </form>
        </div>

        {/* Withdraw History - Compact */}
        <div className="card p-4 space-y-3">
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>উইথড্র ইতিহাস</h2>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>কোনো উইথড্র নেই</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${w.status === 'approved' || w.status === 'success' ? 'bg-emerald-500/10' : w.status === 'pending' ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
                      {w.status === 'approved' || w.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : w.status === 'pending' ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>₹{Number(w.amount).toFixed(2)}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.method}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${w.status === 'approved' || w.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : w.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {statusBn(w.status)}
                    </span>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(w.created_at).toLocaleDateString('bn-BD')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
