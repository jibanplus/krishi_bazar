import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Loader2, Save, Upload, TrendingUp, Activity, Grid, List, Search, Settings, DollarSign, Wallet, Package, AlertCircle } from 'lucide-react';
import { supabase, type Commodity, type HighRiskAsset } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { useToast } from '@/lib/toast';

export function AdminMarketSettings() {
  const { show: showToast } = useToast();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [highRiskAssets, setHighRiskAssets] = useState<HighRiskAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'commodity' | 'crypto' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'commodities' | 'crypto'>('commodities');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', name_en: '', image_url: '', category: 'general', current_price: '', unit: '100kg',
    symbol: '', min_price: '', max_price: '', volatility_percentage: '',
    movement_percentage: '', daily_high: '', daily_low: '', risk_level: 'LOW'
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const [commsRes, hraRes] = await Promise.all([
        supabase.from('commodities').select('*').order('sort_order'),
        supabase.from('high_risk_assets').select('*').order('sort_order'),
      ]);
      setCommodities(commsRes.data || []);
      setHighRiskAssets(hraRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!form.image_url) {
      showToast('error', 'পণ্যের ছবি আপলোড করুন', '⚠️');
      return;
    }
    setSaving(true);

    if (editing === 'commodity') {
      const existingId = commodities.find(c => c.name === form.name && c.name_en === form.name_en)?.id;
      if (existingId) {
        await supabase.from('commodities').update({
          name: form.name,
          name_en: form.name_en,
          image_url: form.image_url,
          category: form.category,
          current_price: parseFloat(form.current_price),
          unit: form.unit,
          min_price: form.min_price ? parseFloat(form.min_price) : null,
          max_price: form.max_price ? parseFloat(form.max_price) : null,
          movement_percentage: form.movement_percentage ? parseFloat(form.movement_percentage) : null,
          daily_high: form.daily_high ? parseFloat(form.daily_high) : null,
          daily_low: form.daily_low ? parseFloat(form.daily_low) : null,
        }).eq('id', existingId);
      } else {
        await supabase.from('commodities').insert({
          name: form.name,
          name_en: form.name_en,
          image_url: form.image_url,
          category: form.category,
          current_price: parseFloat(form.current_price),
          unit: form.unit,
          min_price: form.min_price ? parseFloat(form.min_price) : null,
          max_price: form.max_price ? parseFloat(form.max_price) : null,
          movement_percentage: form.movement_percentage ? parseFloat(form.movement_percentage) : null,
          daily_high: form.daily_high ? parseFloat(form.daily_high) : null,
          daily_low: form.daily_low ? parseFloat(form.daily_low) : null,
          sort_order: commodities.length + 1,
        });
      }
    } else if (editing === 'crypto') {
      const existingId = highRiskAssets.find(a => a.name === form.name)?.id;
      if (existingId) {
        await supabase.from('high_risk_assets').update({
          name: form.name,
          symbol: form.symbol,
          image_url: form.image_url,
          min_price: parseFloat(form.min_price),
          max_price: parseFloat(form.max_price),
          volatility_percentage: parseFloat(form.volatility_percentage),
          current_price: parseFloat(form.current_price),
          movement_percentage: form.movement_percentage ? parseFloat(form.movement_percentage) : null,
          risk_level: form.risk_level,
        }).eq('id', existingId);
      } else {
        await supabase.from('high_risk_assets').insert({
          name: form.name,
          symbol: form.symbol,
          image_url: form.image_url,
          min_price: parseFloat(form.min_price),
          max_price: parseFloat(form.max_price),
          volatility_percentage: parseFloat(form.volatility_percentage),
          current_price: parseFloat(form.current_price),
          movement_percentage: form.movement_percentage ? parseFloat(form.movement_percentage) : null,
          risk_level: form.risk_level,
          sort_order: highRiskAssets.length + 1,
        });
      }
    }

    const [commsRes, hraRes] = await Promise.all([
      supabase.from('commodities').select('*').order('sort_order'),
      supabase.from('high_risk_assets').select('*').order('sort_order'),
    ]);
    setCommodities(commsRes.data || []);
    setHighRiskAssets(hraRes.data || []);
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    showToast('success', 'সেটিংস সংরক্ষিত হয়েছে', '✅');
  }

  function startEdit(type: 'commodity' | 'crypto', item: Commodity | HighRiskAsset) {
    setEditing(type);
    if (type === 'commodity') {
      setForm({
        name: (item as Commodity).name,
        name_en: (item as Commodity).name_en || '',
        image_url: (item as Commodity).image_url,
        category: (item as Commodity).category,
        current_price: String((item as Commodity).current_price),
        unit: (item as Commodity).unit,
        symbol: '',
        min_price: String((item as Commodity as any).min_price || ''),
        max_price: String((item as Commodity as any).max_price || ''),
        volatility_percentage: String((item as Commodity as any).volatility_percentage || ''),
        movement_percentage: String((item as Commodity as any).movement_percentage || ''),
        daily_high: String((item as Commodity).daily_high || ''),
        daily_low: String((item as Commodity).daily_low || ''),
        risk_level: 'LOW',
      });
    } else {
      setForm({
        name: (item as HighRiskAsset).name,
        name_en: '',
        image_url: (item as HighRiskAsset).image_url,
        category: 'crypto',
        current_price: String((item as HighRiskAsset).current_price),
        unit: 'unit',
        symbol: (item as HighRiskAsset).symbol || '',
        min_price: String((item as HighRiskAsset).min_price),
        max_price: String((item as HighRiskAsset).max_price),
        volatility_percentage: String((item as HighRiskAsset as any).volatility_percentage || 20),
        movement_percentage: String((item as HighRiskAsset as any).movement_percentage || ''),
        daily_high: '',
        daily_low: '',
        risk_level: (item as HighRiskAsset as any).risk_level || 'LOW',
      });
    }
    setShowForm(true);
  }

  async function handleDelete(type: 'commodity' | 'crypto', id: string) {
    if (!confirm('মুছে ফেলতে চান?')) return;
    if (type === 'commodity') {
      await supabase.from('commodities').delete().eq('id', id);
      setCommodities((prev) => prev.filter((c) => c.id !== id));
    } else {
      await supabase.from('high_risk_assets').delete().eq('id', id);
      setHighRiskAssets((prev) => prev.filter((a) => a.id !== id));
    }
    showToast('success', 'মুছে ফেলা হয়েছে', '✅');
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>মার্কেট সেটিংস</h1>
          <button onClick={() => { setEditing(null); setShowForm(true); setForm({ name: '', name_en: '', image_url: '', category: 'general', current_price: '', unit: '100kg', symbol: '', min_price: '', max_price: '', volatility_percentage: '', movement_percentage: '', daily_high: '', daily_low: '', risk_level: 'LOW' }); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> নতুন
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('commodities')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'commodities' ? 'bg-brand-500 text-white' : 'hover:bg-brand-500/10'
            }`}
            style={activeTab !== 'commodities' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            কমোডিটি
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'crypto' ? 'bg-purple-500 text-white' : 'hover:bg-purple-500/10'
            }`}
            style={activeTab !== 'crypto' ? { color: 'var(--text-secondary)' } : undefined}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            ক্রিপ্টো ইনডেক্স
          </button>
        </div>

        {/* Search and View Mode */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-brand-500 text-white' : 'hover:bg-brand-500/10'}`}
              style={viewMode !== 'table' ? { color: 'var(--text-secondary)' } : undefined}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition ${viewMode === 'cards' ? 'bg-brand-500 text-white' : 'hover:bg-brand-500/10'}`}
              style={viewMode !== 'cards' ? { color: 'var(--text-secondary)' } : undefined}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'সম্পাদিত করুন' : 'নতুন যোগ করুন'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="নাম (বাংলা)"
              />
              <input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="Name (English)"
              />
              <input
                value={form.current_price}
                onChange={(e) => setForm({ ...form, current_price: e.target.value })}
                className="input-field text-sm py-2"
                placeholder="বর্তমান মূল্য"
              />
            </div>

            {/* Category/Unit for Commodities */}
            {activeTab === 'commodities' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-field text-sm py-2"
                >
                  <option value="general">সাধারণ</option>
                  <option value="grains">শস্য</option>
                  <option value="vegetables">শাকসবজি</option>
                  <option value="fruits">ফল</option>
                </select>
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="input-field text-sm py-2"
                  placeholder="একক"
                />
              </div>
            )}

            {/* Symbol for Crypto */}
            {activeTab === 'crypto' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  className="input-field text-sm py-2"
                  placeholder="সিম্বল"
                />
                <select
                  value={form.risk_level}
                  onChange={(e) => setForm({ ...form, risk_level: e.target.value })}
                  className="input-field text-sm py-2"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="EXTREME">EXTREME</option>
                </select>
              </div>
            )}

            {/* Price Range Settings */}
            <div className="card p-3 bg-brand-500/5 border border-brand-500/20">
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <DollarSign className="w-3 h-3 text-brand-500" /> প্রাইস রেঞ্জ
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>মিনিমাম</p>
                  <input
                    value={form.min_price}
                    onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                    className="input-field text-sm py-2"
                    placeholder="₹"
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>সর্বোচ্চ</p>
                  <input
                    value={form.max_price}
                    onChange={(e) => setForm({ ...form, max_price: e.target.value })}
                    className="input-field text-sm py-2"
                    placeholder="₹"
                  />
                </div>
              </div>
            </div>

            {/* Movement Settings */}
            <div className="card p-3 bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Activity className="w-3 h-3 text-emerald-500" /> মুভমেন্ট সেটিংস
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>মুভমেন্ট %</p>
                  <input
                    value={form.movement_percentage}
                    onChange={(e) => setForm({ ...form, movement_percentage: e.target.value })}
                    className="input-field text-sm py-2"
                    placeholder="প্রতি আপডেট %"
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>ভোলাটিলিটি %</p>
                  <input
                    value={form.volatility_percentage}
                    onChange={(e) => setForm({ ...form, volatility_percentage: e.target.value })}
                    className="input-field text-sm py-2"
                    placeholder="fluctuation %"
                  />
                </div>
              </div>
            </div>

            {/* Daily Stats for Commodities */}
            {activeTab === 'commodities' && (
              <div className="card p-3 bg-purple-500/5 border border-purple-500/20">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp className="w-3 h-3 text-purple-500" /> দৈনিক স্ট্যাটস
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>সর্বোচ্চ</p>
                    <input
                      value={form.daily_high}
                      onChange={(e) => setForm({ ...form, daily_high: e.target.value })}
                      className="input-field text-sm py-2"
                      placeholder="₹"
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>সর্বনিম্ন</p>
                    <input
                      value={form.daily_low}
                      onChange={(e) => setForm({ ...form, daily_low: e.target.value })}
                      className="input-field text-sm py-2"
                      placeholder="₹"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => document.getElementById('image-upload')?.click()} className="btn-outline flex items-center gap-2 px-4 py-2 text-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                ছবি আপলোড
              </button>
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--border-color)' }} />
              )}
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-3">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'সেভ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        )}

        {/* Commodities - Card View */}
        {activeTab === 'commodities' && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commodities
              .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.name_en?.toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
              <div key={c.id} className="card p-4 space-y-3 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  {c.image_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{c.name_en || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>মূল্য</p>
                    <p className="text-lg font-bold text-brand-500">₹{Number(c.current_price).toFixed(0)}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-500/10 text-brand-500">{c.category}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => startEdit('commodity', c)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 text-sm">
                    <Edit3 className="w-3.5 h-3.5" /> সম্পাদনা
                  </button>
                  <button onClick={() => handleDelete('commodity', c.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm">
                    <Trash2 className="w-3.5 h-3.5" /> মুছুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Commodities - Table View */}
        {activeTab === 'commodities' && viewMode === 'table' && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-secondary)' }}>
                  <th className="text-left py-3 px-4">নাম</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-right py-3 px-4">মূল্য</th>
                  <th className="text-center py-3 px-4">ক্যাটাগরি</th>
                  <th className="text-center py-3 px-4">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {commodities
                  .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.name_en?.toLowerCase().includes(search.toLowerCase()))
                  .map((c) => (
                  <tr key={c.id} className="border-t hover:bg-brand-500/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{c.name_en || '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(c.current_price).toFixed(0)}</td>
                    <td className="py-3 px-4 text-center" style={{ color: 'var(--text-secondary)' }}>{c.category}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => startEdit('commodity', c)} className="p-2 rounded-lg hover:bg-brand-500/10 mr-2" style={{ color: 'var(--text-secondary)' }}>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete('commodity', c.id)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-secondary)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Crypto Index - Card View */}
        {activeTab === 'crypto' && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highRiskAssets
              .filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.symbol?.toLowerCase().includes(search.toLowerCase()))
              .map((a) => {
              const isUp = a.change >= 0;
              const riskLevel = a.risk_level || 'LOW';
              return (
              <div key={a.id} className="card p-4 space-y-3 hover:shadow-lg transition-all border-purple-500/20">
                <div className="flex items-center gap-3">
                  {a.image_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate text-purple-400">{a.name}</h3>
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{a.symbol || '-'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    riskLevel === 'EXTREME' ? 'bg-red-500/20 text-red-400' :
                    riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>মূল্য</p>
                    <p className="text-lg font-bold text-purple-400">₹{Number(a.current_price).toFixed(2)}</p>
                  </div>
                  <div className={`flex items-center gap-1 ${isUp ? 'text-brand-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-semibold">{isUp ? '+' : ''}{Number(a.change_percent).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-purple-500/5 text-center">
                    <p style={{ color: 'var(--text-secondary)' }}>মিন: ₹{Number(a.min_price).toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/5 text-center">
                    <p style={{ color: 'var(--text-secondary)' }}>ম্যাক্স: ₹{Number(a.max_price).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => startEdit('crypto', a)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-sm">
                    <Edit3 className="w-3.5 h-3.5" /> সম্পাদনা
                  </button>
                  <button onClick={() => handleDelete('crypto', a.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm">
                    <Trash2 className="w-3.5 h-3.5" /> মুছুন
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* Crypto Index - Table View */}
        {activeTab === 'crypto' && viewMode === 'table' && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-secondary)' }}>
                  <th className="text-left py-3 px-4">নাম</th>
                  <th className="text-left py-3 px-4">সিম্বল</th>
                  <th className="text-right py-3 px-4">মূল্য</th>
                  <th className="text-right py-3 px-4">মিন মূল্য</th>
                  <th className="text-right py-3 px-4">সর্বোচ্চ মূল্য</th>
                  <th className="text-right py-3 px-4">ভোলাটিলিটি %</th>
                  <th className="text-center py-3 px-4">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {highRiskAssets
                  .filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.symbol?.toLowerCase().includes(search.toLowerCase()))
                  .map((a) => {
                  const isUp = a.change >= 0;
                  return (
                  <tr key={a.id} className="border-t hover:bg-purple-500/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-3 px-4 font-semibold text-purple-400">{a.name}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{a.symbol || '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(a.current_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>₹{Number(a.min_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>₹{Number(a.max_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>{(a as any).volatility_percentage || 20}%</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => startEdit('crypto', a)} className="p-2 rounded-lg hover:bg-brand-500/10 mr-2" style={{ color: 'var(--text-secondary)' }}>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete('crypto', a.id)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-secondary)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

        {/* Index Features Info Box */}
        {activeTab === 'crypto' && (
          <div className="card p-4 space-y-3">
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>ক্রিপ্টো ইনডেক্স ফিচার তথ্য</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                <p className="font-semibold text-purple-400 mb-1">ঝুঁকি স্তর (Risk Level)</p>
                <p style={{ color: 'var(--text-secondary)' }}>LOW, MEDIUM, HIGH, EXTREME - অটোমেটিক ক্যালকুলেট হয় ভোলাটিলিটি থেকে</p>
              </div>
              <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
                <p className="font-semibold text-brand-400 mb-1">প্রাইস রেঞ্জ</p>
                <p style={{ color: 'var(--text-secondary)' }}>মিনিমাম থেকে সর্বোচ্চ মূল্যের মধ্যে র্যান্ডম মুভমেন্ট</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="font-semibold text-emerald-400 mb-1">ভোলাটিলিটি %</p>
                <p style={{ color: 'var(--text-secondary)' }}>20-100% পর্যন্ত সেট করা যায়, যত বেশি তত দ্রুত মুভমেন্ট</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="font-semibold text-amber-400 mb-1">লাইভ অ্যানিমেশন</p>
                <p style={{ color: 'var(--text-secondary)' }}>EXTREME রিস্কে অ্যানিমেটেড ভোলাটিলিটি দেখা যায়</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}