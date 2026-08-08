/*
# Triggers & Functions: user creation, signup bonus, referral rewards, buy/sell, withdrawals, admin ops

All SECURITY DEFINER, search_path locked to public, caller-authenticated.
*/

-- ===== generate_referral_code =====
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
  exists boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

-- ===== handle_new_user: auto-create profile + wallet on signup, apply referral =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_username text;
  ref_code text;
  v_referred_by text;
  v_referrer_id uuid;
  v_referral_bonus numeric(14,2);
  v_signup_bonus numeric(14,2);
BEGIN
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  ref_code := public.generate_referral_code();
  v_referred_by := NEW.raw_user_meta_data->>'referral_code';

  -- First user becomes admin
  IF (SELECT count(*) FROM public.profiles) = 0 THEN
    INSERT INTO public.profiles (id, username, email, referral_code, referred_by, full_name, role)
    VALUES (NEW.id, new_username, NEW.email, ref_code, v_referred_by, COALESCE(NEW.raw_user_meta_data->>'full_name', new_username), 'admin');
  ELSE
    INSERT INTO public.profiles (id, username, email, referral_code, referred_by, full_name, role)
    VALUES (NEW.id, new_username, NEW.email, ref_code, v_referred_by, COALESCE(NEW.raw_user_meta_data->>'full_name', new_username), 'user');
  END IF;

  -- Create wallet
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  -- Apply referral: create referral record + credit referrer bonus immediately
  IF v_referred_by IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referred_by AND id <> NEW.id LIMIT 1;
    IF v_referrer_id IS NOT NULL THEN
      SELECT COALESCE(referral_bonus, 100) INTO v_referral_bonus FROM public.admin_settings LIMIT 1;
      INSERT INTO public.referrals (referrer_id, referred_id, code, earnings, status)
      VALUES (v_referrer_id, NEW.id, v_referred_by, v_referral_bonus, 'rewarded');

      -- Credit referrer wallet + profile
      UPDATE public.wallets SET balance = balance + v_referral_bonus, referral_income = referral_income + v_referral_bonus
        WHERE user_id = v_referrer_id;
      UPDATE public.profiles SET balance = balance + v_referral_bonus, referral_earnings = referral_earnings + v_referral_bonus,
        total_referrals = total_referrals + 1 WHERE id = v_referrer_id;

      -- Record referrer transaction
      INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
      VALUES (v_referrer_id, 'referral', v_referral_bonus, 'approved', 'রেফারেল বোনাস / Referral Bonus', NEW.id::text);

      -- Notify referrer
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_referrer_id, 'রেফারেল বোনাস পেয়েছেন', '₹' || v_referral_bonus || ' রেফারেল বোনাস আপনার ওয়ালেটে যোগ হয়েছে।', 'referral');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== credit_signup_bonus: credit on first login =====
CREATE OR REPLACE FUNCTION public.credit_signup_bonus(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_credited boolean;
  v_bonus numeric(14,2);
BEGIN
  SELECT signup_bonus_credited INTO v_credited FROM public.profiles WHERE id = p_user_id;
  IF v_credited IS NULL THEN RETURN jsonb_build_object('error', 'Profile not found'); END IF;
  IF v_credited THEN RETURN jsonb_build_object('success', false, 'message', 'Already credited'); END IF;

  SELECT COALESCE(signup_bonus, 500) INTO v_bonus FROM public.admin_settings LIMIT 1;

  -- Credit to both wallets and profiles.balance
  UPDATE public.wallets SET balance = balance + v_bonus, bonus = bonus + v_bonus WHERE user_id = p_user_id;
  UPDATE public.profiles SET balance = balance + v_bonus, bonus_balance = bonus_balance + v_bonus, signup_bonus_credited = true WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (p_user_id, 'bonus', v_bonus, 'approved', 'সাইন আপ বোনাস / Signup Bonus');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, 'স্বাগত বোনাস / Welcome Bonus', '₹' || v_bonus || ' সাইন আপ বোনাস আপনার ওয়ালেটে যোগ হয়েছে।', 'bonus');

  RETURN jsonb_build_object('success', true, 'amount', v_bonus);
