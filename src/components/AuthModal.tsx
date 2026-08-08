import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  mode: 'login' | 'signup' | 'forgot';
  onClose: () => void;
  onSwitch: (mode: 'login' | 'signup' | 'forgot') => void;
};

export function AuthModal({ mode, onClose, onSwitch }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref);
  }, []);

  async function checkUsernameUnique(name: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', name)
      .maybeSingle();
    return !data;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'ভুল ইমেইল বা পাসওয়ার্ড' : error.message);
    } else {
      onClose();
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মেলে না');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (username.length < 3) {
      setError('ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে');
      return;
    }

    setLoading(true);

    const isUnique = await checkUsernameUnique(username);
    if (!isUnique) {
      setError('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: username,
          referral_code: referralCode || undefined,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccess('অ্যাকাউন্ট তৈরি হয়েছে! আপনি এখন লগইন করতে পারেন।');
      setLoading(false);
      setTimeout(() => onSwitch('login'), 1500);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 sm:p-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}>
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {mode === 'login' && 'লগইন করুন'}
            {mode === 'signup' && 'নতুন অ্যাকাউন্ট'}
            {mode === 'forgot' && 'পাসওয়ার্ড ভুলে গেছেন'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login' && 'আপনার অ্যাকাউন্টে প্রবেশ করুন'}
            {mode === 'signup' && 'কৃষি বাজারে যোগ দিন'}
            {mode === 'forgot' && 'আপনার ইমেইল লিখুন'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-500 text-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center gap-2 text-brand-500 text-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ইমেইল</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-10" placeholder="email@example.com" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-10" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              লগইন
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => onSwitch('signup')} className="text-brand-500 hover:underline">নতুন অ্যাকাউন্ট খুলুন</button>
              <button type="button" onClick={() => onSwitch('forgot')} className="text-brand-500 hover:underline">পাসওয়ার্ড ভুলে গেছেন?</button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ইউজারনেম</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="input-field pl-10" placeholder="username" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ইমেইল</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-10" placeholder="email@example.com" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-10" placeholder="••••••••" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pl-10" placeholder="••••••••" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>রেফারেল কোড (ঐচ্ছিক)</label>
              <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="input-field" placeholder="রেফারেল কোড" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              সাইন আপ
            </button>
            <div className="text-center text-sm">
              <button type="button" onClick={() => onSwitch('login')} className="text-brand-500 hover:underline">ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন</button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>ইমেইল</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-10" placeholder="email@example.com" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              রিসেট লিংক পাঠান
            </button>
            <div className="text-center text-sm">
              <button type="button" onClick={() => onSwitch('login')} className="text-brand-500 hover:underline">লগইন পেজে ফিরুন</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
