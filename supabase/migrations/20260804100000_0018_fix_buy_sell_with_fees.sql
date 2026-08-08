-- Fix Buy/Sell transaction logic with proper fee calculation
-- Buy: Deduct total + fee from wallet
-- Sell: Credit (total - fee) to wallet
-- Add fee field to transaction history

-- First, add fee column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS fee numeric(14,2) DEFAULT 0;

-- Update buy_commodity to deduct total + fee
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

  -- Check wallet balance (not profile balance)
  SELECT balance INTO v_profile FROM public.wallets WHERE user_id = v_profile.id;
  IF v_profile.balance < v_total_with_fee THEN
    RETURN jsonb_build_object('error', 'অপর্যাপ্ত ব্যালেন্স', 'balance', v_profile.balance, 'required', v_total_with_fee);
  END IF;

  -- Deduct total + fee from wallet
  UPDATE public.wallets SET balance = balance - v_total_with_fee WHERE user_id = v_profile.id;
  
  -- Also deduct from profile balance for consistency
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

  -- Insert transaction with fee
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'buy', v_total, v_fee, 'approved', v_commodity.name || ' কেনা / Buy ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে কেনা হয়েছে', 'new_balance', v_profile.balance - v_total_with_fee, 'total', v_total, 'fee', v_fee, 'total_with_fee', v_total_with_fee, 'name', v_commodity.name);
END;
$$;

-- Update sell_commodity to credit (total - fee)
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

  -- Credit (total - fee) to wallet
  UPDATE public.wallets SET balance = balance + v_final_amount WHERE user_id = v_profile.id;
  
  -- Also credit to profile balance for consistency
  UPDATE public.profiles SET balance = balance + v_final_amount WHERE id = v_profile.id;

  -- Update holdings
  IF v_holding.quantity = p_quantity THEN
    DELETE FROM public.holdings WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  ELSE
    UPDATE public.holdings SET quantity = quantity - p_quantity, updated_at = now()
      WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  END IF;

  -- Insert transaction with fee
  INSERT INTO public.transactions (user_id, type, amount, fee, status, description, reference)
  VALUES (v_profile.id, 'sell', v_total, v_fee, 'approved', v_commodity.name || ' বিক্রি / Sell ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে বিক্রি হয়েছে', 'new_balance', v_profile.balance + v_final_amount, 'total', v_total, 'fee', v_fee, 'final_amount', v_final_amount, 'name', v_commodity.name);
END;
$$;
