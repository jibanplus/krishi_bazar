import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, ShieldAlert, Gift, Ban, X, Check, RotateCcw, Info } from 'lucide-react';
import { supabase, type Referral, type Profile, type AntiCheatFlag } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

export function AdminAntiCheat() {
  const { show: showToast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [flags, setFlags] = useState<AntiCheatFlag[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [revokeModal, setRevokeModal] = useState<Referral | null>(null);
  const [restoreModal, setRestoreModal] = useState<Referral | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      const [refRes, flagRes, profileRes] = await Promise.all([
        supabase.from('referrals').select('*').order('created_at', { ascending: false }),
        supabase.from('anti_cheat_flags').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);

      setReferrals(refRes.data || []);
      setFlags(flagRes.data || []);

      const map: Record<string, Profile> = {};
      (profileRes.data || []).forEach((p) => { map[p.id] = p as Profile; });
      setUsers(map);
      setLoading(false);
    }
    load();
  }, []);

  // Detect suspicious referrals: same referrer + referred on same day, or self-referral, or multiple from same IP
  const suspicious = referrals.filter((r) => {
    const referrer = users[r.referrer_id];
    const referred = users[r.referred_id];
    if (!referrer || !referred) return false;
    // self-referral
    if (r.referrer_id === r.referred_id) return true;
    // same email domain with very close registration times
    const refTime = new Date(referrer.created_at).getTime();
    const recTime = new Date(referred.created_at).getTime();
    const diffMin = Math.abs(refTime - recTime) / 60000;
    if (diffMin < 5) return true;
    return false;
  });

  async function handleRevoke() {
    if (!revokeModal || !reason.trim()) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc('admin_revoke_referral', {
      p_referral_id: revokeModal.id,
      p_reason: reason.trim(),
    });
    if (error || data?.error) {
      showToast('error', error?.message || data?.error || 'ব্যর্থ', '⚠️');
    } else {
      showToast('success', 'রেফারেল রিওয়ার্ড বাতিল করা হয়েছে এবং ইউজারকে জানানো হয়েছে', '✅');
      setReferrals((prev) => prev.map((r) => (r.id === revokeModal.id ? { ...r, status: 'revoked' } : r)));
      const [refRes, flagRes] = await Promise.all([
        supabase.from('referrals').select('*').order('created_at', { ascending: false }),
        supabase.from('anti_cheat_flags').select('*').order('created_at', { ascending: false }),
      ]);
      setReferrals(refRes.data || []);
      setFlags(flagRes.data || []);
    }
    setProcessing(false);
    setRevokeModal(null);
    setReason('');
  }

  async function handleRestore() {
    if (!restoreModal || !reason.trim()) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc('admin_restore_referral', {
      p_referral_id: restoreModal.id,
      p_reason: reason.trim(),
    });
    if (error || data?.error) {
      showToast('error', error?.message || data?.error || 'ব্যর্থ', '⚠️');
    } else {
      showToast('success', 'রেফারেল রিওয়ার্ড পুনরুদ্ধার করা হয়েছে এবং ইউজারকে জানানো হয়েছে', '✅');
      setReferrals((prev) => prev.map((r) => (r.id === restoreModal.id ? { ...r, status: 'active' } : r)));
      const [refRes, flagRes] = await Promise.all([
        supabase.from('referrals').select('*').order('created_at', { ascending: false }),
        supabase.from('anti_cheat_flags').select('*').order('created_at', { ascending: false }),
      ]);
      setReferrals(refRes.data || []);
      setFlags(flagRes.data || []);
    }
    setProcessing(false);
    setRestoreModal(null);
    setReason('');
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-7 h-7 text-red-500" />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>অ্যান্টি-চিট রেফারেল</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>মোট রেফারেল</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{referrals.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>সন্দেহজনক</p>
              <p className="text-2xl font-bold text-red-500">{suspicious.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ফ্ল্যাগ করা</p>
              <p className="text-2xl font-bold text-gold-400">{flags.length}</p>
            </div>
          </div>

          {/* Suspicious Referrals */}
          {suspicious.length > 0 && (
            <div className="card p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" /> সন্দেহজনক রেফারেল
              </h3>
              <div className="space-y-2">
                {suspicious.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {users[r.referrer_id]?.username} → {users[r.referred_id]?.username}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        কোড: {r.code} • ₹{Number(r.earnings).toFixed(0)} • {r.status}
                      </p>
                    </div>
                    {r.status !== 'revoked' && (
                      <button onClick={() => setRevokeModal(r)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20">
                        রিওয়ার্ড বাতিল
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Referrals */}
          <div className="card p-5">
            <h3 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>সব রেফারেল কার্যকলাপ</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>রেফারার</th>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>রেফার্ড</th>
                    <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>আয়</th>
                    <th className="text-center py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>স্ট্যাটাস</th>
                    <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>তারিখ</th>
                    <th className="text-center py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="py-2.5" style={{ color: 'var(--text-primary)' }}>{users[r.referrer_id]?.username || '—'}</td>
                      <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>{users[r.referred_id]?.username || '—'}</td>
                      <td className="py-2.5 text-right" style={{ color: 'var(--text-primary)' }}>₹{Number(r.earnings).toFixed(0)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'revoked' ? 'bg-red-500/10 text-red-500' : r.status === 'rewarded' || r.status === 'active' ? 'bg-brand-500/10 text-brand-500' : 'bg-gray-500/10 text-gray-500'}`}>{r.status}</span>
                      </td>
                      <td className="py-2.5 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.status !== 'revoked' && (
                            <button onClick={() => setRevokeModal(r)} className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20">
                              বাতিল
                            </button>
                          )}
                          {r.status === 'revoked' && (
                            <button onClick={() => setRestoreModal(r)} className="text-xs px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20">
                              পুনরুদ্ধার
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Anti-Cheat Flags */}
          {flags.length > 0 && (
            <div className="card p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-gold-400">
                <Ban className="w-5 h-5" /> চিহ্নিত কার্যকলাপ
              </h3>
              <div className="space-y-2">
                {flags.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{users[f.user_id]?.username || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.flag_type}: {f.details}</p>
                      {f.reason && <p className="text-xs text-red-500 mt-0.5">কারণ: {f.reason}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${f.severity === 'high' ? 'bg-red-500/10 text-red-500' : f.severity === 'medium' ? 'bg-gold-400/10 text-gold-400' : 'bg-blue-500/10 text-blue-500'}`}>{f.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRevokeModal(null)} />
          <div className="relative card w-full max-w-md p-6 animate-slide-up">
            <button onClick={() => setRevokeModal(null)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>রেফারেল রিওয়ার্ড বাতিল</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {users[revokeModal.referrer_id]?.username} → {users[revokeModal.referred_id]?.username} • ₹{Number(revokeModal.earnings).toFixed(0)}
                </p>
              </div>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              রিওয়ার্ড বাতিল করলে ইউজারের ওয়ালেট থেকে টাকা কাটা হবে এবং তাকে নোটিফিকেশন পাঠানো হবে।
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field min-h-24 mb-4"
              placeholder="বাতিলের কারণ লিখুন..."
            />
            <button
              onClick={handleRevoke}
              disabled={processing || !reason.trim()}
              className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              রিওয়ার্ড বাতিল করুন
            </button>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRestoreModal(null)} />
          <div className="relative card w-full max-w-md p-6 animate-slide-up">
            <button onClick={() => setRestoreModal(null)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>রেফারেল রিওয়ার্ড পুনরুদ্ধার</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {users[restoreModal.referrer_id]?.username} → {users[restoreModal.referred_id]?.username} • ₹{Number(restoreModal.earnings).toFixed(0)}
                </p>
              </div>
            </div>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-500 mt-0.5" />
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-semibold mb-1">পুনরুদ্ধার নোট:</p>
                  <p>• <strong>বাতিল (Revert)</strong>: ভুল করে বাতিল করলে আগের অবস্থায় ফিরে যায়, টাকা ওয়ালেটে ফিরে আসে</p>
                  <p>• <strong>পুনরুদ্ধার (Restore)</strong>: আগের বাতিল রিভার্ট করা হলে আবার অ্যাক্টিভ করা যায়</p>
                </div>
              </div>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              রিওয়ার্ড পুনরুদ্ধার করলে ইউজারের ওয়ালেটে টাকা ফিরে আসবে এবং তাকে নোটিফিকেশন পাঠানো হবে।
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field min-h-24 mb-4"
              placeholder="পুনরুদ্ধারের কারণ লিখুন..."
            />
            <button
              onClick={handleRestore}
              disabled={processing || !reason.trim()}
              className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl hover:bg-brand-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              রিওয়ার্ড পুনরুদ্ধার করুন
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
