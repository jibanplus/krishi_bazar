import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { FullPageLoader } from '@/components/Skeletons';
import { PopupHost } from '@/components/PopupHost';
import MarketPage from '@/pages/MarketPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WalletPage } from '@/pages/WalletPage';
import { ReferralPage } from '@/pages/ReferralPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SupportPage } from '@/pages/SupportPage';
import { SupportChatPage } from '@/pages/SupportChatPage';
import { SupportReportPage } from '@/pages/SupportReportPage';
import { SupportFaqPage } from '@/pages/SupportFaqPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import { AdminLogin } from '@/pages/AdminLogin';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminTransactions } from '@/pages/AdminTransactions';
import { AdminCommodities } from '@/pages/AdminCommodities';
import { AdminUsers } from '@/pages/AdminUsers';
import { AdminBanners, AdminAnnouncements, AdminKyc, AdminSettings } from '@/pages/AdminPages';
import { AdminSupportTickets } from '@/pages/AdminSupportTickets';
import { AdminAntiCheat } from '@/pages/AdminAntiCheat';
import { AdminReferralSettings } from '@/pages/AdminReferralSettings';
import { AdminMarketSettings } from '@/pages/AdminMarketSettings';
import { AdminCouponSettings } from '@/pages/AdminCouponSettings';
import { AdminPriceMovementLog } from '@/pages/AdminPriceMovementLog';
import { AdminTradingTerminalSettings } from '@/pages/AdminTradingTerminalSettings';
import DepositPage from '@/pages/DepositPage';
import WithdrawPage from '@/pages/WithdrawPage';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Wrench } from 'lucide-react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  
  // FIX: loading true থাকলেও session থাকলে wait করবেন না
  if (loading && !session) return <FullPageLoader />;
  
  // Session নেই → login page
  if (!session) return <Navigate to="/admin/login" replace />;
  
  // Session আছে কিন্তু profile null → informative message
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <FullPageLoader />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            প্রোফাইল লোড হচ্ছে...
          </p>
        </div>
      </div>
    );
  }
  
  // Admin না → login page
  if (profile.role !== 'admin') return <Navigate to="/admin/login" replace />;
  
  return <>{children}</>;
}

function MaintenanceMode() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="card w-full max-w-md p-8 text-center animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-10 h-10 text-amber-500" />
        </div>
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>মেইনটেনেন্স মোড</h1>
        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
          সিস্টেম বর্তমানে মেইনটেনেন্সে আছে
        </p>
        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-6">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            দয়া করে কিছুক্ষণ পরে আবার চেষ্টা করুন। আমরা দ্রুত সেবা পুনরায় চালু করার চেষ্টা করছি।
          </p>
        </div>
        <div className="text-sm space-y-2" style={{ color: 'var(--text-tertiary)' }}>
          <p>• অ্যাডমিন লগইন সক্রিয় আছে</p>
          <p>• সাধারণ ব্যবহারকারী লগইন বন্ধ</p>
          <p>• মার্কেট সার্ভিস সাময়িকভাবে বন্ধ</p>
        </div>
      </div>
    </div>
  );
}

function MainLayout({ children }: { children: ReactNode }) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    async function checkMaintenance() {
      const { data } = await supabase.from('admin_settings').select('maintenance_mode').limit(1).maybeSingle();
      if (data) setMaintenanceMode(data.maintenance_mode || false);
    }
    checkMaintenance();
  }, []);

  if (maintenanceMode && profile?.role !== 'admin') {
    return <MaintenanceMode />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      {children}
      <footer className="border-t mt-12 py-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          কৃষি বাজার © 2026 • রিয়েল-টাইম কৃষিজাত পণ্যের মার্কেটপ্লেস
        </div>
      </footer>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* User Routes */}
      <Route path="/" element={<MainLayout><MarketPage /></MainLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><MainLayout><DashboardPage /></MainLayout></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><MainLayout><WalletPage /></MainLayout></ProtectedRoute>} />
      <Route path="/referral" element={<ProtectedRoute><MainLayout><ReferralPage /></MainLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><MainLayout><NotificationsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/deposit" element={<ProtectedRoute><MainLayout><DepositPage /></MainLayout></ProtectedRoute>} />
      <Route path="/withdraw" element={<ProtectedRoute><MainLayout><WithdrawPage /></MainLayout></ProtectedRoute>} />

      {/* Support Routes - আলাদা আলাদা পেজ */}
      <Route path="/support" element={<ProtectedRoute><MainLayout><SupportPage /></MainLayout></ProtectedRoute>} />
      <Route path="/support/chat" element={<ProtectedRoute><MainLayout><SupportChatPage /></MainLayout></ProtectedRoute>} />
      <Route path="/support/report" element={<ProtectedRoute><MainLayout><SupportReportPage /></MainLayout></ProtectedRoute>} />
      <Route path="/support/faq" element={<MainLayout><SupportFaqPage /></MainLayout>} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/deposits" element={<AdminRoute><AdminTransactions type="deposit" /></AdminRoute>} />
      <Route path="/admin/withdraws" element={<AdminRoute><AdminTransactions type="withdraw" /></AdminRoute>} />
      <Route path="/admin/commodities" element={<AdminRoute><AdminCommodities /></AdminRoute>} />
      <Route path="/admin/banners" element={<AdminRoute><AdminBanners /></AdminRoute>} />
      <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
      <Route path="/admin/kyc" element={<AdminRoute><AdminKyc /></AdminRoute>} />
      <Route path="/admin/tickets" element={<AdminRoute><AdminSupportTickets /></AdminRoute>} />
      <Route path="/admin/anti-cheat" element={<AdminRoute><AdminAntiCheat /></AdminRoute>} />
      <Route path="/admin/referral-settings" element={<AdminRoute><AdminReferralSettings /></AdminRoute>} />
      <Route path="/admin/market-settings" element={<AdminRoute><AdminMarketSettings /></AdminRoute>} />
      <Route path="/admin/price-movement-log" element={<AdminRoute><AdminPriceMovementLog /></AdminRoute>} />
      <Route path="/admin/trading-terminal-settings" element={<AdminRoute><AdminTradingTerminalSettings /></AdminRoute>} />
      <Route path="/admin/coupon-settings" element={<AdminRoute><AdminCouponSettings /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <PopupHost />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}