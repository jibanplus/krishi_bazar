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