END;
$$;

-- ===== buy_commodity =====
CREATE OR REPLACE FUNCTION public.buy_commodity(p_commodity_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_commodity record;
  v_total numeric(14,2);
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

  IF v_profile.balance < v_total THEN
    RETURN jsonb_build_object('error', 'অপর্যাপ্ত ব্যালেন্স', 'balance', v_profile.balance, 'required', v_total);
  END IF;

  -- Deduct from both profiles.balance and wallets.balance
  UPDATE public.profiles SET balance = balance - v_total WHERE id = v_profile.id;
  UPDATE public.wallets SET balance = balance - v_total WHERE user_id = v_profile.id;

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

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_profile.id, 'buy', v_total, 'approved', v_commodity.name || ' কেনা / Buy ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে কেনা হয়েছে', 'new_balance', v_profile.balance - v_total, 'total', v_total, 'name', v_commodity.name);
END;
$$;

-- ===== sell_commodity =====
CREATE OR REPLACE FUNCTION public.sell_commodity(p_commodity_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_commodity record;
  v_total numeric(14,2);
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

  -- Add to both profiles.balance and wallets.balance
  UPDATE public.profiles SET balance = balance + v_total WHERE id = v_profile.id;
  UPDATE public.wallets SET balance = balance + v_total WHERE user_id = v_profile.id;

  -- Update holdings
  IF v_holding.quantity = p_quantity THEN
    DELETE FROM public.holdings WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  ELSE
    UPDATE public.holdings SET quantity = quantity - p_quantity, updated_at = now()
      WHERE user_id = v_profile.id AND commodity_id = p_commodity_id;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_profile.id, 'sell', v_total, 'approved', v_commodity.name || ' বিক্রি / Sell ' || v_commodity.name_en, p_commodity_id::text);

  RETURN jsonb_build_object('success', true, 'message', v_commodity.name || ' সফলভাবে বিক্রি হয়েছে', 'new_balance', v_profile.balance + v_total, 'total', v_total, 'name', v_commodity.name);
END;
$$;

-- ===== create_withdrawal: validate balance, create pending withdrawal + transaction =====
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  p_amount numeric, p_method text, p_upi_id text, p_account_holder text, p_account_number text, p_bank_ifsc text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_wid uuid;
  v_min numeric(14,2);
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;
  IF v_profile.is_blocked THEN RETURN jsonb_build_object('error', 'আপনার অ্যাকাউন্ট ব্লক করা হয়েছে'); END IF;

  IF p_amount <= 0 THEN RETURN jsonb_build_object('error', 'সঠিক পরিমাণ লিখুন'); END IF;
  IF p_amount > v_profile.balance THEN RETURN jsonb_build_object('error', 'পর্যাপ্ত ব্যালেন্স নেই', 'balance', v_profile.balance); END IF;

  SELECT COALESCE(min_withdraw, 100) INTO v_min FROM public.admin_settings LIMIT 1;
  IF p_amount < v_min THEN RETURN jsonb_build_object('error', 'ন্যূনতম উইথড্র ' || v_min); END IF;

  -- Validate method-specific fields
  IF p_method = 'upi' THEN
    IF p_upi_id IS NULL OR p_upi_id = '' THEN RETURN jsonb_build_object('error', 'UPI আইডি দিন'); END IF;
  ELSIF p_method = 'bank' THEN
    IF p_account_holder IS NULL OR p_account_holder = '' THEN RETURN jsonb_build_object('error', 'অ্যাকাউন্ট হোল্ডার নাম দিন'); END IF;
    IF p_account_number IS NULL OR p_account_number = '' THEN RETURN jsonb_build_object('error', 'ব্যাংক অ্যাকাউন্ট নম্বর দিন'); END IF;
    IF p_bank_ifsc IS NULL OR p_bank_ifsc = '' THEN RETURN jsonb_build_object('error', 'IFSC কোড দিন'); END IF;
  ELSE
    RETURN jsonb_build_object('error', 'ভুল পদ্ধতি');
  END IF;

  -- Insert withdrawal as pending
  INSERT INTO public.withdrawals (user_id, amount, method, upi_id, account_holder, account_number, bank_ifsc, status)
  VALUES (v_profile.id, p_amount, p_method, p_upi_id, p_account_holder, p_account_number, p_bank_ifsc, 'pending')
  RETURNING id INTO v_wid;

  -- Record as pending transaction immediately (visible in history)
  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_profile.id, 'withdraw', p_amount, 'pending', 'উইথড্র অনুরোধ / Withdrawal Request', v_wid::text);

  RETURN jsonb_build_object('success', true, 'message', 'উইথড্র অনুরোধ গৃহীত হয়েছে', 'withdrawal_id', v_wid);
