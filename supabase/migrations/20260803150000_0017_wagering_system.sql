-- Wagering System Migration
-- Track wagering requirements for bonuses (20x requirement)

-- Add wagering columns to wallets table
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS wagering_required DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS wagering_completed DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_wagering_locked DECIMAL(15,2) DEFAULT 0;

-- Create wagering_history table to track wagering progress
CREATE TABLE IF NOT EXISTS wagering_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  wagered_amount DECIMAL(15,2) NOT NULL,
  bonus_amount DECIMAL(15,2) NOT NULL,
  wagering_multiplier INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wagering_user ON public.wagering_history (user_id);
CREATE INDEX IF NOT EXISTS idx_wagering_created ON public.wagering_history (created_at);

GRANT SELECT ON public.wagering_history TO authenticated;
GRANT ALL ON public.wagering_history TO service_role;
ALTER TABLE public.wagering_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wagering_history_select_own" ON public.wagering_history;
CREATE POLICY "wagering_history_select_own" ON public.wagering_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create coupon_codes table for deposit bonuses
CREATE TABLE IF NOT EXISTS coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  bonus_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_bonus_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_deposit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  usage_limit INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_coupon_code ON public.coupon_codes (code);
CREATE INDEX IF NOT EXISTS idx_coupon_active ON public.coupon_codes (is_active, valid_from, valid_until);

GRANT SELECT ON public.coupon_codes TO authenticated;
GRANT ALL ON public.coupon_codes TO service_role;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupon_codes_select_active" ON public.coupon_codes;
CREATE POLICY "coupon_codes_select_active" ON public.coupon_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- Update admin_adjust_wallet to handle wagering tracking
DROP FUNCTION IF EXISTS public.admin_adjust_wallet(uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_user_id UUID,
  p_amount DECIMAL(15,2),
  p_direction TEXT,
  p_reason TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance DECIMAL(15,2))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_bonus_amount DECIMAL(15,2) := 0;
BEGIN
  -- Lock wallet row
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Create wallet if not exists
    INSERT INTO wallets (user_id, balance, bonus, referral_income)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;

  -- Determine if this is a bonus credit
  IF p_direction = 'credit' AND (
    p_reason ILIKE '%bonus%' OR 
    p_reason ILIKE '%spin%' OR 
    p_reason ILIKE '%referral%'
  ) THEN
    v_bonus_amount := p_amount;
  END IF;

  -- Update wallet
  IF p_direction = 'credit' THEN
    UPDATE wallets SET
      balance = balance + p_amount,
      bonus = bonus + v_bonus_amount,
      wagering_required = wagering_required + (v_bonus_amount * 20),
      bonus_wagering_locked = bonus_wagering_locked + v_bonus_amount
    WHERE user_id = p_user_id;
  ELSE
    UPDATE wallets SET
      balance = balance - p_amount
    WHERE user_id = p_user_id;
  END IF;

  -- Get updated wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;

  -- Log adjustment
  INSERT INTO wallet_adjustments (user_id, amount, direction, reason, admin_id)
  VALUES (p_user_id, p_amount, p_direction, p_reason, auth.uid());

  RETURN QUERY SELECT true, 'Wallet adjusted successfully', v_wallet.balance;
END;
$$;

