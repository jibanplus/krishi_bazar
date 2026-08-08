-- Enhanced activity logging for all actions

-- Log deposit and withdrawal activities
CREATE OR REPLACE FUNCTION public.log_deposit_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.user_id, 'ডিপোজিট অনুরোধ / Deposit Request — ₹' || NEW.amount || ' (UTR: ' || NEW.utr || ')');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.user_id, 'ডিপোজিট স্ট্যাটাস / Deposit Status: ' || NEW.status || ' — ₹' || NEW.amount);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_deposit ON public.deposits;
CREATE TRIGGER trg_log_deposit AFTER INSERT OR UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.log_deposit_activity();

CREATE OR REPLACE FUNCTION public.log_withdrawal_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.user_id, 'উইথড্র অনুরোধ / Withdrawal Request — ₹' || NEW.amount || ' (' || NEW.method || ')');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.user_id, 'উইথড্র স্ট্যাটাস / Withdrawal Status: ' || NEW.status || ' — ₹' || NEW.amount);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_log_withdrawal AFTER INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.log_withdrawal_activity();

-- Log referral activities
CREATE OR REPLACE FUNCTION public.log_referral_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.referrer_id, 'রেফারেল সফল / Referral Successful — কোড: ' || NEW.code || ' — ₹' || NEW.earnings);
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'revoked' THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.referrer_id, 'রেফারেল বাতিল / Referral Revoked — কোড: ' || NEW.code);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_referral ON public.referrals;
CREATE TRIGGER trg_log_referral AFTER INSERT OR UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.log_referral_activity();

-- Update transaction logging to include admin actions
CREATE OR REPLACE FUNCTION public.log_transaction_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  v_label := CASE NEW.type
    WHEN 'buy' THEN 'পণ্য কেনা / Buy'
    WHEN 'sell' THEN 'পণ্য বিক্রি / Sell'
    WHEN 'deposit' THEN 'ডিপোজিট অনুরোধ / Deposit'
    WHEN 'withdraw' THEN 'উইথড্র অনুরোধ / Withdrawal'
    WHEN 'bonus' THEN 'বোনাস / Bonus'
    WHEN 'referral' THEN 'রেফারেল আয় / Referral Income'
    WHEN 'admin_credit' THEN 'অ্যাডমিন ক্রেডিট / Admin Credit'
    WHEN 'admin_debit' THEN 'অ্যাডমিন ডেবিট / Admin Debit'
    WHEN 'referral_revoke' THEN 'রেফারেল বাতিল / Referral Revoke'
    ELSE NEW.type
  END;
  INSERT INTO public.activity_logs (user_id, action)
  VALUES (NEW.user_id, v_label || ' — ₹' || NEW.amount || COALESCE(' (' || NEW.description || ')', ''));
  RETURN NEW;
END;
$$;