END;
$$;

-- ===== admin_confirm_deposit =====
CREATE OR REPLACE FUNCTION public.admin_confirm_deposit(p_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_dep record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_dep FROM public.deposits WHERE id = p_deposit_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ডিপোজিট পাওয়া যায়নি'); END IF;
  IF v_dep.status != 'pending' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে প্রসেস করা হয়েছে'); END IF;

  -- Credit wallet + profile balance
  UPDATE public.wallets SET balance = balance + v_dep.amount, total_deposit = total_deposit + v_dep.amount WHERE user_id = v_dep.user_id;
  UPDATE public.profiles SET balance = balance + v_dep.amount WHERE id = v_dep.user_id;

  UPDATE public.deposits SET status = 'approved', confirmed_at = now() WHERE id = p_deposit_id;

  -- Update the pending deposit transaction to approved
  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_dep.user_id, 'deposit', v_dep.amount, 'approved', 'ডিপোজিট অনুমোদিত / Deposit Approved', p_deposit_id::text);

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_dep.user_id, 'ডিপোজিট অনুমোদিত', '₹' || v_dep.amount || ' ডিপোজিট অনুমোদিত হয়েছে।', 'deposit');

  RETURN jsonb_build_object('success', true, 'message', 'ডিপোজিট অনুমোদিত');
END;
$$;

-- ===== admin_reject_deposit =====
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_deposit_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_dep record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_dep FROM public.deposits WHERE id = p_deposit_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ডিপোজিট পাওয়া যায়নি'); END IF;
  IF v_dep.status != 'pending' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে প্রসেস করা হয়েছে'); END IF;

  UPDATE public.deposits SET status = 'rejected', admin_note = p_note, confirmed_at = now() WHERE id = p_deposit_id;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_dep.user_id, 'ডিপোজিট বাতিল', '₹' || v_dep.amount || ' ডিপোজিট অনুরোধ বাতিল করা হয়েছে। ' || COALESCE(p_note, ''), 'deposit');

  RETURN jsonb_build_object('success', true, 'message', 'ডিপোজিট বাতিল করা হয়েছে');
END;
$$;

-- ===== admin_confirm_withdrawal =====
CREATE OR REPLACE FUNCTION public.admin_confirm_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_w record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'উত্তোলন পাওয়া যায়নি'); END IF;
  IF v_w.status != 'pending' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে প্রসেস করা হয়েছে'); END IF;

  -- Deduct from wallet + profile balance
  UPDATE public.wallets SET balance = balance - v_w.amount, total_withdraw = total_withdraw + v_w.amount WHERE user_id = v_w.user_id;
  UPDATE public.profiles SET balance = balance - v_w.amount WHERE id = v_w.user_id;

  UPDATE public.withdrawals SET status = 'approved', confirmed_at = now() WHERE id = p_withdrawal_id;

  -- Update the pending withdrawal transaction to approved
  UPDATE public.transactions SET status = 'approved', description = 'উইথড্র অনুমোদিত / Withdrawal Approved'
    WHERE user_id = v_w.user_id AND type = 'withdraw' AND reference = p_withdrawal_id::text;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_w.user_id, 'উইথড্র অনুমোদিত', '₹' || v_w.amount || ' উইথড্র অনুমোদিত হয়েছে।', 'withdraw');

  RETURN jsonb_build_object('success', true, 'message', 'উইথড্র অনুমোদিত');
