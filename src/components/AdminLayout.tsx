import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, TrendingUp, Settings, Bell, Image, FileText, Shield, Ticket, LogOut, Menu, X, ShieldAlert, Activity, Gift, DollarSign, Tag, Sun, Moon, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/admin', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { to: '/admin/users', label: 'ইউজার', icon: Users },
    { to: '/admin/deposits', label: 'ডিপোজিট', icon: Wallet },
    { to: '/admin/withdraws', label: 'উইথড্র', icon: TrendingUp },
    { to: '/admin/commodities', label: 'কমোডিটি', icon: TrendingUp },
    { to: '/admin/market-settings', label: 'মার্কেট সেটিংস', icon: DollarSign },
    { to: '/admin/price-movement-log', label: 'প্রাইস লগ', icon: Activity },
    { to: '/admin/trading-terminal-settings', label: 'Terminal Coin Range', icon: SlidersHorizontal },
    { to: '/admin/referral-settings', label: 'রেফারেল', icon: Gift },
    { to: '/admin/coupon-settings', label: 'কুপন', icon: Tag },
    { to: '/admin/banners', label: 'ব্যানার', icon: Image },
    { to: '/admin/announcements', label: 'বিজ্ঞপ্তি', icon: Bell },
    { to: '/admin/kyc', label: 'KYC', icon: Shield },
    { to: '/admin/tickets', label: 'সাপোর্ট', icon: Ticket },
    { to: '/admin/anti-cheat', label: 'অ্যান্টি-চিট', icon: ShieldAlert },
    { to: '/admin/settings', label: 'সেটিংস', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>অ্যাডমিন প্যানেল</span>
          </Link>
        </div>
        <nav className="p-3 space-y-1">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link key={l.to} to={l.to} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-brand-500 text-white' : ''}`} style={!active ? { color: 'var(--text-secondary)' } : undefined}>
                <l.icon className="w-4 h-4" /> {l.label}
              </Link>
            );
          })}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-brand-500/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
          </button>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" /> লগআউট
          </button>
        </nav>
        <div className="p-4 mt-auto border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>লগইন: {profile?.username || 'Admin'}</p>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>অ্যাডমিন</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
