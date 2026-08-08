import { useEffect, useState } from 'react';
import { Loader2, Save, Gift, MessageSquare, Check, Users, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

export function AdminReferralSettings() {
  const { show: showToast } = useToast();
  const [settings, setSettings] = useState({
    referral_note: '',
    referral_bonus: 500,
    referred_bonus: 200,
    milestone_threshold: 5,
    milestone_bonus: 1000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setSettings({
          referral_note: data.referral_note || '',
          referral_bonus: Number(data.referral_bonus) || 500,
          referred_bonus: Number(data.referred_bonus) || 200,
          milestone_threshold: Number(data.milestone_threshold) || 5,
          milestone_bonus: Number(data.milestone_bonus) || 1000,
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('admin_settings')
      .update({
        referral_note: settings.referral_note,
        referral_bonus: settings.referral_bonus,
        referred_bonus: settings.referred_bonus,
        milestone_threshold: settings.milestone_threshold,
        milestone_bonus: settings.milestone_bonus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    
    setSaving(false);
    if (error) {
      showToast('error', 'সেটিংস সেভ করতে ব্যর্থ', '⚠️');
    } else {
      showToast('success', 'সেটিংস সংরক্ষিত হয়েছে', '✅');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        <Gift className="w-6 h-6 inline mr-2" />
        রেফারেল সেটিংস
      </h1>

      <div className="space-y-6">
        {/* Referral Note */}
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MessageSquare className="w-4 h-4 text-brand-500" /> রেফারেল নোট
          </h3>
          <textarea
            value={settings.referral_note}
            onChange={(e) => setSettings({ ...settings, referral_note: e.target.value })}
            className="input-field text-sm py-2 min-h-[100px]"
            placeholder="ইউজারদের জন্য রেফারেল সম্পর্কে নোট লিখুন..."
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            এই নোট সব ইউজারদের রেফারেল পেজে দেখানো হবে
          </p>
        </div>

        {/* Bonus Settings - Row Layout */}
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Award className="w-4 h-4 text-brand-500" /> বোনাস সেটিংস
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-brand-500/5 border border-brand-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-brand-500" />
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>রেফারেল বোনাস</p>
              </div>
              <input
                type="number"
                value={settings.referral_bonus}
                onChange={(e) => setSettings({ ...settings, referral_bonus: parseFloat(e.target.value) || 0 })}
                className="input-field text-sm py-2"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                রেফারার পাবে (₹)
              </p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>রেফার্ড বোনাস</p>
              </div>
              <input
                type="number"
                value={settings.referred_bonus}
                onChange={(e) => setSettings({ ...settings, referred_bonus: parseFloat(e.target.value) || 0 })}
                className="input-field text-sm py-2"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                নতুন ইউজার পাবে (₹)
              </p>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>মাইলস্টোন বোনাস</p>
              </div>
              <input
                type="number"
                value={settings.milestone_bonus}
                onChange={(e) => setSettings({ ...settings, milestone_bonus: parseFloat(e.target.value) || 0 })}
                className="input-field text-sm py-2"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                মাইলস্টোন অর্জনে (₹)
              </p>
            </div>
          </div>
        </div>

        {/* Milestone Settings */}
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-4 h-4 text-brand-500" /> মাইলস্টোন সেটিংস
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>মাইলস্টোন থ্রেশহোল্ড</p>
              <input
                type="number"
                value={settings.milestone_threshold}
                onChange={(e) => setSettings({ ...settings, milestone_threshold: parseInt(e.target.value) || 0 })}
                className="input-field text-sm py-2"
                placeholder="প্রতি কত রেফারেলে"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                কতগুলি রেফারেলের পর মাইলস্টোন বোনাস পাবে
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-3">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'সংরক্ষিত!' : 'সংরক্ষণ করুন'}
        </button>
      </div>
    </AdminLayout>
  );
}
