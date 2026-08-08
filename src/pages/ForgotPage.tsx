import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-ink-900">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center float-up">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-emerald-light mb-3">রিসেট লিংক পাঠানো হয়েছে</h2>
          <p className="text-ink-300 mb-6">আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইমেইল চেক করুন।</p>
          <button onClick={() => navigate('login')} className="w-full bg-emerald hover:bg-emerald-dark text-white font-semibold py-3 rounded-xl transition">
            লগইন পেজে ফিরুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-ink-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gold rounded-full blur-3xl"></div>
      </div>
      <div className="glass rounded-2xl p-8 max-w-md w-full float-up relative z-10">
        <div className="text-center mb-6">
          <span className="text-3xl">🔑</span>
          <h1 className="text-2xl font-bold text-gold mt-2">পাসওয়ার্ড রিসেট</h1>
          <p className="text-ink-300 text-sm mt-1">আপনার ইমেইল দিন</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-ink-700/50 border border-ink-600 rounded-xl px-4 py-3 text-ink-100 focus:outline-none focus:border-gold transition"
            placeholder="আপনার ইমেইল"
          />
          {error && <div className="bg-crimson/20 border border-crimson/40 rounded-lg px-4 py-2 text-crimson-light text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold-dark text-ink-900 font-semibold py-3 rounded-xl transition disabled:opacity-50">
            {loading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
          </button>
        </form>
        <button onClick={() => navigate('login')} className="w-full mt-4 text-ink-400 hover:text-ink-200 text-sm transition">
          লগইন পেজে ফিরুন
        </button>
      </div>
    </div>
  );
}
