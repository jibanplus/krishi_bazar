import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase, type Deposit, type AdminSettings } from '@/lib/supabase';
import { ArrowDownToLine, Clock, CheckCircle, XCircle, AlertCircle, Copy, QrCode } from 'lucide-react';
import { showPopup } from '@/components/PopupHost';

export default function DepositPage() {
  const { profile } = useAuth();
  const { show: showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [upiId, setUpiId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bonusApplied, setBonusApplied] = useState(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
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
      const { data } = await supabase.from('deposits').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
      setDeposits(data || []);
    })();
  }, [profile]);

  const adminUpi = settings?.upi_id || 'bengalimarket@upi';
  const qrUrl = settings?.qr_code_url;
  const minDeposit = settings?.min_deposit || 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < minDeposit) { setError(`ন্যূনতম ডিপোজিট ₹${minDeposit}`); return; }
    if (!utr.trim() || utr.trim().length < 6) { setError('সঠিক UTR নম্বর দিন (কমপক্ষে ৬ অক্ষর)'); return; }
    if (!upiId.trim()) { setError('আপনার UPI আইডি দিন'); return; }

    setLoading(true);
    const { error: insertError } = await supabase.from('deposits').insert({
      user_id: profile!.id, amount: amt, utr: utr.trim(), upi_id: upiId.trim(), status: 'pending',
    });
    if (insertError) { setLoading(false); setError('ডিপোজিট অনুরোধ ব্যর্থ: ' + insertError.message); showToast('error', 'ডিপোজিট অনুরোধ ব্যর্থ', '⚠️'); return; }

    // Record pending transaction so it shows in wallet history immediately
    await supabase.from('transactions').insert({
      user_id: profile!.id, type: 'deposit', amount: amt, status: 'pending',
      description: 'ডিপোজিট অনুরোধ / Deposit Request (UTR: ' + utr.trim() + ')',
    });
    setLoading(false);

    setSuccess('ডিপোজিট অনুরোধ গৃহীত হয়েছে! ৫ মিনিটের মধ্যে ভেরিফিকেশন হবে।');
    showPopup({ kind: 'deposit', amount: amt, message: 'ডিপোজিট অনুরোধ জমা হয়েছে' });
    setAmount(''); setUtr(''); setUpiId('');
    const { data } = await supabase.from('deposits').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(20);
    setDeposits(data || []);
  };

  const copyUpi = () => { navigator.clipboard?.writeText(adminUpi); showToast('info', 'UPI আইডি কপি হয়েছে', '📋'); };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast('error', 'কুপন কোড দিন', '⚠️');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < minDeposit) {
      showToast('error', `ন্যূনতম ডিপোজিট ₹${minDeposit}`, '⚠️');
      return;
    }

    const { data, error } = await supabase.rpc('apply_coupon_code', {
      p_coupon_code: couponCode.trim(),
      p_deposit_amount: amt,
    });

    if (error || data?.[0]?.success === false) {
      showToast('error', data?.[0]?.message || 'কুপন প্রয়োগ ব্যর্থ', '⚠️');
      setBonusApplied(0);
    } else {
      setBonusApplied(data?.[0]?.bonus_amount || 0);
      showToast('success', `কুপন প্রয়োগ হয়েছে! বোনাস: ₹${data?.[0]?.bonus_amount}`, '🎉');
    }
  };

  const statusBn = (status: string) => {
    const map: Record<string, string> = { pending: 'অপেক্ষমান', approved: 'অনুমোদিত', rejected: 'বাতিল', success: 'সফল', failed: 'ব্যর্থ' };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">টাকা যোগ করুন</h1>
        <p className="text-ink-300 text-sm mt-1">UPI দিয়ে ডিপোজিট করুন</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit form */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-ink-100 mb-4">ডিপোজিট ফর্ম</h2>

          {/* QR Code + UPI info */}
          <div className="glass-light rounded-xl p-4 mb-4">
            {qrUrl && (
              <div className="mb-3 text-center">
                <div className="inline-block rounded-xl bg-white p-3">
                  <img src={qrUrl} alt="Payment QR" className="w-48 h-48 object-contain" />
                </div>
                <p className="text-xs text-ink-400 mt-2">QR কোড স্ক্যান করে পেমেন্ট করুন</p>
              </div>
            )}
            <p className="text-xs text-ink-400 mb-1">অ্যাডমিন UPI আইডি (এখানে টাকা পাঠান):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-emerald-light font-mono text-sm bg-ink-900/50 rounded-lg px-3 py-2">{adminUpi}</code>
              <button onClick={copyUpi} className="bg-ink-700 hover:bg-ink-600 p-2 rounded-lg transition"><Copy size={16} className="text-ink-200" /></button>
            </div>
            <p className="text-xs text-gold-light mt-2">টাকা পাঠানোর পর UTR নম্বর নিচে দিন। ৫ মিনিটের মধ্যে ভেরিফাই হবে।</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-ink-200 mb-1">পরিমাণ (₹)</label>
              <input type="number" min={minDeposit} value={amount} onChange={(e) => setAmount(e.target.value)} required
                className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm text-ink-200 mb-1">কুপন কোড (ঐচ্ছিক)</label>
              <div className="flex gap-2">
                <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition" placeholder="WELCOME50" />
                <button type="button" onClick={applyCoupon} className="bg-gold hover:bg-gold-dark text-ink-900 font-semibold px-4 py-3 rounded-xl transition">
                  প্রয়োগ
                </button>
              </div>
              {bonusApplied > 0 && (
                <p className="text-xs text-emerald-light mt-1">✅ বোনাস: ₹{bonusApplied} ক্রেডিট হবে</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-ink-200 mb-1">আপনার UPI আইডি</label>
              <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} required
                className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition" placeholder="yourname@upi" />
            </div>
            <div>
              <label className="block text-sm text-ink-200 mb-1">UTR / ট্রানজেকশন আইডি</label>
              <input type="text" value={utr} onChange={(e) => setUtr(e.target.value)} required
                className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition" placeholder="1234567890" />
              <p className="text-xs text-ink-400 mt-1">UPI অ্যাপ থেকে ট্রানজেকশন রেফারেন্স নম্বর কপি করে এখানে দিন</p>
            </div>
            {error && <div className="bg-crimson/20 border border-crimson/40 rounded-lg px-4 py-2 text-crimson-light text-sm">{error}</div>}
            {success && <div className="bg-emerald/20 border border-emerald/40 rounded-lg px-4 py-2 text-emerald-light text-sm">{success}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-lg">
              <ArrowDownToLine size={20} /> {loading ? 'জমা হচ্ছে...' : 'ডিপোজিট অনুরোধ পাঠান'}
            </button>
          </form>
        </div>

        {/* Deposit history */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-ink-100 mb-4">ডিপোজিট ইতিহাস</h2>
          {deposits.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-8">কোনো ডিপোজিট নেই</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {deposits.map((d) => (
                <div key={d.id} className="glass-light rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink-100">₹{Number(d.amount).toFixed(2)}</p>
                      <p className="text-xs text-ink-400">UTR: {d.utr}</p>
                      <p className="text-xs text-ink-500">{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {d.status === 'pending' && <Clock size={14} className="text-gold-light" />}
                      {d.status === 'approved' && <CheckCircle size={14} className="text-emerald-light" />}
                      {d.status === 'rejected' && <XCircle size={14} className="text-crimson-light" />}
                      <span className={`text-xs font-medium ${
                        d.status === 'approved' || d.status === 'success' ? 'text-emerald-light' :
                        d.status === 'pending' ? 'text-gold-light' :
                        'text-crimson-light'
                      }`}>{statusBn(d.status)}</span>
                    </div>
                  </div>
                  {d.admin_note && d.status === 'rejected' && (
                    <p className="text-xs text-crimson-light mt-1">কারণ: {d.admin_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
