/*
# Bengali Market — Complete Schema (matches the cloned repo's frontend)

Tables: profiles, commodities, high_risk_assets, price_history, wallets, transactions,
referrals, notifications, kyc_documents, announcements, banners, support_tickets,
activity_logs, deposits, withdrawals, admin_settings, anti_cheat_flags, holdings.
*/

-- ===== is_admin stub (real def after profiles) =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT false; $$;

-- ===== profiles =====
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  address text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  kyc_status text NOT NULL DEFAULT 'unverified',
  referral_code text UNIQUE NOT NULL,
  referred_by text,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  -- extended fields for the trading/wallet/referral fixes
  balance numeric(14,2) NOT NULL DEFAULT 0,
  bonus_balance numeric(14,2) NOT NULL DEFAULT 0,
  referral_earnings numeric(14,2) NOT NULL DEFAULT 0,
  total_referrals integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  signup_bonus_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- real is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;

-- ===== commodities =====
CREATE TABLE IF NOT EXISTS public.commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  image_url text NOT NULL,
  category text DEFAULT 'general',
  current_price numeric(12,2) NOT NULL DEFAULT 0,
  previous_price numeric(12,2) DEFAULT 0,
  unit text NOT NULL DEFAULT 'কেজি',
  change numeric(12,2) DEFAULT 0,
  change_percent numeric(8,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commodities_select_public" ON public.commodities;
CREATE POLICY "commodities_select_public" ON public.commodities FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "commodities_write_admin" ON public.commodities;
CREATE POLICY "commodities_write_admin" ON public.commodities FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "commodities_update_admin" ON public.commodities;
CREATE POLICY "commodities_update_admin" ON public.commodities FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "commodities_delete_admin" ON public.commodities;
CREATE POLICY "commodities_delete_admin" ON public.commodities FOR DELETE
  TO authenticated USING (public.is_admin());

-- ===== high_risk_assets =====
CREATE TABLE IF NOT EXISTS public.high_risk_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  symbol text,
  image_url text,
  current_price numeric(16,2) NOT NULL DEFAULT 0,
  change numeric(16,2) DEFAULT 0,
  change_percent numeric(8,2) DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'high',
  potential_return text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.high_risk_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hra_select_public" ON public.high_risk_assets;
CREATE POLICY "hra_select_public" ON public.high_risk_assets FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hra_insert_admin" ON public.high_risk_assets;
CREATE POLICY "hra_insert_admin" ON public.high_risk_assets FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "hra_update_admin" ON public.high_risk_assets;
CREATE POLICY "hra_update_admin" ON public.high_risk_assets FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "hra_delete_admin" ON public.high_risk_assets;
CREATE POLICY "hra_delete_admin" ON public.high_risk_assets FOR DELETE
  TO authenticated USING (public.is_admin());

-- ===== price_history =====
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id uuid NOT NULL REFERENCES public.commodities(id) ON DELETE CASCADE,
  price numeric(12,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_commodity ON public.price_history(commodity_id, recorded_at DESC);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_history_select_public" ON public.price_history;
CREATE POLICY "price_history_select_public" ON public.price_history FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "price_history_insert_admin" ON public.price_history;
CREATE POLICY "price_history_insert_admin" ON public.price_history FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "price_history_delete_admin" ON public.price_history;
CREATE POLICY "price_history_delete_admin" ON public.price_history FOR DELETE
  TO authenticated USING (public.is_admin());

-- ===== wallets =====
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(16,2) NOT NULL DEFAULT 0,
  bonus numeric(16,2) NOT NULL DEFAULT 0,
  referral_income numeric(16,2) NOT NULL DEFAULT 0,
  total_deposit numeric(16,2) NOT NULL DEFAULT 0,
  total_withdraw numeric(16,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallets_select_own_or_admin" ON public.wallets;
CREATE POLICY "wallets_select_own_or_admin" ON public.wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "wallets_insert_own" ON public.wallets;
CREATE POLICY "wallets_insert_own" ON public.wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallets_update_own" ON public.wallets;
CREATE POLICY "wallets_update_own" ON public.wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallets_update_admin" ON public.wallets;
CREATE POLICY "wallets_update_admin" ON public.wallets FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== transactions =====
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(16,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  description text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id, created_at DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tx_select_own_or_admin" ON public.transactions;
CREATE POLICY "tx_select_own_or_admin" ON public.transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "tx_insert_own" ON public.transactions;
CREATE POLICY "tx_insert_own" ON public.transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tx_update_admin" ON public.transactions;
CREATE POLICY "tx_update_admin" ON public.transactions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== referrals =====
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  earnings numeric(16,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ref_select_own_or_admin" ON public.referrals;
CREATE POLICY "ref_select_own_or_admin" ON public.referrals FOR SELECT
  TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.is_admin());
DROP POLICY IF EXISTS "ref_insert_own" ON public.referrals;
CREATE POLICY "ref_insert_own" ON public.referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);
DROP POLICY IF EXISTS "ref_update_admin" ON public.referrals;
CREATE POLICY "ref_update_admin" ON public.referrals FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== notifications =====
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select_own_or_admin" ON public.notifications;
CREATE POLICY "notif_select_own_or_admin" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "notif_insert_admin" ON public.notifications;
CREATE POLICY "notif_insert_admin" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (public.is_admin() OR auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_admin" ON public.notifications;
CREATE POLICY "notif_update_admin" ON public.notifications FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== kyc_documents =====
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kyc_select_own_or_admin" ON public.kyc_documents;
CREATE POLICY "kyc_select_own_or_admin" ON public.kyc_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "kyc_insert_own" ON public.kyc_documents;
CREATE POLICY "kyc_insert_own" ON public.kyc_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_update_admin" ON public.kyc_documents;
CREATE POLICY "kyc_update_admin" ON public.kyc_documents FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== announcements =====
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ann_select_public" ON public.announcements;
CREATE POLICY "ann_select_public" ON public.announcements FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ann_insert_admin" ON public.announcements;
CREATE POLICY "ann_insert_admin" ON public.announcements FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "ann_update_admin" ON public.announcements;
CREATE POLICY "ann_update_admin" ON public.announcements FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "ann_delete_admin" ON public.announcements;
CREATE POLICY "ann_delete_admin" ON public.announcements FOR DELETE
  TO authenticated USING (public.is_admin());

-- ===== banners =====
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text NOT NULL,
  link text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banner_select_public" ON public.banners;
CREATE POLICY "banner_select_public" ON public.banners FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "banner_insert_admin" ON public.banners;
CREATE POLICY "banner_insert_admin" ON public.banners FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "banner_update_admin" ON public.banners;
CREATE POLICY "banner_update_admin" ON public.banners FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "banner_delete_admin" ON public.banners;
CREATE POLICY "banner_delete_admin" ON public.banners FOR DELETE
  TO authenticated USING (public.is_admin());

-- ===== support_tickets =====
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "ticket_select_own_or_admin" ON public.support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "ticket_insert_own" ON public.support_tickets;
CREATE POLICY "ticket_insert_own" ON public.support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ticket_update_admin" ON public.support_tickets;
CREATE POLICY "ticket_update_admin" ON public.support_tickets FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== activity_logs =====
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id, created_at DESC);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "log_select_own_or_admin" ON public.activity_logs;
CREATE POLICY "log_select_own_or_admin" ON public.activity_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "log_insert_own" ON public.activity_logs;
CREATE POLICY "log_insert_own" ON public.activity_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== deposits =====
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  utr text NOT NULL,
  upi_id text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deposits_select_own_or_admin" ON public.deposits;
CREATE POLICY "deposits_select_own_or_admin" ON public.deposits FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "deposits_insert_own" ON public.deposits;
CREATE POLICY "deposits_insert_own" ON public.deposits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "deposits_update_admin" ON public.deposits;
CREATE POLICY "deposits_update_admin" ON public.deposits FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== withdrawals =====
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  method text NOT NULL DEFAULT 'upi',
  upi_id text,
  account_holder text,
  account_number text,
  bank_ifsc text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "withdrawals_select_own_or_admin" ON public.withdrawals;
CREATE POLICY "withdrawals_select_own_or_admin" ON public.withdrawals FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawals;
CREATE POLICY "withdrawals_insert_own" ON public.withdrawals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "withdrawals_update_admin" ON public.withdrawals;
CREATE POLICY "withdrawals_update_admin" ON public.withdrawals FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== admin_settings =====
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  signup_bonus numeric(14,2) NOT NULL DEFAULT 500,
  referral_bonus numeric(14,2) NOT NULL DEFAULT 100,
  referrer_reward_pct numeric(8,4) NOT NULL DEFAULT 10,
  milestone_threshold numeric(14,2) NOT NULL DEFAULT 10000,
  milestone_bonus numeric(14,2) NOT NULL DEFAULT 50,
  min_deposit numeric(14,2) NOT NULL DEFAULT 100,
  min_withdraw numeric(14,2) NOT NULL DEFAULT 100,
  maintenance_mode boolean NOT NULL DEFAULT false,
  qr_code_url text,
  upi_id text,
  price_update_interval int NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_settings_read_all" ON public.admin_settings;
CREATE POLICY "admin_settings_read_all" ON public.admin_settings FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_settings_update_admin" ON public.admin_settings;
CREATE POLICY "admin_settings_update_admin" ON public.admin_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.admin_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;

-- ===== holdings =====
CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commodity_id uuid NOT NULL REFERENCES public.commodities(id) ON DELETE CASCADE,
  quantity numeric(14,4) NOT NULL DEFAULT 0,
  avg_buy_price numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, commodity_id)
);
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holdings_select_own" ON public.holdings;
CREATE POLICY "holdings_select_own" ON public.holdings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "holdings_insert_own" ON public.holdings;
CREATE POLICY "holdings_insert_own" ON public.holdings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "holdings_update_own" ON public.holdings;
CREATE POLICY "holdings_update_own" ON public.holdings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "holdings_delete_own" ON public.holdings;
CREATE POLICY "holdings_delete_own" ON public.holdings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== anti_cheat_flags =====
CREATE TABLE IF NOT EXISTS public.anti_cheat_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  details text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  resolved boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.anti_cheat_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flags_select_own_or_admin" ON public.anti_cheat_flags;
CREATE POLICY "flags_select_own_or_admin" ON public.anti_cheat_flags FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "flags_update_admin" ON public.anti_cheat_flags;
CREATE POLICY "flags_update_admin" ON public.anti_cheat_flags FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== Realtime =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'commodities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commodities;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'high_risk_assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.high_risk_assets;
  END IF;
END $$;

-- ===== Storage buckets =====
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;

-- storage policies
DROP POLICY IF EXISTS "banner_read_public" ON storage.objects;
CREATE POLICY "banner_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "banner_write_auth" ON storage.objects;
CREATE POLICY "banner_write_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'banners');
DROP POLICY IF EXISTS "banner_update_auth" ON storage.objects;
CREATE POLICY "banner_update_auth" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'banners') WITH CHECK (bucket_id = 'banners');
DROP POLICY IF EXISTS "banner_delete_auth" ON storage.objects;
CREATE POLICY "banner_delete_auth" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "avatar_read_public" ON storage.objects;
CREATE POLICY "avatar_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatar_write_auth" ON storage.objects;
CREATE POLICY "avatar_write_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatar_update_auth" ON storage.objects;
CREATE POLICY "avatar_update_auth" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

