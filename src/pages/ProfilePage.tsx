import { useEffect, useState, useRef } from 'react';
import { User, Mail, Phone, MapPin, Camera, Shield, KeyRound, FileCheck, Activity, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, type ActivityLog, type KycDocument } from '@/lib/supabase';

export function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [kycDocs, setKycDocs] = useState<KycDocument[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'security' | 'activity'>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const [{ data: kyc }, { data: activity }] = await Promise.all([
        supabase.from('kyc_documents').select('*').eq('user_id', session!.user.id).order('submitted_at', { ascending: false }),
        supabase.from('activity_logs').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      setKycDocs(kyc || []);
      setLogs(activity || []);
    }
    load();
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: fullName,
      phone,
      address,
      avatar_url: avatarUrl,
    }).eq('id', session!.user.id);
    await refreshProfile();
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadError(null);
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      setUploadError('ছবি আপলোড ব্যর্থ: ' + upErr.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', session.user.id);
    await refreshProfile();
    setUploading(false);
  }

  async function handleKycUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadError(null);
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('kyc').upload(path, file);
    if (upErr) {
      setUploadError('KYC ডকুমেন্ট আপলোড ব্যর্থ: ' + upErr.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('kyc').getPublicUrl(path);
    const { error: insertErr } = await supabase.from('kyc_documents').insert({
      user_id: session.user.id,
      doc_type: 'national_id',
      doc_url: urlData.publicUrl,
      status: 'pending',
    });
    if (insertErr) {
      setUploadError('ডকুমেন্ট রেকর্ড সংরক্ষণ ব্যর্থ: ' + insertErr.message);
      setUploading(false);
      return;
    }
    const { data: kyc } = await supabase.from('kyc_documents').select('*').eq('user_id', session.user.id).order('submitted_at', { ascending: false });
    setKycDocs(kyc || []);
    setUploading(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);
    if (newPassword.length < 6) { setPasswordError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPasswordError(error.message); return; }
    setPasswordMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে');
    setNewPassword('');
  }

  const tabs = [
    { id: 'profile' as const, label: 'প্রোফাইল', icon: User },
    { id: 'kyc' as const, label: 'KYC', icon: FileCheck },
    { id: 'security' as const, label: 'নিরাপত্তা', icon: Shield },
    { id: 'activity' as const, label: 'অ্যাক্টিভিটি', icon: Activity },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>আমার প্রোফাইল</h1>

      {/* Avatar */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4" style={{ borderColor: 'var(--border-color)' }} />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-500/10 flex items-center justify-center">
              <User className="w-12 h-12 text-brand-500" />
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors">
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile?.username}</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile?.email}</p>
          <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${profile?.kyc_status === 'verified' ? 'bg-brand-500/10 text-brand-500' : 'bg-gold-400/10 text-gold-400'}`}>
            KYC: {profile?.kyc_status}
          </span>
        </div>
        {uploading && <Loader2 className="w-5 h-5 animate-spin text-brand-500" />}
      </div>

      {uploadError && (
        <div className="card p-4 bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-500">{uploadError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-brand-500 text-white' : ''}`} style={activeTab !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>পুরো নাম</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ইমেইল</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input value={profile?.email || ''} disabled className="input-field pl-10 opacity-60" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ফোন</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field pl-10" placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ঠিকানা</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-field pl-10" placeholder="ঠিকানা" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {savedMsg ? 'সংরক্ষিত হয়েছে!' : 'সংরক্ষণ করুন'}
          </button>
        </form>
      )}

      {activeTab === 'kyc' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>KYC যাচাইকরণ</h3>
            <button onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => handleKycUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
              input.click();
            }} className="btn-primary text-sm" disabled={uploading}>
              {uploading ? 'আপলোড হচ্ছে...' : 'ডকুমেন্ট আপলোড'}
            </button>
          </div>
          {kycDocs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>কোনো KYC ডকুমেন্ট জমা দেওয়া হয়নি</p>
          ) : (
            <div className="space-y-2">
              {kycDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-brand-500" />
                    <div>
                      <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{d.doc_type.replace('_', ' ')}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(d.submitted_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${d.status === 'approved' ? 'bg-brand-500/10 text-brand-500' : d.status === 'pending' ? 'bg-gold-400/10 text-gold-400' : 'bg-red-500/10 text-red-500'}`}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>পাসওয়ার্ড পরিবর্তন</h3>
          {passwordMsg && <p className="text-sm text-brand-500">{passwordMsg}</p>}
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>নতুন পাসওয়ার্ড</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pl-10" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" className="btn-primary">পাসওয়ার্ড আপডেট করুন</button>
          </form>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>অ্যাক্টিভিটি লগ</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>কোনো অ্যাক্টিভিটি নেই</p>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-brand-500" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{l.action}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(l.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
