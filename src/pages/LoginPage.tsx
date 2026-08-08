import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'ভুল ইমেইল বা পাসওয়ার্ড'
        : signInError.message);
      return;
    }
    // Check for trade intent in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tradeMode = urlParams.get('trade');
    const productId = urlParams.get('product');
    const kind = urlParams.get('kind');

    if (tradeMode && productId) {
      // Redirect to market page with trade intent
      const params = new URLSearchParams();
      params.set('trade', tradeMode);
      params.set('product', productId);
      if (kind) params.set('kind', kind);
      navigate(`/?${params.toString()}`, { replace: true });
    } else {
      // Normal redirect
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  };

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
          <p className="text-ink-300 text-sm">আপনার অ্যাকাউন্টে লগইন করুন</p>
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
            <label className="block text-sm text-ink-200 mb-1">পাসওয়ার্ড</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-emerald transition"
              placeholder="আপনার পাসওয়ার্ড"
            />
          </div>

          {error && <div className="bg-crimson/20 border border-crimson/40 rounded-lg px-4 py-2 text-crimson-light text-sm">{error}</div>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-emerald to-emerald-dark text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
          </button>
        </form>

        <div className="flex justify-center mt-6 text-sm">
          <button onClick={() => navigate('/signup')} className="text-ink-300 hover:text-emerald-light transition">
            নতুন? নিবন্ধন করুন
          </button>
        </div>
      </div>
    </div>
  );
}
