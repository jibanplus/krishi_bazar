-- ==========================================
-- ALL MIGRATIONS COMBINED
-- Copy and paste this entire file in Supabase SQL Editor
-- ==========================================

-- Step 1: Price Movement Settings (0024)
-- ==========================================
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS min_price numeric(14,2);
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS max_price numeric(14,2);
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS movement_percentage numeric(5,2);
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS volatility_percentage numeric(5,2);
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS daily_high numeric(14,2);
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS daily_low numeric(14,2);

-- Only add crypto_assets columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crypto_assets') THEN
    ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS min_price numeric(14,2);
    ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS max_price numeric(14,2);
    ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS movement_percentage numeric(5,2);
    ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS volatility_percentage numeric(5,2);
    ALTER TABLE public.crypto_assets ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'LOW';
  END IF;
END $$;

-- Step 2: Price Movement Log Table (0025)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.price_movement_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type text NOT NULL,
  asset_id uuid NOT NULL,
  asset_name text NOT NULL,
  old_price numeric(14,2) NOT NULL,
  new_price numeric(14,2) NOT NULL,
  price_change numeric(14,2) NOT NULL,
  change_percentage numeric(5,2) NOT NULL,
  movement_percentage numeric(5,2),
  volatility_percentage numeric(5,2),
  logged_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_movement_log_asset_id ON public.price_movement_log(asset_id);
CREATE INDEX IF NOT EXISTS idx_price_movement_log_logged_at ON public.price_movement_log(logged_at DESC);

