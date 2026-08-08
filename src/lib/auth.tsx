import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './supabase';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, wallets(balance)')
    .eq('id', uid)
    .maybeSingle();
  
  if (error) {
    console.error('Profile load error:', error);
    const { data: profileOnly } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile(profileOnly as Profile | null);
  } else {
    setProfile(data as Profile | null);
  }
}

  async function creditSignupBonus(uid: string) {
    try {
      const { data, error } = await supabase.rpc('credit_signup_bonus', { p_user_id: uid });
      if (!error && data?.success && data?.amount > 0) {
        await loadProfile(uid);
      }
    } catch {
      /* ignore */
    }
  }

useEffect(() => {
  // Safety timeout - 5 সেকেন্ড পরেও loading true থাকলে force false করুন
  const safetyTimeout = setTimeout(() => {
    console.warn('Auth loading timeout - forcing loading=false');
    setLoading(false);
  }, 5000);

  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    if (data.session) {
      loadProfile(data.session.user.id)
        .finally(() => {
          clearTimeout(safetyTimeout);
          setLoading(false);
        });
    } else {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }).catch((err) => {
    console.error('Auth getSession error:', err);
    clearTimeout(safetyTimeout);
    setLoading(false);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
    (async () => {
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
        if (event === 'SIGNED_IN') {
          await supabase.rpc('log_activity', { p_action: 'লগইন / Login' });
          await creditSignupBonus(newSession.user.id);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    })();
  });

  return () => {
    clearTimeout(safetyTimeout);
    listener.subscription.unsubscribe();
  };
}, []);

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  async function signOut() {
    await supabase.rpc('log_activity', { p_action: 'লগআউট / Logout' });
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}