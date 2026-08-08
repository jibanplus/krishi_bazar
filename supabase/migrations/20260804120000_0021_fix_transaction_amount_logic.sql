-- Fix transaction amount logic to match actual wallet movements
-- Problem: transaction.amount was using gross total instead of final amount
-- This caused popup/wallet to show wrong amounts vs actual wallet balance
-- Fix: Use actual credited/debited amounts in transaction records

-- Fix buy_commodity transaction amount
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

  -- Insert transaction with FINAL debited amount (total + fee)
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'buy', v_total_with_fee, v_fee, 'approved', v_commodity.name || ' কেনা / Buy ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে কেনা হয়েছে', 'new_balance', v_profile.balance - v_total_with_fee, 'total', v_total, 'fee', v_fee, 'total_with_fee', v_total_with_fee, 'wagering_amount', v_wagering_amount, 'name', v_commodity.name);
END;
$$;

-- Fix sell_commodity transaction amount
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

  -- Insert transaction with FINAL credited amount (total - fee)
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'sell', v_final_amount, v_fee, 'approved', v_commodity.name || ' বিক্রি / Sell ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে বিক্রি হয়েছে', 'new_balance', v_profile.balance + v_final_amount, 'total', v_total, 'fee', v_fee, 'final_amount', v_final_amount, 'wagering_amount', v_wagering_amount, 'name', v_commodity.name);
END;
$$;

-- Fix buy_asset transaction amount
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

  v_gross := v_asset.current_price * p_quantity;
  v_charge := v_gross * 0.005; -- 0.5% charge
  v_debit := v_gross + v_charge;

  SELECT balance INTO v_profile FROM public.wallets WHERE user_id = v_profile.id FOR UPDATE;
  IF v_profile.balance < v_debit THEN
    RETURN jsonb_build_object('error', 'অপর্যাপ্ত ব্যালেন্স', 'balance', v_profile.balance, 'required', v_debit);
  END IF;

  UPDATE public.wallets SET balance = balance - v_debit WHERE user_id = v_profile.id;
  UPDATE public.profiles SET balance = balance - v_debit WHERE id = v_profile.id;

  SELECT * INTO v_holding FROM public.asset_holdings WHERE user_id = v_profile.id AND asset_id = p_asset_id FOR UPDATE;
  IF FOUND THEN
    v_new_avg := (v_holding.avg_buy_price * v_holding.quantity + v_gross) / (v_holding.quantity + p_quantity);
    UPDATE public.asset_holdings SET quantity = quantity + p_quantity, avg_buy_price = v_new_avg, updated_at = now()
      WHERE user_id = v_profile.id AND asset_id = p_asset_id;
  ELSE
    INSERT INTO public.asset_holdings (user_id, asset_id, quantity, avg_buy_price)
    VALUES (v_profile.id, p_asset_id, p_quantity, v_asset.current_price);
  END IF;

  -- Insert transaction with FINAL debited amount (gross + charge)
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'buy', v_debit, v_charge, 'approved',
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

-- Fix sell_asset transaction amount
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

  SELECT * INTO v_holding FROM public.asset_holdings WHERE user_id = v_profile.id AND asset_id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_holding.quantity < p_quantity THEN
    RETURN jsonb_build_object('error', 'পর্যাপ্ত অ্যাসেট নেই', 'holding', COALESCE(v_holding.quantity, 0));
  END IF;

  v_gross := v_asset.current_price * p_quantity;
  v_charge := v_gross * 0.005; -- 0.5% charge
  v_credit := v_gross - v_charge;

  UPDATE public.wallets SET balance = balance + v_credit WHERE user_id = v_profile.id;
  UPDATE public.profiles SET balance = balance + v_credit WHERE id = v_profile.id;

  IF v_holding.quantity = p_quantity THEN
    DELETE FROM public.asset_holdings WHERE user_id = v_profile.id AND asset_id = p_asset_id;
  ELSE
    UPDATE public.asset_holdings SET quantity = quantity - p_quantity, updated_at = now()
      WHERE user_id = v_profile.id AND asset_id = p_asset_id;
  END IF;

  -- Insert transaction with FINAL credited amount (gross - charge)
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'sell', v_credit, v_charge, 'approved',
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
