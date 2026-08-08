import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Loader2, Save, Tag, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

type CouponCode = {
  id: string;
  code: string;
  bonus_percentage: number;
  max_bonus_amount: number;
  min_deposit_amount: number;
  usage_limit: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

export function AdminCouponSettings() {
  const { show: showToast } = useToast();
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CouponCode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    bonus_percentage: '',
    max_bonus_amount: '',
    min_deposit_amount: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('coupon_codes').select('*').order('created_at', { ascending: false });
      setCoupons(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!form.code.trim()) {
      showToast('error', 'কুপন কোড দিন', '⚠️');
      return;
    }
    setSaving(true);

    if (editing) {
      await supabase.from('coupon_codes').update({
        code: form.code.trim(),
        bonus_percentage: parseFloat(form.bonus_percentage),
        max_bonus_amount: parseFloat(form.max_bonus_amount),
        min_deposit_amount: parseFloat(form.min_deposit_amount),
        usage_limit: parseInt(form.usage_limit),
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
        is_active: form.is_active,
      }).eq('id', editing.id);
    } else {
      await supabase.from('coupon_codes').insert({
        code: form.code.trim(),
        bonus_percentage: parseFloat(form.bonus_percentage),
        max_bonus_amount: parseFloat(form.max_bonus_amount),
        min_deposit_amount: parseFloat(form.min_deposit_amount),
        usage_limit: parseInt(form.usage_limit),
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
        is_active: form.is_active,
      });
    }

    const { data } = await supabase.from('coupon_codes').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({
      code: '',
      bonus_percentage: '',
      max_bonus_amount: '',
      min_deposit_amount: '',
      usage_limit: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
    });
    showToast('success', 'কুপন সংরক্ষিত হয়েছে', '✅');
  }

  function startEdit(c: CouponCode) {
    setEditing(c);
    setForm({
      code: c.code,
      bonus_percentage: String(c.bonus_percentage),
      max_bonus_amount: String(c.max_bonus_amount),
      min_deposit_amount: String(c.min_deposit_amount),
      usage_limit: String(c.usage_limit),
      valid_from: c.valid_from,
      valid_until: c.valid_until || '',
      is_active: c.is_active,
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('মুছে ফেলতে চান?')) return;
    await supabase.from('coupon_codes').delete().eq('id', id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    showToast('success', 'মুছে ফেলা হয়েছে', '✅');
  }

  async function toggleActive(c: CouponCode) {
    await supabase.from('coupon_codes').update({ is_active: !c.is_active }).eq('id', c.id);
    setCoupons((prev) => prev.map((cp) => cp.id === c.id ? { ...cp, is_active: !cp.is_active } : cp));
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>কুপন কোড সেটিংস</h1>
          <button onClick={() => { setEditing(null); setShowForm(true); setForm({ code: '', bonus_percentage: '', max_bonus_amount: '', min_deposit_amount: '', usage_limit: '', valid_from: '', valid_until: '', is_active: true }); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> নতুন কুপন
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'কুপন সম্পাদনা' : 'নতুন কুপন'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="input-field text-sm py-2"
                placeholder="কুপন কোড (যেমন: WELCOME50)"
              />
              <input
                value={form.bonus_percentage}
                onChange={(e) => setForm({ ...form, bonus_percentage: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="বোনাস শতাংশ (যেমন: 50)"
              />
              <input
                value={form.max_bonus_amount}
                onChange={(e) => setForm({ ...form, max_bonus_amount: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="সর্বোচ্চ বোনাস (যেমন: 500)"
              />
              <input
                value={form.min_deposit_amount}
                onChange={(e) => setForm({ ...form, min_deposit_amount: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="ন্যূনতম ডিপোজিট (যেমন: 100)"
              />
              <input
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="ব্যবহার সীমা (যেমন: 100)"
              />
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="input-field text-sm py-2"
              />
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="input-field text-sm py-2"
              />
              <div className="flex items-center gap-2 col-span-1 sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>সক্রিয়</label>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'সেভ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        )}

        {/* Coupons Table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th className="text-left py-2 px-3">কুপন কোড</th>
                <th className="text-right py-2 px-3">বোনাস %</th>
                <th className="text-right py-2 px-3">সর্বোচ্চ</th>
                <th className="text-right py-2 px-3">ন্যূনতম</th>
                <th className="text-center py-2 px-3">ব্যবহার</th>
                <th className="text-center py-2 px-3">স্ট্যাটাস</th>
                <th className="text-center py-2 px-3">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="py-2 px-3 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{c.code}</td>
                  <td className="py-2 px-3 text-right" style={{ color: 'var(--text-primary)' }}>{c.bonus_percentage}%</td>
                  <td className="py-2 px-3 text-right" style={{ color: 'var(--text-secondary)' }}>₹{Number(c.max_bonus_amount).toFixed(0)}</td>
                  <td className="py-2 px-3 text-right" style={{ color: 'var(--text-secondary)' }}>₹{Number(c.min_deposit_amount).toFixed(0)}</td>
                  <td className="py-2 px-3 text-center" style={{ color: 'var(--text-secondary)' }}>{c.used_count}/{c.usage_limit}</td>
                  <td className="py-2 px-3 text-center">
                    {c.is_active ? (
                      <CheckCircle className="w-4 h-4 inline text-brand-500" />
                    ) : (
                      <XCircle className="w-4 h-4 inline text-red-500" />
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => toggleActive(c)} className="p-1 rounded hover:bg-brand-500/10 mr-1" style={{ color: 'var(--text-secondary)' }}>
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => startEdit(c)} className="p-1 rounded hover:bg-brand-500/10 mr-1" style={{ color: 'var(--text-secondary)' }}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-secondary)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}