-- kyc storage policies
DROP POLICY IF EXISTS "kyc_read_own_or_admin" ON storage.objects;
CREATE POLICY "kyc_read_own_or_admin" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'kyc');
DROP POLICY IF EXISTS "kyc_write_auth" ON storage.objects;
CREATE POLICY "kyc_write_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'kyc');
DROP POLICY IF EXISTS "kyc_update_own" ON storage.objects;
CREATE POLICY "kyc_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'kyc') WITH CHECK (bucket_id = 'kyc');
DROP POLICY IF EXISTS "kyc_delete_own" ON storage.objects;
CREATE POLICY "kyc_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'kyc');

-- ===== Seed commodities =====
INSERT INTO public.commodities (name, name_en, image_url, category, current_price, unit, sort_order) VALUES
('ধান', 'Paddy', 'https://images.pexels.com/photos/32630924/pexels-photo-32630924.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'grain', 28.50, 'বস্তা', 1),
('পাট', 'Jute', 'https://images.pexels.com/photos/21958122/pexels-photo-21958122.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'fiber', 72.00, 'বস্তা', 2),
('সরিষা', 'Mustard', 'https://images.pexels.com/photos/18346906/pexels-photo-18346906.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'seed', 115.00, 'বস্তা', 3),
('পেঁয়াজ', 'Onion', 'https://images.pexels.com/photos/10899600/pexels-photo-10899600.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'vegetable', 45.00, 'বস্তা', 4),
('আলু', 'Potato', 'https://images.pexels.com/photos/37540986/pexels-photo-37540986.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'vegetable', 22.00, 'বস্তা', 5),
('গম', 'Wheat', 'https://images.pexels.com/photos/38129076/pexels-photo-38129076.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'grain', 38.00, 'বস্তা', 6),
('চাল', 'Rice', 'https://images.pexels.com/photos/31555431/pexels-photo-31555431.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'grain', 58.00, 'বস্তা', 7),
('ডাল', 'Lentils', 'https://images.pexels.com/photos/34940646/pexels-photo-34940646.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'pulse', 120.00, 'বস্তা', 8),
('ভুট্টা', 'Corn', 'https://images.pexels.com/photos/37903946/pexels-photo-37903946.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'grain', 25.00, 'বস্তা', 9),
('আদা', 'Ginger', 'https://images.pexels.com/photos/20234970/pexels-photo-20234970.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'spice', 85.00, 'বস্তা', 10),
('রসুন', 'Garlic', 'https://images.pexels.com/photos/38571499/pexels-photo-38571499.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'spice', 140.00, 'বস্তা', 11)
ON CONFLICT DO NOTHING;

-- ===== Seed high-risk assets =====
INSERT INTO public.high_risk_assets (name, symbol, image_url, current_price, risk_level, potential_return, sort_order) VALUES
('Gold Futures', 'XAU', 'https://images.pexels.com/photos/12198523/pexels-photo-12198523.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 2034.50, 'high', '2x - 5x', 1),
('Silver Futures', 'XAG', 'https://images.pexels.com/photos/12198528/pexels-photo-12198528.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 24.85, 'high', '3x - 8x', 2),
('Crude Oil', 'OIL', 'https://images.pexels.com/photos/12198525/pexels-photo-12198525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 78.40, 'extreme', '5x - 12x', 3),
('Crypto Index', 'CRY', 'https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 42150.00, 'extreme', '10x - 50x', 4),
('Forex USD/INR', 'FX', 'https://images.pexels.com/photos/16594725/pexels-photo-16594725.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 83.50, 'medium', '1.5x - 3x', 5),
('Commodity Index', 'CMI', 'https://images.pexels.com/photos/32630924/pexels-photo-32630924.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 452.30, 'high', '2x - 6x', 6)
ON CONFLICT DO NOTHING;