-- Step 3: Log Price Movement Function (0026)
-- ==========================================
CREATE OR REPLACE FUNCTION public.log_price_movement(
  p_asset_type text,
  p_asset_id uuid,
  p_asset_name text,
  p_old_price numeric(14,2),
  p_new_price numeric(14,2),
  p_movement_percentage numeric(5,2),
  p_volatility_percentage numeric(5,2)
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.price_movement_log (
    asset_type, asset_id, asset_name, old_price, new_price,
    price_change, change_percentage, movement_percentage, volatility_percentage
  )
  VALUES (
    p_asset_type, p_asset_id, p_asset_name, p_old_price, p_new_price,
    p_new_price - p_old_price,
    CASE WHEN p_old_price > 0 THEN ((p_new_price - p_old_price) / p_old_price * 100) ELSE 0 END,
    p_movement_percentage,
    p_volatility_percentage
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_price_movement TO authenticated;

-- Step 4: Coupon Usages Table (0028)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  bonus_amount numeric(14,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, coupon_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON public.coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Only create policies if table exists and has is_admin column
DO $$
BEGIN
  -- Check if is_admin column exists in profiles
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin') THEN
    DROP POLICY IF EXISTS "Users can view own coupon usages" ON public.coupon_usages;
    CREATE POLICY "Users can view own coupon usages"
      ON public.coupon_usages FOR SELECT
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert coupon usages" ON public.coupon_usages;
    CREATE POLICY "Users can insert coupon usages"
      ON public.coupon_usages FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Admins can view all coupon usages" ON public.coupon_usages;
    CREATE POLICY "Admins can view all coupon usages"
      ON public.coupon_usages FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  ELSE
    -- Fallback: no is_admin check, just allow authenticated users
    DROP POLICY IF EXISTS "Users can view own coupon usages" ON public.coupon_usages;
    CREATE POLICY "Users can view own coupon usages"
      ON public.coupon_usages FOR SELECT
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert coupon usages" ON public.coupon_usages;
    CREATE POLICY "Users can insert coupon usages"
      ON public.coupon_usages FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Step 5: Coupon Redemption Function (0029)
-- ==========================================
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_coupon record;
  v_user_id uuid;
  v_user_coupon record;
  v_bonus_amount numeric(14,2);
  v_wallet record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN 
    RETURN jsonb_build_object('error', 'অনুমতি নেই / Unauthorized'); 
  END IF;

  -- Check if user is blocked (only if is_blocked column exists)
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_blocked') THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_blocked = true) THEN
      RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে / Account blocked');
    END IF;
  END IF;

  SELECT * INTO v_coupon 
  FROM public.coupon_codes 
  WHERE code = UPPER(p_code) 
    AND is_active = true 
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড / Invalid or expired coupon');
  END IF;

  SELECT * INTO v_user_coupon
  FROM public.coupon_usages
  WHERE user_id = v_user_id AND coupon_id = v_coupon.id;

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'আপনি এই কুপনটি ইতিমধ্যে ব্যবহার করেছেন / Coupon already used');
  END IF;

  IF v_coupon.usage_limit > 0 AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('error', 'কুপন ব্যবহার সীমা অতিক্রম হয়েছে / Coupon usage limit exceeded');
  END IF;

  IF v_coupon.min_deposit_amount > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.deposits 
      WHERE user_id = v_user_id 
        AND status = 'approved' 
        AND amount >= v_coupon.min_deposit_amount
    ) THEN
      RETURN jsonb_build_object('error', 'ন্যূনতম ডিপোজিট প্রয়োজন: ₹' || v_coupon.min_deposit_amount || ' / Minimum deposit required');
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'ওয়ালেট পাওয়া যায়নি / Wallet not found');
  END IF;

  v_bonus_amount := (v_wallet.balance * v_coupon.bonus_percentage / 100);
  IF v_coupon.max_bonus_amount > 0 AND v_bonus_amount > v_coupon.max_bonus_amount THEN
    v_bonus_amount := v_coupon.max_bonus_amount;
  END IF;

  UPDATE public.wallets 
  SET balance = balance + v_bonus_amount, 
      bonus = bonus + v_bonus_amount 
  WHERE user_id = v_user_id;

  UPDATE public.profiles 
  SET balance = balance + v_bonus_amount, 
      bonus_balance = bonus_balance + v_bonus_amount 
  WHERE id = v_user_id;

  INSERT INTO public.coupon_usages (user_id, coupon_id, bonus_amount)
  VALUES (v_user_id, v_coupon.id, v_bonus_amount);

  UPDATE public.coupon_codes 
  SET used_count = used_count + 1 
  WHERE id = v_coupon.id;

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_user_id, 'bonus', v_bonus_amount, 'approved', 'কুপন বোনাস / Coupon Bonus: ' || v_coupon.code, v_coupon.code);

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_user_id, 'কুপন বোনাস / Coupon Bonus', '₹' || v_bonus_amount || ' কুপন বোনাস আপনার ওয়ালেটে যোগ হয়েছে।', 'bonus');

  RETURN jsonb_build_object('success', true, 'amount', v_bonus_amount, 'code', v_coupon.code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;

-- ==========================================
-- END OF MIGRATIONS
-- ==========================================


-- 0031: Persistent perpetual trading terminal
-- Uses the existing wallets/profiles balance as the single source of truth.

CREATE TABLE IF NOT EXISTS public.perp_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy','sell')),
  entry_price numeric(20,8) NOT NULL,
  amount numeric(20,8) NOT NULL CHECK (amount > 0),
  leverage integer NOT NULL CHECK (leverage BETWEEN 1 AND 50),
  margin numeric(20,8) NOT NULL CHECK (margin >= 0),
  liquidation_price numeric(20,8) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  close_price numeric(20,8),
  realized_pnl numeric(20,8) NOT NULL DEFAULT 0,
  open_fee numeric(20,8) NOT NULL DEFAULT 0,
  close_fee numeric(20,8) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_perp_positions_user_status
  ON public.perp_positions(user_id, status, opened_at DESC);

ALTER TABLE public.perp_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perp_positions_select_own" ON public.perp_positions;
CREATE POLICY "perp_positions_select_own" ON public.perp_positions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

GRANT SELECT ON public.perp_positions TO authenticated;
GRANT ALL ON public.perp_positions TO service_role;

CREATE OR REPLACE FUNCTION public.open_perp_position(
  p_symbol text,
  p_side text,
  p_entry_price numeric,
  p_amount numeric,
  p_leverage integer,
  p_fee_rate numeric DEFAULT 0.001
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_wallet record;
  v_profile record;
  v_margin numeric;
  v_notional numeric;
  v_fee numeric;
  v_total_debit numeric;
  v_liq numeric;
  v_position uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Unauthorized'); END IF;
  IF p_side NOT IN ('buy','sell') OR p_entry_price <= 0 OR p_amount <= 0 OR p_leverage < 1 OR p_leverage > 50
    THEN RETURN jsonb_build_object('success',false,'error','Invalid order parameters'); END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_wallet IS NULL THEN RETURN jsonb_build_object('success',false,'error','Wallet not found'); END IF;
  IF COALESCE(v_profile.is_blocked,false) THEN RETURN jsonb_build_object('success',false,'error','Account blocked'); END IF;

  v_notional := p_entry_price * p_amount;
  v_margin := v_notional / p_leverage;
  v_fee := v_notional * GREATEST(p_fee_rate,0);
  v_total_debit := v_margin + v_fee;

  IF COALESCE(v_wallet.balance,0) < v_total_debit THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient wallet balance','required',v_total_debit,'balance',v_wallet.balance);
  END IF;

  IF p_side = 'buy' THEN
    v_liq := p_entry_price * (1 - 1.0/p_leverage + 0.005);
  ELSE
    v_liq := p_entry_price * (1 + 1.0/p_leverage - 0.005);
  END IF;

  UPDATE public.wallets SET balance = balance - v_total_debit, updated_at = now() WHERE user_id = v_uid;
  UPDATE public.profiles SET balance = balance - v_total_debit WHERE id = v_uid;

  INSERT INTO public.perp_positions
    (user_id,symbol,side,entry_price,amount,leverage,margin,liquidation_price,open_fee)
  VALUES
    (v_uid,p_symbol,p_side,p_entry_price,p_amount,p_leverage,v_margin,v_liq,v_fee)
  RETURNING id INTO v_position;

  INSERT INTO public.transactions(user_id,type,amount,status,description,reference)
  VALUES(v_uid,'perp_open',v_total_debit,'approved',
         'Perpetual ' || CASE WHEN p_side='buy' THEN 'Long' ELSE 'Short' END || ' ' || p_symbol,
         v_position::text);

  RETURN jsonb_build_object('success',true,'position_id',v_position,'margin',v_margin,'fee',v_fee,'balance',v_wallet.balance-v_total_debit);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_perp_position(
  p_position_id uuid,
  p_close_price numeric,
  p_fee_rate numeric DEFAULT 0.001
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_wallet record;
  v_pos record;
  v_pnl numeric;
  v_close_fee numeric;
  v_credit numeric;
BEGIN
  IF v_uid IS NULL OR p_close_price <= 0 THEN RETURN jsonb_build_object('success',false,'error','Invalid request'); END IF;

  SELECT * INTO v_pos FROM public.perp_positions
    WHERE id=p_position_id AND user_id=v_uid AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Position not found or already closed'); END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id=v_uid FOR UPDATE;
  v_pnl := CASE WHEN v_pos.side='buy'
    THEN (p_close_price-v_pos.entry_price)*v_pos.amount
    ELSE (v_pos.entry_price-p_close_price)*v_pos.amount END;

  -- Never credit more than the collateral left after a loss.
  v_pnl := GREATEST(v_pnl, -v_pos.margin);
  v_close_fee := (p_close_price*v_pos.amount)*GREATEST(p_fee_rate,0);
  v_credit := GREATEST(0, v_pos.margin + v_pnl - v_close_fee);

  UPDATE public.wallets SET balance=balance+v_credit, updated_at=now() WHERE user_id=v_uid;
  UPDATE public.profiles SET balance=balance+v_credit WHERE id=v_uid;

  UPDATE public.perp_positions
  SET status='closed', closed_at=now(), close_price=p_close_price,
      realized_pnl=v_pnl, close_fee=v_close_fee
  WHERE id=v_pos.id;

  INSERT INTO public.transactions(user_id,type,amount,status,description,reference)
  VALUES(v_uid,'perp_close',v_credit,'approved',
         'Perpetual close ' || CASE WHEN v_pos.side='buy' THEN 'Long' ELSE 'Short' END || ' ' || v_pos.symbol,
         v_pos.id::text);

  RETURN jsonb_build_object(
    'success',true,'position_id',v_pos.id,'realized_pnl',v_pnl,
    'close_fee',v_close_fee,'credit',v_credit,'balance',v_wallet.balance+v_credit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_perp_position(text,text,numeric,numeric,integer,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_perp_position(uuid,numeric,numeric) TO authenticated;


-- 0032: Admin-controlled trading terminal coin price ranges
CREATE TABLE IF NOT EXISTS public.trading_terminal_coin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  min_price numeric(30,12) NOT NULL CHECK (min_price > 0),
  max_price numeric(30,12) NOT NULL CHECK (max_price > min_price),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_terminal_coin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terminal_ranges_public_read" ON public.trading_terminal_coin_settings;
CREATE POLICY "terminal_ranges_public_read"
  ON public.trading_terminal_coin_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "terminal_ranges_admin_write" ON public.trading_terminal_coin_settings;
CREATE POLICY "terminal_ranges_admin_write"
  ON public.trading_terminal_coin_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.trading_terminal_coin_settings TO anon, authenticated;
GRANT ALL ON public.trading_terminal_coin_settings TO service_role;

INSERT INTO public.trading_terminal_coin_settings (symbol,name,min_price,max_price,sort_order)
VALUES
('BTC/USDT','Bitcoin',60000,75000,1),
('ETH/USDT','Ethereum',3000,4000,2),
('SOL/USDT','Solana',130,210,3),
('BNB/USDT','BNB',500,680,4),
('XRP/USDT','XRP',0.45,0.85,5),
('ADA/USDT','Cardano',0.30,0.60,6),
('DOGE/USDT','Dogecoin',0.08,0.18,7),
('AVAX/USDT','Avalanche',20,40,8)
ON CONFLICT (symbol) DO UPDATE SET
  name=excluded.name,
  min_price=excluded.min_price,
  max_price=excluded.max_price,
  sort_order=excluded.sort_order,
  updated_at=now();
