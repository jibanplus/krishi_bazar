-- Referral rewards only ever paid the referrer, and the milestone settings were unused.
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS referred_bonus numeric(14,2) NOT NULL DEFAULT 50;

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
  v_referred_bonus numeric(14,2);
  v_milestone_threshold integer;
  v_milestone_bonus numeric(14,2);
  v_total_referrals integer;
BEGIN
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  ref_code := public.generate_referral_code();
  v_referred_by := NEW.raw_user_meta_data->>'referral_code';

  INSERT INTO public.profiles (id, username, email, referral_code, referred_by, full_name, role)
  VALUES (
    NEW.id, new_username, NEW.email, ref_code, v_referred_by,
    COALESCE(NEW.raw_user_meta_data->>'full_name', new_username),
    CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'user' END
  );

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  IF v_referred_by IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referred_by AND id <> NEW.id LIMIT 1;
  IF v_referrer_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(referral_bonus, 100), COALESCE(referred_bonus, 50),
         COALESCE(milestone_threshold, 0), COALESCE(milestone_bonus, 0)
    INTO v_referral_bonus, v_referred_bonus, v_milestone_threshold, v_milestone_bonus
    FROM public.admin_settings LIMIT 1;

  INSERT INTO public.referrals (referrer_id, referred_id, code, earnings, status)
  VALUES (v_referrer_id, NEW.id, v_referred_by, v_referral_bonus, 'rewarded');

  -- Referrer reward
  UPDATE public.wallets SET balance = balance + v_referral_bonus, referral_income = referral_income + v_referral_bonus
    WHERE user_id = v_referrer_id;
  UPDATE public.profiles SET balance = balance + v_referral_bonus, referral_earnings = referral_earnings + v_referral_bonus,
    total_referrals = total_referrals + 1 WHERE id = v_referrer_id
    RETURNING total_referrals INTO v_total_referrals;

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_referrer_id, 'referral', v_referral_bonus, 'approved', 'রেফারেল বোনাস / Referral Bonus', NEW.id::text);
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_referrer_id, 'রেফারেল বোনাস পেয়েছেন', '₹' || v_referral_bonus || ' রেফারেল বোনাস আপনার ওয়ালেটে যোগ হয়েছে।', 'referral');

  -- Referred user reward - Only in bonus section with 20x wagering
  IF v_referred_bonus > 0 THEN
    UPDATE public.wallets SET 
      bonus_wagering_locked = bonus_wagering_locked + v_referred_bonus,
      wagering_required = wagering_required + (v_referred_bonus * 20)
    WHERE user_id = NEW.id;
    UPDATE public.profiles SET bonus_balance = bonus_balance + v_referred_bonus WHERE id = NEW.id;
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
    VALUES (NEW.id, 'bonus', v_referred_bonus, 'approved', 'রেফারেল জয়েনিং বোনাস / Referral Joining Bonus (20x wagering required)', v_referrer_id::text);
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.id, 'রেফারেল বোনাস পেয়েছেন', '₹' || v_referred_bonus || ' জয়েনিং বোনাস আপনার বোনাস সেকশনে যোগ হয়েছে। 20x ট্রেড সম্পন করতে হবে।', 'bonus');
  END IF;

  -- Milestone reward every Nth referral
  IF v_milestone_threshold > 0 AND v_milestone_bonus > 0 AND v_total_referrals % v_milestone_threshold = 0 THEN
    UPDATE public.wallets SET balance = balance + v_milestone_bonus, referral_income = referral_income + v_milestone_bonus
      WHERE user_id = v_referrer_id;
    UPDATE public.profiles SET balance = balance + v_milestone_bonus, referral_earnings = referral_earnings + v_milestone_bonus
      WHERE id = v_referrer_id;
    INSERT INTO public.transactions (user_id, type, amount, status, description)
    VALUES (v_referrer_id, 'referral', v_milestone_bonus,
      'approved', 'মাইলস্টোন বোনাস / Milestone Bonus (' || v_total_referrals || ' referrals)');
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_referrer_id, 'মাইলস্টোন বোনাস', '₹' || v_milestone_bonus || ' মাইলস্টোন বোনাস পেয়েছেন (' || v_total_referrals || ' রেফারেল)।', 'referral');
  END IF;

  RETURN NEW;
END;
$$;

-- Revoking now also claws back the joining bonus, decrements the count and never drives balances negative.
CREATE OR REPLACE FUNCTION public.admin_revoke_referral(p_referral_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ref record;
  v_referred_bonus numeric(14,2);
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'রেফারেল পাওয়া যায়নি'); END IF;
  IF v_ref.status = 'revoked' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে বাতিল করা হয়েছে'); END IF;

  UPDATE public.wallets SET
    balance = GREATEST(balance - v_ref.earnings, 0),
    referral_income = GREATEST(referral_income - v_ref.earnings, 0)
    WHERE user_id = v_ref.referrer_id;
  UPDATE public.profiles SET
    balance = GREATEST(balance - v_ref.earnings, 0),
    referral_earnings = GREATEST(referral_earnings - v_ref.earnings, 0),
    total_referrals = GREATEST(total_referrals - 1, 0)
    WHERE id = v_ref.referrer_id;

  -- Claw back the joining bonus paid to the referred user, if any.
  SELECT COALESCE(sum(amount), 0) INTO v_referred_bonus FROM public.transactions
    WHERE user_id = v_ref.referred_id AND type = 'referral' AND reference = v_ref.referrer_id::text;
  IF v_referred_bonus > 0 THEN
    UPDATE public.wallets SET
      balance = GREATEST(balance - v_referred_bonus, 0),
      bonus = GREATEST(bonus - v_referred_bonus, 0)
      WHERE user_id = v_ref.referred_id;
    UPDATE public.profiles SET
      balance = GREATEST(balance - v_referred_bonus, 0),
      bonus_balance = GREATEST(bonus_balance - v_referred_bonus, 0)
      WHERE id = v_ref.referred_id;
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
    VALUES (v_ref.referred_id, 'referral_revoke', v_referred_bonus, 'approved',
      'রেফারেল জয়েনিং বোনাস বাতিল / Joining Bonus Revoked: ' || p_reason, p_referral_id::text);
  END IF;

  UPDATE public.referrals SET status = 'revoked' WHERE id = p_referral_id;

  INSERT INTO public.anti_cheat_flags (user_id, flag_type, details, severity, reason)
  VALUES (v_ref.referrer_id, 'referral_abuse', 'রেফারেল রিওয়ার্ড বাতিল: ' || p_reason, 'high', p_reason);

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_ref.referrer_id, 'রেফারেল রিওয়র্ড বাতিল',
    '₹' || v_ref.earnings || ' রেফারেল রিওয়ার্ড বাতিল করা হয়েছে। কারণ: ' || p_reason, 'general');

  INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
  VALUES (v_ref.referrer_id, 'referral_revoke', v_ref.earnings, 'approved',
    'রেফারেল রিওয়ার্ড বাতিল / Referral Reward Revoked: ' || p_reason, p_referral_id::text);

  RETURN jsonb_build_object('success', true, 'message', 'রেফারেল রিওয়ার্ড বাতিল করা হয়েছে',
    'referrer_deducted', v_ref.earnings, 'referred_deducted', v_referred_bonus);
END;
$$;
