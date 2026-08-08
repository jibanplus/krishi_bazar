-- Nothing ever wrote to activity_logs, so the profile Activity tab was always empty.
-- Money flows all funnel through public.transactions, KYC through kyc_documents, and
-- profile edits through profiles, so log from triggers instead of every call site.

CREATE OR REPLACE FUNCTION public.log_activity(p_action text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.activity_logs (user_id, action) VALUES (auth.uid(), p_action);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_activity(text) TO authenticated;

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
DROP TRIGGER IF EXISTS trg_log_transaction ON public.transactions;
CREATE TRIGGER trg_log_transaction AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_activity();

CREATE OR REPLACE FUNCTION public.log_kyc_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.user_id, 'KYC ডকুমেন্ট জমা / KYC submitted (' || NEW.doc_type || ')');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_logs (user_id, action)
    VALUES (NEW.user_id, 'KYC স্ট্যাটাস / KYC status: ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_kyc ON public.kyc_documents;
CREATE TRIGGER trg_log_kyc AFTER INSERT OR UPDATE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_kyc_activity();

-- Profile edits only: presence columns and balances change constantly and are not user actions.
CREATE OR REPLACE FUNCTION public.log_profile_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_changed text[] := '{}';
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN v_changed := v_changed || 'নাম'::text; END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN v_changed := v_changed || 'ফোন'::text; END IF;
  IF NEW.address IS DISTINCT FROM OLD.address THEN v_changed := v_changed || 'ঠিকানা'::text; END IF;
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN v_changed := v_changed || 'ছবি'::text; END IF;
  IF array_length(v_changed, 1) IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.activity_logs (user_id, action)
  VALUES (NEW.id, 'প্রোফাইল আপডেট / Profile updated: ' || array_to_string(v_changed, ', '));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_profile ON public.profiles;
CREATE TRIGGER trg_log_profile AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_activity();

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
