<<<<<<< HEAD
import { useState } from 'react';
=======
import { useState, useEffect } from 'react';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, TrendingUp, User, LogOut, Wallet, Bell, RefreshCw } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { AuthModal } from './AuthModal';
<<<<<<< HEAD

=======
import { supabase, type Announcement } from '@/lib/supabase';
import { LiveTicker } from './LiveTicker';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { session, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModal, setAuthModal] = useState<null | 'login' | 'signup' | 'forgot'>(null);
<<<<<<< HEAD
  const location = useLocation();

=======
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5);
      setAnnouncements(data || []);
    })();
  }, []);

>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
  const navLinks = [
    { to: '/', label: 'মার্কেট' },
    { to: '/dashboard', label: 'ড্যাশবোর্ড' },
    { to: '/wallet', label: 'ওয়ালেট' },
    { to: '/referral', label: 'রেফারেল' },
    { to: '/support', label: 'সাপোর্ট' },
    { to: '/profile', label: 'প্রোফাইল' },
  ];

<<<<<<< HEAD
=======
  const isAdmin = profile?.role === 'admin';
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-300"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                কৃষি <span className="text-brand-500">বাজার</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      active ? 'text-brand-500 bg-brand-500/10' : 'hover:text-brand-500'
                    }`}
                    style={!active ? { color: 'var(--text-secondary)' } : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-colors hover:bg-brand-500/10"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {session ? (
                <>
                  <Link
                    to="/notifications"
                    className="p-2 rounded-lg transition-colors hover:bg-brand-500/10 relative"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Bell className="w-5 h-5" />
                  </Link>
                  <Link to="/dashboard" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{profile?.username || 'User'}</span>
                  </Link>
                  <button
                    onClick={signOut}
                    className="p-2 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <button onClick={() => setAuthModal('login')} className="btn-outline text-sm">
                    লগইন
                  </button>
                  <button onClick={() => setAuthModal('signup')} className="btn-primary text-sm">
                    সাইন আপ
                  </button>
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="md:hidden py-4 space-y-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500/10"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {link.label}
                </Link>
              ))}
              {!session && (
                <div className="flex gap-2 px-4 pt-2">
                  <button onClick={() => { setAuthModal('login'); setMobileOpen(false); }} className="btn-outline text-sm flex-1">
                    লগইন
                  </button>
                  <button onClick={() => { setAuthModal('signup'); setMobileOpen(false); }} className="btn-primary text-sm flex-1">
                    সাইন আপ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

<<<<<<< HEAD


=======
        {announcements.length > 0 && (
          <div className="border-t overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 py-1.5 px-4">
              <span className="text-xs font-bold text-gold-400 flex-shrink-0 flex items-center gap-1">
                <Bell className="w-3 h-3" /> বিজ্ঞপ্তি:
              </span>
              <div className="overflow-hidden flex-1 ticker-pause">
                <div className="flex whitespace-nowrap animate-ticker text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {[...announcements, ...announcements].map((a, i) => (
                    <span key={`${a.id}-${i}`} className="px-6">{a.title}: {a.message}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
            <LiveTicker />
          </div>
        )}
>>>>>>> b73753d9b5b011ce2b1c2d010955cdf0eb23fa0c
      </header>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
        />
      )}
    </>
  );
}
