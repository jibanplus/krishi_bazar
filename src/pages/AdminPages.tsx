import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Loader2, X, Image as ImageIcon, Upload, Save, Power, CheckCircle, Gift, Wallet, Check } from 'lucide-react';
import { supabase, type Banner, type Announcement, type KycDocument, type SupportTicket, type AdminSettings as AdminSettingsType } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

export function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', image_url: '', link: '' });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('banners').select('*').order('sort_order');
      setBanners(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const path = `banners/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    }
    setSaving(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url) return;
    setSaving(true);
    await supabase.from('banners').insert({ title: form.title, image_url: form.image_url, link: form.link, sort_order: banners.length + 1 });
    const { data } = await supabase.from('banners').select('*').order('sort_order');
    setBanners(data || []);
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', image_url: '', link: '' });
  }

  async function handleDelete(id: string) {
    await supabase.from('banners').delete().eq('id', id);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }

  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id);
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: !x.is_active } : x)));
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ব্যানার ব্যবস্থাপনা</h1>
        <button onClick={() => { setShowForm(true); setForm({ title: '', image_url: '', link: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> নতুন
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : banners.length === 0 ? (
        <div className="card p-12 text-center"><p style={{ color: 'var(--text-secondary)' }}>কোনো ব্যানার নেই</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="card p-4 space-y-3">
              <img src={b.image_url} alt={b.title || 'Banner'} className="w-full h-32 rounded-lg object-cover" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{b.title || '—'}</h3>
                  {b.link && <a href={b.link} className="text-xs text-brand-500 hover:underline">{b.link}</a>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(b)} className={`text-xs px-2 py-1 rounded-full ${b.is_active ? 'bg-brand-500/10 text-brand-500' : 'bg-gray-500/10 text-gray-500'}`}>{b.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</button>
                  <button onClick={() => handleDelete(b.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative card w-full max-w-md p-6 animate-slide-up">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><X className="w-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>নতুন ব্যানার</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="শিরোনাম" />
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline w-full flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} ছবি আপলোড
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                {form.image_url && <img src={form.image_url} alt="" className="mt-2 w-full h-24 rounded-lg object-cover" />}
              </div>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="input-field" placeholder="লিংক (ঐচ্ছিক)" />
              <button type="submit" disabled={saving || !form.image_url} className="btn-primary w-full">{saving ? 'সংরক্ষণ...' : 'সংরক্ষণ'}</button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('announcements').insert({ title: form.title, message: form.message, is_active: true });
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', message: '' });
  }

  async function toggleActive(a: Announcement) {
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: !x.is_active } : x)));
  }

  async function handleDelete(id: string) {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>বিজ্ঞপ্তি ব্যবস্থাপনা</h1>
        <button onClick={() => { setShowForm(true); setForm({ title: '', message: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> নতুন
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : announcements.length === 0 ? (
        <div className="card p-12 text-center"><p style={{ color: 'var(--text-secondary)' }}>কোনো বিজ্ঞপ্তি নেই</p></div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="card p-4 flex items-start justify-between">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{a.message}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(a)} className={`text-xs px-2 py-1 rounded-full ${a.is_active ? 'bg-brand-500/10 text-brand-500' : 'bg-gray-500/10 text-gray-500'}`}>{a.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</button>
                <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative card w-full max-w-md p-6 animate-slide-up">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>নতুন বিজ্ঞপ্তি</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="শিরোনাম" />
              <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input-field min-h-24" placeholder="বিস্তারিত" />
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'সংরক্ষণ...' : 'সংরক্ষণ'}</button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminKyc() {
  const [docs, setDocs] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('kyc_documents').select('*').order('submitted_at', { ascending: false });
      setDocs(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAction(d: KycDocument, status: string) {
    setProcessing(d.id);
    await supabase.from('kyc_documents').update({ status, reviewed_at: new Date().toISOString() }).eq('id', d.id);
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, status } : x)));
    setProcessing(null);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>KYC যাচাইকরণ</h1>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : docs.length === 0 ? (
        <div className="card p-12 text-center"><p style={{ color: 'var(--text-secondary)' }}>কোনো KYC অনুরোধ নেই</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <div key={d.id} className="card p-4 space-y-3">
              <img src={d.doc_url} alt="KYC doc" className="w-full h-40 rounded-lg object-cover" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{d.doc_type.replace('_', ' ')}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${d.status === 'approved' ? 'bg-brand-500/10 text-brand-500' : d.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{d.status}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(d.submitted_at).toLocaleDateString()}</p>
              {d.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(d, 'approved')} disabled={processing === d.id} className="btn-primary text-sm flex-1">অনুমোদন</button>
                  <button onClick={() => handleAction(d, 'rejected')} disabled={processing === d.id} className="btn-outline text-sm flex-1" style={{ borderColor: 'var(--border-color)' }}>বাতিল</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      setTickets(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function updateStatus(t: SupportTicket, status: string) {
    await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', t.id);
    setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>সাপোর্ট টিকেট</h1>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : tickets.length === 0 ? (
        <div className="card p-12 text-center"><p style={{ color: 'var(--text-secondary)' }}>কোনো টিকেট নেই</p></div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{t.subject}</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <select value={t.status} onChange={(e) => updateStatus(t, e.target.value)} className="input-field text-xs py-1 px-2 w-auto">
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminSettings() {
  const { show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    signup_bonus: 500,
    min_deposit: 100,
    min_withdraw: 100,
    maintenance_mode: false,
    qr_code_url: '',
    upi_id: '',
    price_update_interval: 5,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('admin_settings').select('*').limit(1).maybeSingle();
      if (data) {
        const d = data as AdminSettingsType;
        setForm({
          signup_bonus: d.signup_bonus,
          min_deposit: d.min_deposit,
          min_withdraw: d.min_withdraw,
          maintenance_mode: d.maintenance_mode,
          qr_code_url: d.qr_code_url || '',
          upi_id: d.upi_id || '',
          price_update_interval: d.price_update_interval,
        });
      }
      setLoading(false);
    })();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `banners/qr_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path);
      setForm((f) => ({ ...f, qr_code_url: urlData.publicUrl }));
    } else {
      showToast('error', 'QR আপলোড ব্যর্থ', '⚠️');
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('admin_settings').update({
      signup_bonus: form.signup_bonus,
      min_deposit: form.min_deposit,
      min_withdraw: form.min_withdraw,
      maintenance_mode: form.maintenance_mode,
      qr_code_url: form.qr_code_url,
      upi_id: form.upi_id,
      price_update_interval: form.price_update_interval,
      updated_at: new Date().toISOString(),
    }).eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      showToast('error', 'সংরক্ষণ ব্যর্থ', '⚠️');
    } else {
      showToast('success', 'সেটিংস সংরক্ষিত হয়েছে', '✅');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function toggleMaintenance() {
    const newMode = !form.maintenance_mode;
    setForm((f) => ({ ...f, maintenance_mode: newMode }));
    await supabase.from('admin_settings').update({ maintenance_mode: newMode, updated_at: new Date().toISOString() }).eq('id', '00000000-0000-0000-0000-000000000001');
    showToast('info', newMode ? 'মেইনটেনেন্স মোড চালু' : 'মেইনটেনেন্স মোড বন্ধ', newMode ? '🔧' : '✅');
  }

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>সেটিংস</h1>

      <div className="space-y-6">
        {/* Maintenance Mode */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Power className="w-4 h-4 text-gold-400" /> মেইনটেনেন্স মোড
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>চালু করলে ইউজাররা প্রবেশ করতে পারবে না</p>
            </div>
            <button onClick={toggleMaintenance} className={`relative w-12 h-6 rounded-full transition-colors ${form.maintenance_mode ? 'bg-red-500' : 'bg-brand-500'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.maintenance_mode ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* General Settings - Compact */}
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Settings className="w-4 h-4 text-brand-500" /> সাধারণ সেটিংস
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>সাইন আপ বোনাস</p>
              <input type="number" value={form.signup_bonus} onChange={(e) => setForm({ ...form, signup_bonus: parseFloat(e.target.value) || 0 })} className="input-field text-sm py-2" />
            </div>
          </div>
        </div>

        {/* Transaction Settings - Compact */}
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wallet className="w-4 h-4 text-brand-500" /> লেনদেন সেটিংস
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>ন্যূনতম ডিপোজিট</p>
              <input type="number" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: parseFloat(e.target.value) || 0 })} className="input-field text-sm py-2" />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>ন্যূনতম উইথড্র</p>
              <input type="number" value={form.min_withdraw} onChange={(e) => setForm({ ...form, min_withdraw: parseFloat(e.target.value) || 0 })} className="input-field text-sm py-2" />
            </div>
          </div>
        </div>

        {/* Payment Settings - Compact */}
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Upload className="w-4 h-4 text-brand-500" /> পেমেন্ট সেটিংস
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>UPI আইডি</p>
              <input type="text" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} className="input-field text-sm py-2" placeholder="bengalimarket@upi" />
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>ডিপোজিট QR কোড</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline flex items-center justify-center gap-2 px-3 py-2 text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} আপলোড
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                {form.qr_code_url && (
                  <img src={form.qr_code_url} alt="QR Code" className="w-16 h-16 rounded-lg object-contain border" style={{ borderColor: 'var(--border-color)' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-3">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'সংরক্ষিত!' : 'সংরক্ষণ করুন'}
        </button>
      </div>
    </AdminLayout>
  );
}
