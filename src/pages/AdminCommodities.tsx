import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Edit3, X, Loader2, Save, Upload } from 'lucide-react';
import { supabase, type Commodity } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';

export function AdminCommodities() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Commodity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', name_en: '', image_url: '', category: 'general', current_price: '', unit: 'কেজি' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(path, file, { upsert: true });
    if (error) {
      setUploadError('ছবি আপলোড ব্যর্থ: ' + error.message);
    } else {
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('commodities').select('*').order('sort_order');
      setCommodities(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url) { setUploadError('পণ্যের ছবি আপলোড করুন'); return; }
    setSaving(true);
    if (editing) {
      await supabase.from('commodities').update({
        name: form.name,
        name_en: form.name_en,
        image_url: form.image_url,
        category: form.category,
        current_price: parseFloat(form.current_price),
        unit: form.unit,
      }).eq('id', editing.id);
    } else {
      await supabase.from('commodities').insert({
        name: form.name,
        name_en: form.name_en,
        image_url: form.image_url,
        category: form.category,
        current_price: parseFloat(form.current_price),
        unit: form.unit,
        sort_order: commodities.length + 1,
      });
    }
    const { data } = await supabase.from('commodities').select('*').order('sort_order');
    setCommodities(data || []);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', name_en: '', image_url: '', category: 'general', current_price: '', unit: 'কেজি' });
  }

  function startEdit(c: Commodity) {
    setEditing(c);
    setForm({ name: c.name, name_en: c.name_en || '', image_url: c.image_url, category: c.category, current_price: String(c.current_price), unit: c.unit });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('মুছে ফেলতে চান?')) return;
    await supabase.from('commodities').delete().eq('id', id);
    setCommodities((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>কমোডিটি ব্যবস্থাপনা</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', name_en: '', image_url: '', category: 'general', current_price: '', unit: 'কেজি' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> নতুন
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {commodities.map((c) => (
            <div key={c.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img src={c.image_url} alt={c.name} className="w-14 h-14 rounded-lg object-cover" />
                  <div>
                    <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                    {c.name_en && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.name_en}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(c.current_price).toFixed(2)}/{c.unit}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-brand-500/10 text-brand-500 capitalize">{c.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editing ? 'সম্পাদনা' : 'নতুন কমোডিটি'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="নাম (বাংলা)" />
              <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="input-field" placeholder="Name (English)" />
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>পণ্যের ছবি</p>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline w-full flex items-center justify-center gap-2 py-3" style={{ borderColor: 'var(--border-color)' }}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {form.image_url ? 'ছবি বদলান' : 'ছবি আপলোড করুন'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                {form.image_url && <img src={form.image_url} alt="" className="w-full h-40 rounded-lg object-cover" />}
              </div>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                <option value="grain">grain</option>
                <option value="vegetable">vegetable</option>
                <option value="seed">seed</option>
                <option value="spice">spice</option>
                <option value="fiber">fiber</option>
                <option value="pulse">pulse</option>
                <option value="general">general</option>
              </select>
              <input required type="number" step="0.01" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} className="input-field" placeholder="মূল্য" />
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field" placeholder="একক" />
              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} সংরক্ষণ
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