-- Update create_withdrawal to check wagering requirements
DROP FUNCTION IF EXISTS public.create_withdrawal(numeric, text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_withdrawal(
  p_amount DECIMAL(15,2),
  p_method TEXT,
  p_upi_id TEXT DEFAULT NULL,
  p_account_holder TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_bank_ifsc TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, withdrawal_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_withdrawal_id UUID;
  v_withdrawable_balance DECIMAL(15,2);
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated', NULL::UUID;
    RETURN;
  END IF;

  -- Get wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Wallet not found', NULL::UUID;
  END IF;

  -- Check wagering requirements
  IF v_wallet.wagering_required > v_wallet.wagering_completed THEN
    RETURN QUERY SELECT false, 
      'Complete wagering requirement before withdrawal. Required: ₹' || v_wallet.wagering_required || ', Completed: ₹' || v_wallet.wagering_completed,
      NULL::UUID;
    RETURN;
  END IF;

  -- Calculate withdrawable balance (exclude locked bonus)
  v_withdrawable_balance := v_wallet.balance - v_wallet.bonus_wagering_locked;

  -- Check balance
  IF v_withdrawable_balance < p_amount THEN
    RETURN QUERY SELECT false, 
      'Insufficient balance. Available: ₹' || v_withdrawable_balance || ', Requested: ₹' || p_amount,
      NULL::UUID;
    RETURN;
  END IF;

  -- Create withdrawal
  INSERT INTO withdrawals (
    user_id, amount, method, upi_id, account_holder, account_number, bank_ifsc, status
  ) VALUES (
    auth.uid(), p_amount, p_method, p_upi_id, p_account_holder, p_account_number, p_bank_ifsc, 'pending'
  ) RETURNING id INTO v_withdrawal_id;

  -- Deduct from wallet
  UPDATE wallets SET
    balance = balance - p_amount,
    total_withdraw = total_withdraw + p_amount
  WHERE user_id = auth.uid();

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (auth.uid(), 'withdraw', p_amount, 'pending', 'Withdrawal Request');

  RETURN QUERY SELECT true, 'Withdrawal request created successfully', v_withdrawal_id;
END;
$$;

-- Function to track wagering on trades
DROP FUNCTION IF EXISTS public.track_wagering_on_trade(uuid, numeric) CASCADE;

CREATE OR REPLACE FUNCTION track_wagering_on_trade(
  p_user_id UUID,
  p_trade_amount DECIMAL(15,2)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_wagering_to_add DECIMAL(15,2);
BEGIN
  -- Get wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- Calculate wagering to add (up to required amount)
  IF v_wallet.wagering_required > v_wallet.wagering_completed THEN
    v_wagering_to_add := LEAST(p_trade_amount, v_wallet.wagering_required - v_wallet.wagering_completed);
    
    -- Update wagering
    UPDATE wallets SET
      wagering_completed = wagering_completed + v_wagering_to_add
    WHERE user_id = p_user_id;

    -- Log wagering history
    INSERT INTO wagering_history (user_id, wagered_amount, bonus_amount, wagering_multiplier)
    VALUES (p_user_id, v_wagering_to_add, v_wallet.bonus_wagering_locked / 20, 20);

    -- If wagering complete, release locked bonus
    IF v_wallet.wagering_completed >= v_wallet.wagering_required THEN
      UPDATE wallets SET
        bonus_wagering_locked = 0
      WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

-- Create trigger to track wagering on buy/sell transactions
DROP FUNCTION IF EXISTS public.after_trade_transaction() CASCADE;

CREATE OR REPLACE FUNCTION after_trade_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type IN ('buy', 'sell') AND NEW.status = 'completed' THEN
    PERFORM track_wagering_on_trade(NEW.user_id, NEW.amount);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_wagering_trigger ON transactions;
CREATE TRIGGER trade_wagering_trigger
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION after_trade_transaction();

-- Function to apply coupon code on deposit
DROP FUNCTION IF EXISTS public.apply_coupon_code(text, numeric) CASCADE;

CREATE OR REPLACE FUNCTION apply_coupon_code(
  p_coupon_code TEXT,
  p_deposit_amount DECIMAL(15,2)
)
RETURNS TABLE(success BOOLEAN, message TEXT, bonus_amount DECIMAL(15,2))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupon_codes%ROWTYPE;
  v_bonus_amount DECIMAL(15,2);
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated', 0::DECIMAL(15,2);
    RETURN;
  END IF;

  -- Get coupon
  SELECT * INTO v_coupon FROM coupon_codes 
  WHERE code = p_coupon_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid coupon code', 0::DECIMAL(15,2);
    RETURN;
  END IF;

  -- Check validity
  IF v_coupon.valid_from > NOW() OR (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW()) THEN
    RETURN QUERY SELECT false, 'Coupon code expired or not yet valid', 0::DECIMAL(15,2);
    RETURN;
  END IF;

  -- Check usage limit
  IF v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN QUERY SELECT false, 'Coupon code usage limit reached', 0::DECIMAL(15,2);
    RETURN;
  END IF;

  -- Check minimum deposit
  IF p_deposit_amount < v_coupon.min_deposit_amount THEN
    RETURN QUERY SELECT false, 
      'Minimum deposit ₹' || v_coupon.min_deposit_amount || ' required for this coupon',
      0::DECIMAL(15,2);
    RETURN;
  END IF;

  -- Calculate bonus
  v_bonus_amount := LEAST(
    p_deposit_amount * (v_coupon.bonus_percentage / 100),
    v_coupon.max_bonus_amount
  );

  -- Update coupon usage
  UPDATE coupon_codes SET used_count = used_count + 1 WHERE id = v_coupon.id;

  -- Credit bonus to wallet with wagering
  PERFORM admin_adjust_wallet(
    auth.uid(),
    v_bonus_amount,
    'credit',
    'Coupon Bonus: ' || p_coupon_code
  );

  RETURN QUERY SELECT true, 'Coupon applied successfully', v_bonus_amount;
END;
$$;