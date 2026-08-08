-- Fix Daily Spin reward to use user-accessible function
-- Problem: Daily Spin uses admin_adjust_wallet which is admin-only
-- Fix: Create user-accessible credit_spin_reward function

CREATE OR REPLACE FUNCTION public.credit_spin_reward(p_user_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_bonus_amount numeric(14,2) := 0;
BEGIN
  -- Lock wallet row
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Create wallet if not exists
    INSERT INTO wallets (user_id, balance, bonus, referral_income)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;

  -- Check if this is a bonus (spin rewards are treated as bonus)
  IF p_amount > 0 THEN
    v_bonus_amount := p_amount;

    -- Credit to bonus wallet with wagering requirement
    UPDATE wallets
    SET
      bonus = bonus + v_bonus_amount,
      bonus_wagering_locked = bonus_wagering_locked + v_bonus_amount,
      wagering_required = wagering_required + (v_bonus_amount * 20)
    WHERE user_id = p_user_id;

    -- Also add to main balance for immediate use
    UPDATE wallets SET balance = balance + v_bonus_amount WHERE user_id = p_user_id;
    UPDATE profiles SET balance = balance + v_bonus_amount WHERE id = p_user_id;

    -- Insert transaction
    INSERT INTO public.transactions (user_id, type, amount, status, description)
    VALUES (p_user_id, 'bonus', v_bonus_amount, 'approved', 'Daily Spin Reward / দৈনিক স্পিন রিওয়ার্ড');

    -- Insert notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      p_user_id,
      'স্পিন রিওয়ার্ড / Spin Reward',
      '₹' || v_bonus_amount || ' স্পিন রিওয়ার্ড প্রাপ্ত হয়েছে। এটি উত্তোলনে 20x ট্রেড করার পর উইথড্র করা যাবে।',
      'bonus'
    );

    RETURN jsonb_build_object('success', true, 'amount', v_bonus_amount, 'wagering_required', v_bonus_amount * 20);
  END IF;

  RETURN jsonb_build_object('success', true, 'amount', v_bonus_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_spin_reward(uuid, numeric) TO authenticated;
