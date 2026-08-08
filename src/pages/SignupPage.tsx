import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { bnNum } from '@/lib/bn';

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('পাসওয়ার্ড মেলেনি');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (!referralCode.trim()) {
      setError('রেফারেল কোড আবশ্যক');
      return;
    }
    setLoading(true);
    
    // Check for duplicate email
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (existingUser) {
      setError('এই ইমেইল দিয়ে ইতিমধ্যে নিবন্ধন হয়েছে');
      setLoading(false);
      return;
    }
    
    // Check for duplicate username
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    
    if (existingUsername) {
      setError('এই ব্যবহারকারীর নাম ইতিমধ্যে ব্যবহৃত হয়েছে');
      setLoading(false);
      return;
    }
    
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, referral_code: referralCode.trim() } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'এই ইমেইল দিয়ে ইতিমধ্যে নিবন্ধন হয়েছে'
        : signUpError.message);
      return;
    }
    // Email confirmation is off — go straight to login
    navigate('/login');
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-ink-900">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center float-up">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-emerald-light mb-3">নিবন্ধন সফল হয়েছে!</h2>
          <p className="text-ink-200 mb-2">আপনার ইমেইলে একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে।</p>
          <p className="text-ink-300 text-sm mb-6">ইমেইল ভেরিফাই করার পর লগইন করুন।</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-emerald hover:bg-emerald-dark text-white font-semibold py-3 rounded-xl transition"
          >
            লগইন পেজে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-ink-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-72 h-72 bg-emerald rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold rounded-full blur-3xl"></div>
      </div>
      <div className="glass rounded-2xl p-8 max-w-md w-full float-up relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-3xl">🌾</span>
            <h1 className="text-2xl font-bold text-gold">কৃষি বাজার</h1>
          </div>
          <p className="text-ink-300 text-sm">নতুন অ্যাকাউন্ট তৈরি করুন</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-200 mb-1">ইমেইল</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition"
              placeholder="আপনার ইমেইল"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-200 mb-1">ব্যবহারকারীর নাম</label>
            <input
              type="text" required value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition"
              placeholder="আপনার নাম"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-200 mb-1">পাসওয়ার্ড</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition"
              placeholder="কমপক্ষে ৬ অক্ষর"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-200 mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
            <input
              type="password" required value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition"
              placeholder="পাসওয়ার্ড পুনরায় লিখুন"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-200 mb-1">রেফারেল কোড *</label>
            <input
              type="text" required value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full bg-ink-700/50 border border-gold/40 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-gold transition"
              placeholder="যেমন: jibanplus"
            />
            <p className="text-xs text-gold-light mt-1">রেফারেল কোড দিয়ে সাইনআপ করলে {bnNum(500)} টাকা বোনাস পাবেন!</p>
          </div>

          {error && <div className="bg-crimson/20 border border-crimson/40 rounded-lg px-4 py-2 text-crimson-light text-sm">{error}</div>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-emerald to-emerald-dark text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'নিবন্ধন হচ্ছে...' : 'নিবন্ধন করুন'}
          </button>
        </form>

        <div className="flex justify-center mt-6 text-sm">
          <button onClick={() => navigate('/login')} className="text-ink-300 hover:text-emerald-light transition">
            ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন
          </button>
        </div>
      </div>
    </div>
  );
}
