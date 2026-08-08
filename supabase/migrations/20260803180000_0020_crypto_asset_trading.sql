-- 0020: Crypto Index (high_risk_assets) buy/sell support
-- Problem: the UI called buy_commodity/sell_commodity for Crypto Index assets,
-- but those RPCs only look in public.commodities, so every crypto trade failed
-- with "পণ্য পাওয়া যায়নি". Holdings also could not be stored because
-- holdings.commodity_id has an FK to commodities.
-- Fix: dedicated asset_holdings table + buy_asset/sell_asset RPCs (0.5% charge).

-- ===== asset_holdings =====
CREATE TABLE IF NOT EXISTS public.asset_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.high_risk_assets(id) ON DELETE CASCADE,
  quantity numeric(18,6) NOT NULL DEFAULT 0,
  avg_buy_price numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_holdings_user ON public.asset_holdings(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_holdings TO authenticated;
GRANT ALL ON public.asset_holdings TO service_role;

ALTER TABLE public.asset_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_holdings_select_own" ON public.asset_holdings;
CREATE POLICY "asset_holdings_select_own" ON public.asset_holdings FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "asset_holdings_insert_own" ON public.asset_holdings;
CREATE POLICY "asset_holdings_insert_own" ON public.asset_holdings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "asset_holdings_update_own" ON public.asset_holdings;
CREATE POLICY "asset_holdings_update_own" ON public.asset_holdings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "asset_holdings_delete_own" ON public.asset_holdings;
CREATE POLICY "asset_holdings_delete_own" ON public.asset_holdings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== buy_asset =====
CREATE OR REPLACE FUNCTION public.buy_asset(p_asset_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_asset record;
  v_gross numeric(14,2);
  v_charge numeric(14,2);
  v_debit numeric(14,2);
  v_holding record;
  v_new_avg numeric(14,2);
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;
  IF COALESCE(v_profile.is_blocked, false) THEN
    RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'পরিমাণ সঠিক নয়');
  END IF;

  SELECT * INTO v_asset FROM public.high_risk_assets WHERE id = p_asset_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'অ্যাসেট পাওয়া যায়নি'); END IF;

  v_gross  := ROUND(v_asset.current_price * p_quantity, 2);
  v_charge := ROUND(v_gross * 0.005, 2);
  v_debit  := v_gross + v_charge;

  IF COALESCE(v_profile.balance, 0) < v_debit THEN
    RETURN jsonb_build_object('error', 'অপর্যাপ্ত ব্যালেন্স', 'balance', v_profile.balance, 'required', v_debit);
  END IF;

  UPDATE public.profiles SET balance = balance - v_debit WHERE id = v_profile.id;
  UPDATE public.wallets  SET balance = balance - v_debit WHERE user_id = v_profile.id;

  SELECT * INTO v_holding FROM public.asset_holdings
    WHERE user_id = v_profile.id AND asset_id = p_asset_id FOR UPDATE;
  IF FOUND THEN
    v_new_avg := (v_holding.avg_buy_price * v_holding.quantity + v_gross) / (v_holding.quantity + p_quantity);
    UPDATE public.asset_holdings
      SET quantity = quantity + p_quantity, avg_buy_price = v_new_avg, updated_at = now()
      WHERE user_id = v_profile.id AND asset_id = p_asset_id;
  ELSE
    INSERT INTO public.asset_holdings (user_id, asset_id, quantity, avg_buy_price)
    VALUES (v_profile.id, p_asset_id, p_quantity, v_asset.current_price);
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_profile.id, 'buy', v_debit, 'approved',
          v_asset.name || ' কেনা / Buy ' || COALESCE(v_asset.symbol, v_asset.name),
          p_asset_id::text);

  RETURN jsonb_build_object(
    'success', true,
    'message', v_asset.name || ' সফলভাবে কেনা হয়েছে',
    'quantity', p_quantity,
    'price', v_asset.current_price,
    'gross', v_gross,
    'charge', v_charge,
    'total', v_debit,
    'new_balance', COALESCE(v_profile.balance, 0) - v_debit,
    'name', v_asset.name
  );
END;
$$;

-- ===== sell_asset =====
CREATE OR REPLACE FUNCTION public.sell_asset(p_asset_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_asset record;
  v_gross numeric(14,2);
  v_charge numeric(14,2);
  v_credit numeric(14,2);
  v_holding record;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;
  IF COALESCE(v_profile.is_blocked, false) THEN
    RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'পরিমাণ সঠিক নয়');
  END IF;

  SELECT * INTO v_asset FROM public.high_risk_assets WHERE id = p_asset_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'অ্যাসেট পাওয়া যায়নি'); END IF;

  SELECT * INTO v_holding FROM public.asset_holdings
    WHERE user_id = v_profile.id AND asset_id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_holding.quantity < p_quantity THEN
    RETURN jsonb_build_object('error', 'পর্যাপ্ত অ্যাসেট নেই', 'holding', COALESCE(v_holding.quantity, 0));
  END IF;

  v_gross  := ROUND(v_asset.current_price * p_quantity, 2);
  v_charge := ROUND(v_gross * 0.005, 2);
  v_credit := v_gross - v_charge;

  UPDATE public.profiles SET balance = balance + v_credit WHERE id = v_profile.id;
  UPDATE public.wallets  SET balance = balance + v_credit WHERE user_id = v_profile.id;

  IF v_holding.quantity = p_quantity THEN
    DELETE FROM public.asset_holdings WHERE user_id = v_profile.id AND asset_id = p_asset_id;
  ELSE
    UPDATE public.asset_holdings SET quantity = quantity - p_quantity, updated_at = now()
      WHERE user_id = v_profile.id AND asset_id = p_asset_id;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_profile.id, 'sell', v_credit, 'approved',
          v_asset.name || ' বিক্রি / Sell ' || COALESCE(v_asset.symbol, v_asset.name),
          p_asset_id::text);

  RETURN jsonb_build_object(
    'success', true,
    'message', v_asset.name || ' সফলভাবে বিক্রি হয়েছে',
    'quantity', p_quantity,
    'price', v_asset.current_price,
    'gross', v_gross,
    'charge', v_charge,
    'total', v_credit,
    'new_balance', COALESCE(v_profile.balance, 0) + v_credit,
    'name', v_asset.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_asset(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_asset(uuid, numeric) TO authenticated;
