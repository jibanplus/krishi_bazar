-- Fix double transaction issue (pending + approved)
-- Problem: Deposit page creates pending transaction, then admin_approve_deposit inserts another transaction
-- This creates 2 transactions for 1 deposit, causing confusion
-- Fix: Update existing pending transaction instead of inserting new one

-- Fix admin_approve_deposit to update existing transaction
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid)
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

  -- Update the existing pending deposit transaction to approved
  UPDATE public.transactions
  SET status = 'approved',
      description = 'ডিপোজিট অনুমোদিত / Deposit Approved'
  WHERE user_id = v_dep.user_id
    AND type = 'deposit'
    AND status = 'pending'
    AND reference = p_deposit_id::text;

  -- If no pending transaction found (edge case), insert one
  IF NOT FOUND THEN
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
    VALUES (v_dep.user_id, 'deposit', v_dep.amount, 'approved', 'ডিপোজিট অনুমোদিত / Deposit Approved', p_deposit_id::text);
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_dep.user_id, 'ডিপোজিট অনুমোদিত', '₹' || v_dep.amount || ' ডিপোজিট অনুমোদিত হয়েছে।', 'deposit');

  RETURN jsonb_build_object('success', true, 'message', 'ডিপোজিট অনুমোদিত');
END;
$$;

-- Fix admin_reject_deposit to update existing transaction
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

  -- Update the existing pending deposit transaction to rejected
  UPDATE public.transactions
  SET status = 'rejected',
      description = 'ডিপোজিট বাতিল / Deposit Rejected - ' || COALESCE(p_note, '')
  WHERE user_id = v_dep.user_id
    AND type = 'deposit'
    AND status = 'pending'
    AND reference = p_deposit_id::text;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_dep.user_id, 'ডিপোজিট বাতিল', '₹' || v_dep.amount || ' ডিপোজিট অনুরোধ বাতিল করা হয়েছে। ' || COALESCE(p_note, ''), 'deposit');

  RETURN jsonb_build_object('success', true, 'message', 'ডিপোজিট বাতিল করা হয়েছে');
END;
$$;

-- Fix admin_confirm_withdrawal to update existing transaction
CREATE OR REPLACE FUNCTION public.admin_confirm_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_w record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'উইথড্র পাওয়া যায়নি'); END IF;
  IF v_w.status != 'pending' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে প্রসেস করা হয়েছে'); END IF;

  UPDATE public.withdrawals SET status = 'approved', confirmed_at = now() WHERE id = p_withdrawal_id;

  -- Update the existing pending withdrawal transaction to approved
  UPDATE public.transactions
  SET status = 'approved',
      description = 'উইথড্র অনুমোদিত / Withdrawal Approved'
  WHERE user_id = v_w.user_id
    AND type = 'withdraw'
    AND status = 'pending'
    AND reference = p_withdrawal_id::text;

  -- If no pending transaction found (edge case), insert one
  IF NOT FOUND THEN
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference)
    VALUES (v_w.user_id, 'withdraw', v_w.amount, 'approved', 'উইথড্র অনুমোদিত / Withdrawal Approved', p_withdrawal_id::text);
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_w.user_id, 'উইথড্র অনুমোদিত', '₹' || v_w.amount || ' উইথড্র অনুমোদিত হয়েছে।', 'withdraw');

  RETURN jsonb_build_object('success', true, 'message', 'উইথড্র অনুমোদিত');
END;
$$;

-- Fix admin_reject_withdrawal to update existing transaction
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_withdrawal_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_w record;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'উইথড্র পাওয়া যায়নি'); END IF;
  IF v_w.status != 'pending' THEN RETURN jsonb_build_object('error', 'ইতিমধ্যে প্রসেস করা হয়েছে'); END IF;

  -- Refund amount back to wallet
  UPDATE public.wallets SET balance = balance + v_w.amount WHERE user_id = v_w.user_id;
  UPDATE public.profiles SET balance = balance + v_w.amount WHERE id = v_w.user_id;

  UPDATE public.withdrawals SET status = 'rejected', admin_note = p_note, confirmed_at = now() WHERE id = p_withdrawal_id;

  -- Update the existing pending withdrawal transaction to rejected
  UPDATE public.transactions
  SET status = 'rejected',
      description = 'উইথড্র বাতিল / Withdrawal Rejected - ' || COALESCE(p_note, '')
  WHERE user_id = v_w.user_id
    AND type = 'withdraw'
    AND status = 'pending'
    AND reference = p_withdrawal_id::text;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_w.user_id, 'উইথড্র বাতিল', '₹' || v_w.amount || ' উইথড্র অনুরোধ বাতিল করা হয়েছে। ' || COALESCE(p_note, ''), 'withdraw');

  RETURN jsonb_build_object('success', true, 'message', 'উইথড্র বাতিল করা হয়েছে');
END;
$$;
