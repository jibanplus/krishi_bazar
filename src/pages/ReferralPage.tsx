import { useEffect, useState } from 'react';
import { Users, Copy, Check, Share2, Award, TrendingUp, QrCode, Wallet, Clock, Gift, ArrowUpRight, Layers } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, type Referral, type Profile } from '@/lib/supabase';
import { StatsCardSkeleton } from '@/components/Skeletons';

export function ReferralPage() {
  const { session, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referredProfiles, setReferredProfiles] = useState<Record<string, Profile>>({});
  const [adminSettings, setAdminSettings] = useState<{ referral_note: string; referral_bonus: number; referred_bonus: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const [refsRes, settingsRes] = await Promise.all([
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', session!.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('admin_settings')
          .select('referral_note, referral_bonus, referred_bonus')
          .limit(1)
          .maybeSingle()
      ]);
      
      setReferrals(refsRes.data || []);
      setAdminSettings(settingsRes.data as { referral_note: string } | null);

      if (refsRes.data && refsRes.data.length > 0) {
        const ids = refsRes.data.map((r) => r.referred_id);
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
        const map: Record<string, Profile> = {};
        (profiles || []).forEach((p) => { map[p.id] = p as Profile; });
        setReferredProfiles(map);
      }

      setLoading(false);
    }
    load();
  }, [session]);

  function copyLink() {
    const link = `${window.location.origin}/?ref=${profile?.referral_code || ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/?ref=${profile?.referral_code || ''}`;
  const totalEarnings = referrals.reduce((sum, r) => sum + Number(r.earnings), 0);
  const activeReferrals = referrals.filter((r) => r.status === 'active' || r.status === 'rewarded').length;
  const level1Count = referrals.length;
  const level2Count = referrals.filter((r) => r.status === 'active' || r.status === 'rewarded').length;
  const pendingEarnings = referrals.filter((r) => r.status === 'pending').reduce((sum, r) => sum + Number(r.earnings), 0);
  const paidEarnings = referrals.filter((r) => r.status === 'rewarded').reduce((sum, r) => sum + Number(r.earnings), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>রেফারেল সিস্টেম</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>বন্ধুদের আমন্ত্রণ জানান এবং আয় করুন</p>
      </div>

      {/* Admin Note */}
      {adminSettings?.referral_note && (
        <div className="card p-4 bg-gradient-to-r from-gold-400/10 to-transparent border border-gold-400/20">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-gold-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gold-400 mb-1">বিশেষ অফার!</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{adminSettings.referral_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Bonus Details */}
      {adminSettings && (
        <div className="card p-5 space-y-4 bg-gradient-to-r from-purple-500/10 to-brand-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>রেফারেল বোনাস বিবরণ</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">আপনার বোনাস (Referrer)</span>
              </div>
              <p className="text-2xl font-bold text-brand-500">₹{Number(adminSettings.referral_bonus || 0).toFixed(0)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>প্রতি সফল রেফারেল</p>
            </div>
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-semibold text-brand-500">বন্ধুর বোনাস (Referred)</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">₹{Number(adminSettings.referred_bonus || 0).toFixed(0)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>সাইনআপ বোনাস</p>
            </div>
          </div>
          <div className="text-xs p-3 rounded-lg bg-gray-500/10 border border-gray-500/20" style={{ color: 'var(--text-secondary)' }}>
            <p>বোনাস শর্ত: রেফারেল সফল হলে বোনাস ক্রেডিট হবে। লেভেল ১ এবং লেভেল ২ রেফারেল সিস্টেম চালু আছে।</p>
          </div>
        </div>
      )}

      {/* 2-Level Referral System Details */}
      <div className="card p-5 space-y-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>2-Level রেফারেল সিস্টেম</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">Level 1 (সরাসরি)</span>
            </div>
            <p className="text-2xl font-bold text-brand-500">2%</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>সরাসরি রেফারেল কমিশন</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>বন্ধুর উইথড্র এর 2%</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">Level 2 (পরোক্ষ)</span>
            </div>
            <p className="text-2xl font-bold text-pink-500">1%</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>পরোক্ষ রেফারেল কমিশন</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>লেভেল ১ বন্ধুর উইথড্র এর 1%</p>
          </div>
        </div>
        <div className="text-xs p-3 rounded-lg bg-gray-500/10 border border-gray-500/20" style={{ color: 'var(--text-secondary)' }}>
          <p>উদাহরণ: আপনি বন্ধু X কে রেফার করলেন → X যখন উইথড্র করবে, আপনি উইথড্র এর 2% পাবেন। X যখন Y কে রেফার করবে, Y যখন উইথড্র করবে, আপনি সেই উইথড্র এর 1% পাবেন।</p>
        </div>
      </div>

      {/* Premium Referral Dashboard */}
      <div className="card p-6 space-y-6 bg-gradient-to-br from-brand-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>আপনার রেফারেল কোড</p>
            <p className="text-3xl font-bold tracking-wider text-brand-500 mt-1">{profile?.referral_code || '--------'}</p>
          </div>
          <button 
            onClick={() => setShowQR(!showQR)}
            className="p-3 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition"
            title="QR Code"
          >
            <QrCode className="w-6 h-6" />
          </button>
        </div>

        {showQR && (
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <div className="text-center">
              <QrCode className="w-48 h-48 mx-auto text-brand-500" />
              <p className="text-sm mt-2 text-gray-600">Scan to Join</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={copyLink} className="btn-primary flex items-center justify-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'কপি হয়েছে' : 'লিংক কপি করুন'}
          </button>
          <div className="p-3 rounded-lg flex items-center gap-2 flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <Share2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{referralLink}</p>
          </div>
        </div>
      </div>

      {/* Premium Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card p-4 bg-gradient-to-br from-blue-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>মোট রেফারেল</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{referrals.length}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-brand-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-brand-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>সক্রিয়</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeReferrals}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-gold-400/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-gold-400" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>মোট আয়</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{totalEarnings.toFixed(0)}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-purple-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>পেন্ডিং</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{pendingEarnings.toFixed(0)}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>পেইড</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{paidEarnings.toFixed(0)}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-pink-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-pink-500" />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Level 1</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{level1Count}</p>
        </div>
      </div>

      {/* Referral Tree / History */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>রেফারেল ইতিহাস</h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>এখনো কোনো রেফারেল নেই। আপনার কোড শেয়ার করুন!</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => {
              const p = referredProfiles[r.referred_id];
              return (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p?.username || 'Unknown'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-500">₹{Number(r.earnings).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-brand-500/10 text-brand-500' : 'bg-gray-500/10 text-gray-500'}`}>{r.status}</span>
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