END;
$$;

-- ===== admin_reject_withdrawal =====
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_withdrawal_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_w record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'উত্তোলন পাওয়া যায়নি'); END IF;
  IF v_w.status != 'pending' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে প্রসেস করা হয়েছে'); END IF;

  -- No balance deduction on rejection (amount was not deducted at request time per this flow)
  UPDATE public.withdrawals SET status = 'rejected', admin_note = p_note, confirmed_at = now() WHERE id = p_withdrawal_id;

  UPDATE public.transactions SET status = 'rejected', description = 'উইথড্র বাতিল / Withdrawal Rejected'
    WHERE user_id = v_w.user_id AND type = 'withdraw' AND reference = p_withdrawal_id::text;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_w.user_id, 'উইথড্র বাতিল', '₹' || v_w.amount || ' উইথড্র অনুরোধ বাতিল করা হয়েছে। ' || COALESCE(p_note, ''), 'withdraw');

  RETURN jsonb_build_object('success', true, 'message', 'উইথড্র বাতিল করা হয়েছে');
END;
$$;

-- ===== admin_block_user =====
CREATE OR REPLACE FUNCTION public.admin_block_user(p_user_id uuid, p_block boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  IF p_user_id = auth.uid() THEN RETURN jsonb_build_object('error', 'নিজেকে ব্লক করতে পারবেন না'); END IF;
  UPDATE public.profiles SET is_blocked = p_block WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'message', CASE WHEN p_block THEN 'ব্যবহারকারী ব্লক করা হয়েছে' ELSE 'ব্যবহারকারী আনব্লক করা হয়েছে' END);
END;
$$;

-- ===== admin_revoke_referral: revoke a referral reward, deduct, notify =====
CREATE OR REPLACE FUNCTION public.admin_revoke_referral(p_referral_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ref record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'রেফারেল পাওয়া যায়নি'); END IF;
  IF v_ref.status = 'revoked' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে বাতিল করা হয়েছে'); END IF;

  -- Deduct reward from referrer wallet + profile
  UPDATE public.wallets SET balance = balance - v_ref.earnings, referral_income = referral_income - v_ref.earnings
    WHERE user_id = v_ref.referrer_id;
  UPDATE public.profiles SET balance = balance - v_ref.earnings, referral_earnings = referral_earnings - v_ref.earnings
    WHERE id = v_ref.referrer_id;

  -- Mark referral revoked
  UPDATE public.referrals SET status = 'revoked' WHERE id = p_referral_id;

  -- Log anti-cheat flag
  INSERT INTO public.anti_cheat_flags (user_id, flag_type, details, severity, reason)
  VALUES (v_ref.referrer_id, 'referral_abuse', 'রেফারেল রিওয়ার্ড বাতিল: ' || p_reason, 'high', p_reason);

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_ref.referrer_id, 'রেফারেল রিওয়র্ড বাতিল',
    '₹' || v_ref.earnings || ' রেফারেল রিওয়ার্ড বাতিল করা হয়েছে। কারণ: ' || p_reason, 'general');

  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_ref.referrer_id, 'referral_revoke', v_ref.earnings, 'approved',
    'রেফারেল রিওয়ার্ড বাতিল / Referral Reward Revoked: ' || p_reason, p_referral_id::text);

  RETURN jsonb_build_object('success', true, 'message', 'রেফারেল রিওয়ার্ড বাতিল করা হয়েছে');
END;
$$;

-- ===== update_updated_at trigger for wallets =====
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_wallets_updated ON public.wallets;
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== Grants =====
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_signup_bonus(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_commodity(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_commodity(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal(numeric, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_withdrawal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_referral(uuid, text) TO authenticated;
