-- Coupon Redemption System
-- Allows users to redeem coupon codes for bonus credit
-- Migration: 20260804180000_0029_coupon_redemption_function.sql

-- ===== redeem_coupon: Apply coupon code for bonus =====
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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN 
    RETURN jsonb_build_object('error', 'অনুমতি নেই / Unauthorized'); 
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_blocked = true) THEN
    RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে / Account blocked');
  END IF;

  -- Find active coupon
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

  -- Check if user already used this coupon
  SELECT * INTO v_user_coupon
  FROM public.coupon_usages
  WHERE user_id = v_user_id AND coupon_id = v_coupon.id;

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'আপনি এই কুপনটি ইতিমধ্যে ব্যবহার করেছেন / Coupon already used');
  END IF;

  -- Check usage limit
  IF v_coupon.usage_limit > 0 AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('error', 'কুপন ব্যবহার সীমা অতিক্রম হয়েছে / Coupon usage limit exceeded');
  END IF;

  -- Check if user has made required deposit (if min_deposit_amount > 0)
  IF v_coupon.min_deposit_amount > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.deposits 
      WHERE user_id = v_user_id 
        AND status = 'approved' 
        AND amount >= v_coupon.min_deposit_amount
    ) THEN
      RETURN jsonb_build_object('error', 'ন্যূনতম ডিপোজিট প্রয়োজন: ₹' || v_coupon.min_deposit_amount || ' / Minimum deposit required');
    END IF;
  END;

  -- Calculate bonus amount (percentage of wallet balance, capped at max_bonus_amount)
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'ওয়ালেট পাওয়া যায়নি / Wallet not found');
  END IF;

  v_bonus_amount := (v_wallet.balance * v_coupon.bonus_percentage / 100);
  IF v_coupon.max_bonus_amount > 0 AND v_bonus_amount > v_coupon.max_bonus_amount THEN
    v_bonus_amount := v_coupon.max_bonus_amount;
  END IF;

  -- Credit bonus to wallet
  UPDATE public.wallets 
  SET balance = balance + v_bonus_amount, 
      bonus = bonus + v_bonus_amount 
  WHERE user_id = v_user_id;

  -- Update profile balance
  UPDATE public.profiles 
  SET balance = balance + v_bonus_amount, 
      bonus_balance = bonus_balance + v_bonus_amount 
  WHERE id = v_user_id;

  -- Record coupon usage
  INSERT INTO public.coupon_usages (user_id, coupon_id, bonus_amount)
  VALUES (v_user_id, v_coupon.id, v_bonus_amount);

  -- Update coupon used count
  UPDATE public.coupon_codes 
  SET used_count = used_count + 1 
  WHERE id = v_coupon.id;

  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_user_id, 'bonus', v_bonus_amount, 'approved', 'কুপন বোনাস / Coupon Bonus: ' || v_coupon.code, v_coupon.code);

  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_user_id, 'কুপন বোনাস / Coupon Bonus', '₹' || v_bonus_amount || ' কুপন বোনাস আপনার ওয়ালেটে যোগ হয়েছে।', 'bonus');

  RETURN jsonb_build_object('success', true, 'amount', v_bonus_amount, 'code', v_coupon.code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
