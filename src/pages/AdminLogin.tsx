import { useEffect, useState } from 'react';
import { Loader2, Shield, Lock, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function AdminLogin() {
  const navigate = useNavigate();
  const { session, profile, loading, refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    async function checkMaintenance() {
      const { data } = await supabase.from('admin_settings').select('maintenance_mode').limit(1).maybeSingle();
      if (data) setMaintenanceMode(data.maintenance_mode || false);
    }
    checkMaintenance();
  }, []);

  // Check if already logged in as admin
  useEffect(() => {
    // FIX: loading হলে অপেক্ষা করুন
    if (loading) return;
    
    if (session && profile && profile.role === 'admin') {
      console.log('Already logged in as admin, redirecting to /admin');
      window.location.href = '/admin';
    } else if (session && profile && profile.role !== 'admin') {
      console.log('Not admin, showing error');
      setError('আপনার অ্যাডমিন অনুমতি নেই - শুধুমাত্র অ্যাডমিনরা লগইন করতে পারবেন। Current role: ' + profile.role);
    }
  }, [session, profile, loading, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      console.log('Starting login with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('Auth response:', { data, error });
      
      if (error) {
        console.error('Auth error:', error);
        setError('ভুল ইমেইল বা পাসওয়ার্ড - সঠিক তথ্য দিয়ে আবার চেষ্টা করুন');
        setSubmitting(false);
        return;
      }
      if (data.user) {
        console.log('User logged in:', data.user.id);
        setChecking(true);
        
        const { data: prof, error: profError } = await supabase.from('profiles').select('role, username').eq('id', data.user.id).maybeSingle();
        console.log('Profile response:', { prof, profError });
        setChecking(false);
        
        if (profError) {
          console.error('Profile error:', profError);
          setError('প্রোফাইল লোড সমস্যা - আবার চেষ্টা করুন');
          await supabase.auth.signOut();
          setSubmitting(false);
        } else if (!prof) {
          console.error('Profile not found');
          setError('প্রোফাইল পাওয়া যায়নি - আপনার অ্যাকাউন্ট সেটআপ সম্পন্ন করুন');
          await supabase.auth.signOut();
          setSubmitting(false);
        } else if (prof.role !== 'admin') {
          console.error('Not admin, role:', prof.role);
          setError('আপনার অ্যাডমিন অনুমতি নেই - শুধুমাত্র অ্যাডমিনরা লগইন করতে পারবেন। Current role: ' + prof.role);
          await supabase.auth.signOut();
          setSubmitting(false);
        } else {
          console.log('Admin login successful, navigating to /admin');
          setSubmitting(false);
          
          // FIX: refreshProfile করে profile load হওয়া পর্যন্ত অপেক্ষা করুন
          await refreshProfile();
          
          // FIX: সরাসরি navigate করুন (window.location.href নয়) যাতে React Router কাজ করে
          navigate('/admin', { replace: true });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('লগইন সমস্যা হয়েছে - আবার চেষ্টা করুন');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="card w-full max-w-md p-8 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>অ্যাডমিন লগইন</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>অ্যাডমিন প্যানেলে প্রবেশ করুন</p>
        </div>

        {maintenanceMode && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-500 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>মেইনটেনেন্স মোড চালু আছে - অ্যাডমিন লগইন সক্রিয়</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>অ্যাডমিন ইমেইল</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="admin@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-10" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={submitting || checking} className="btn-primary w-full flex items-center justify-center gap-2">
            {(submitting || checking) && <Loader2 className="w-4 h-4 animate-spin" />} 
            {checking ? 'অ্যাডমিন যাচাই করা হচ্ছে...' : 'লগইন'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center text-xs" style={{ borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {maintenanceMode 
              ? 'মেইনটেনেন্স মোডে শুধুমাত্র অ্যাডমিন লগইন সম্ভব'
              : 'স্বাভাবিক মোড - সব ব্যবহারকারী লগইন করতে পারবেন'}
          </p>
        </div>
      </div>
    </div>
  );
}