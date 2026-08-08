-- Wagering System Implementation
-- Bonus requires 20x wagering before withdrawal
-- Bonus goes to wagering_wallet (locked)
-- Buy/Sell transactions deduct from wagering_wallet
-- Wagering complete -> moves to main wallet
-- Withdrawal checks wagering completion

-- Add wagering columns to wallets table
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS wagering_balance numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS wagering_required numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS wagering_completed numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_wagering_locked numeric(14,2) DEFAULT 0;

-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS public.signup_bonus() CASCADE;
DROP FUNCTION IF EXISTS public.buy_commodity(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.sell_commodity(uuid, numeric) CASCADE;

-- Update signup_bonus to use wagering system
CREATE OR REPLACE FUNCTION public.signup_bonus()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_bonus_amount numeric(14,2);
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;

  -- Get signup bonus from admin settings (default 50)
  SELECT COALESCE(CAST(value AS numeric), 50) INTO v_bonus_amount 
  FROM public.admin_settings 
  WHERE key = 'signup_bonus'
  LIMIT 1;

  -- Add bonus to wagering wallet (locked)
  UPDATE public.wallets 
  SET 
    wagering_balance = wagering_balance + v_bonus_amount,
    wagering_required = wagering_balance + v_bonus_amount + (v_bonus_amount * 20),
    bonus_wagering_locked = bonus_wagering_locked + v_bonus_amount
  WHERE user_id = v_profile.id;

  -- Insert transaction
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_profile.id, 'bonus', v_bonus_amount, 'approved', 'সাইন আপ বোনাস / Signup Bonus');

  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_profile.id, 
    'বোনাস প্রাপ্ত / Bonus Received', 
    '₹' || v_bonus_amount || ' সাইন আপ বোনাস প্রাপ্ত হয়েছে। এটি উত্তোলনে 20x ট্রেড করার পর উইথড্র করা যাবে।', 
    'bonus'
  );

  RETURN jsonb_build_object('success', true, 'amount', v_bonus_amount, 'wagering_required', v_bonus_amount * 20);
END;
$$;

-- Update buy_commodity to deduct from wagering wallet first
CREATE OR REPLACE FUNCTION public.buy_commodity(p_commodity_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_commodity record;
  v_total numeric(14,2);
  v_fee numeric(14,2);
  v_total_with_fee numeric(14,2);
  v_wagering_amount numeric(14,2);
  v_holding record;
  v_new_avg numeric(14,2);
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;
  IF v_profile.is_blocked THEN RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে'); END IF;

  SELECT * INTO v_commodity FROM public.commodities WHERE id = p_commodity_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'পণ্য পাওয়া যায়নি'); END IF;
  IF p_quantity <= 0 THEN RETURN jsonb_build_object('error', 'পরিমাণ সঠিক নয়'); END IF;

  v_total := v_commodity.current_price * p_quantity;
  v_fee := v_total * 0.005; -- 0.5% fee
  v_total_with_fee := v_total + v_fee;
  v_wagering_amount := v_total_with_fee * 20; -- 20x wagering

  -- Check main wallet balance
  SELECT balance INTO v_profile FROM public.wallets WHERE user_id = v_profile.id;
  IF v_profile.balance < v_total_with_fee THEN
    RETURN jsonb_build_object('error', 'অপর্যাপ্ত ব্যালেন্স', 'balance', v_profile.balance, 'required', v_total_with_fee);
  END IF;

  -- Deduct from main wallet
  UPDATE public.wallets SET balance = balance - v_total_with_fee WHERE user_id = v_profile.id;
  UPDATE public.profiles SET balance = balance - v_total_with_fee WHERE id = v_profile.id;

  -- Update holdings
  SELECT * INTO v_holding FROM public.holdings WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  IF FOUND THEN
    v_new_avg := (v_holding.avg_buy_price * v_holding.quantity + v_total) / (v_holding.quantity + p_quantity);
    UPDATE public.holdings SET quantity = quantity + p_quantity, avg_buy_price = v_new_avg, updated_at = now()
      WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  ELSE
    INSERT INTO public.holdings (user_id, commodity_id, quantity, avg_buy_price)
    VALUES (v_profile.id, p_commodity_id, p_quantity, v_commodity.current_price);
  END IF;

  -- Update wagering progress
  UPDATE public.wallets 
  SET 
    wagering_completed = wagering_completed + v_wagering_amount,
    wagering_balance = CASE 
      WHEN wagering_completed >= wagering_required THEN wagering_balance + v_wagering_amount
      ELSE wagering_balance
    END
  WHERE user_id = v_profile.id;

  -- Check if wagering complete and move to main wallet
  IF (SELECT wagering_completed FROM public.wallets WHERE user_id = v_profile.id) >= 
     (SELECT wagering_required FROM public.wallets WHERE user_id = v_profile.id) THEN
    -- Move wagering balance to main wallet
    UPDATE public.wallets 
    SET 
      balance = balance + wagering_balance,
      wagering_balance = 0,
      wagering_required = 0,
      wagering_completed = 0,
      bonus_wagering_locked = 0
    WHERE user_id = v_profile.id;
    
    -- Send notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_profile.id, 
      'ওয়েজারিং সম্পন / Wagering Complete', 
      'আপনার বোনাস উত্তোলনে 20x ট্রেড সম্পন হয়েছে। এখন উইথড্র করতে পারবেন।', 
      'bonus'
    );
  END IF;

  -- Insert transaction with fee
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'buy', v_total, v_fee, 'approved', v_commodity.name || ' কেনা / Buy ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে কেনা হয়েছে', 'new_balance', v_profile.balance - v_total_with_fee, 'total', v_total, 'fee', v_fee, 'total_with_fee', v_total_with_fee, 'wagering_amount', v_wagering_amount, 'name', v_commodity.name);
END;
$$;

-- Update sell_commodity to deduct from wagering wallet first
CREATE OR REPLACE FUNCTION public.sell_commodity(p_commodity_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_commodity record;
  v_total numeric(14,2);
  v_fee numeric(14,2);
  v_final_amount numeric(14,2);
  v_wagering_amount numeric(14,2);
  v_holding record;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;
  IF v_profile.is_blocked THEN RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে'); END IF;

  SELECT * INTO v_commodity FROM public.commodities WHERE id = p_commodity_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'পণ্য পাওয়া যায়নি'); END IF;
  IF p_quantity <= 0 THEN RETURN jsonb_build_object('error', 'পরিমাণ সঠিক নয়'); END IF;

  SELECT * INTO v_holding FROM public.holdings WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  IF NOT FOUND OR v_holding.quantity < p_quantity THEN
    RETURN jsonb_build_object('error', 'পর্যাপ্ত পণ্য নেই', 'holding', COALESCE(v_holding.quantity, 0));
  END IF;

  v_total := v_commodity.current_price * p_quantity;
  v_fee := v_total * 0.005; -- 0.5% fee
  v_final_amount := v_total - v_fee; -- Credit only after fee deduction
  v_wagering_amount := v_final_amount * 20; -- 20x wagering

  -- Credit (total - fee) to wallet
  UPDATE public.wallets SET balance = balance + v_final_amount WHERE user_id = v_profile.id;
  UPDATE public.profiles SET balance = balance + v_final_amount WHERE id = v_profile.id;

  -- Update holdings
  IF v_holding.quantity = p_quantity THEN
    DELETE FROM public.holdings WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  ELSE
    UPDATE public.holdings SET quantity = quantity - p_quantity, updated_at = now()
      WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  END IF;

  -- Update wagering progress
  UPDATE public.wallets 
  SET 
    wagering_completed = wagering_completed + v_wagering_amount,
    wagering_balance = CASE 
      WHEN wagering_completed >= wagering_required THEN wagering_balance + v_wagering_amount
      ELSE wagering_balance
    END
  WHERE user_id = v_profile.id;

  -- Check if wagering complete and move to main wallet
  IF (SELECT wagering_completed FROM public.wallets WHERE user_id = v_profile.id) >= 
     (SELECT wagering_required FROM public.wallets WHERE user_id = v_profile.id) THEN
    -- Move wagering balance to main wallet
    UPDATE public.wallets 
    SET 
      balance = balance + wagering_balance,
      wagering_balance = 0,
      wagering_required = 0,
      wagering_completed = 0,
      bonus_wagering_locked = 0
    WHERE user_id = v_profile.id;
    
    -- Send notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_profile.id, 
      'ওয়েজারিং সম্পন / Wagering Complete', 
      'আপনার বোনাস উত্তোলনে 20x ট্রেড সম্পন হয়েছে। এখন উইথড্র করতে পারবেন।', 
      'bonus'
    );
  END IF;

  -- Insert transaction with fee
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'sell', v_total, v_fee, 'approved', v_commodity.name || ' বিক্রি / Sell ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে বিক্রি হয়েছে', 'new_balance', v_profile.balance + v_final_amount, 'total', v_total, 'fee', v_fee, 'final_amount', v_final_amount, 'wagering_amount', v_wagering_amount, 'name', v_commodity.name);
END;
$$;

-- Update create_withdrawal to check wagering completion
DROP FUNCTION IF EXISTS public.create_withdrawal(numeric, text, text, text, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_withdrawal(
  p_amount numeric, p_method text, p_upi_id text, p_account_holder text, p_account_number text, p_bank_ifsc text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_wallet record;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;
  IF v_profile.is_blocked THEN RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে'); END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_profile.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ওয়ালেট পাওয়া যায়নি'); END IF;

  -- Check if bonus wagering is incomplete
  IF v_wallet.bonus_wagering_locked > 0 AND v_wallet.wagering_completed < v_wallet.wagering_required THEN
    RETURN jsonb_build_object('error', 'বোনাস উত্তোলনে 20x ট্রেড সম্পন করতে হবে প্রথম', 
    'wagering_required', v_wallet.wagering_required,
    'wagering_completed', v_wallet.wagering_completed,
    'bonus_locked', v_wallet.bonus_wagering_locked);
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('error', 'অপর্যাপ্ত ব্যালেন্স', 'balance', v_wallet.balance, 'required', p_amount);
  END IF;

  -- Create withdrawal request
  INSERT INTO public.withdrawals (user_id, amount, method, upi_id, account_holder, account_number, bank_ifsc, status)
  VALUES (v_profile.id, p_amount, p_method, p_upi_id, p_account_holder, p_account_number, p_bank_ifsc, 'pending');

  -- Create transaction
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_profile.id, 'withdraw', p_amount, 'pending', 'উইথড্র রিকোয়েস্ট / Withdrawal Request');

  RETURN jsonb_build_object('success', true, 'message', 'উইথড্র রিকোয়েস্ট জমা হয়েছে');
END;
$$;
