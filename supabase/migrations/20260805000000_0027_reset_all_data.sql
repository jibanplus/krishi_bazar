-- WARNING: This function will DELETE ALL user data except admin
-- Use with extreme caution in production!

CREATE OR REPLACE FUNCTION public.admin_reset_all_data()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RETURN jsonb_build_object('error', 'অনুমতি নেই / Permission denied'); 
  END IF;

  -- Delete all transactions
  DELETE FROM public.transactions;
  
  -- Delete all notifications
  DELETE FROM public.notifications;
  
  -- Delete all deposits
  DELETE FROM public.deposits;
  
  -- Delete all withdrawals
  DELETE FROM public.withdrawals;
  
  -- Delete all referrals
  DELETE FROM public.referrals;
  
  -- Delete all kyc documents
  DELETE FROM public.kyc_documents;
  
  -- Delete all activity logs
  DELETE FROM public.activity_logs;
  
  -- Delete all support conversations
  DELETE FROM public.support_conversations;
  
  -- Delete all coupon usages
  DELETE FROM public.coupon_usages;
  
  -- Reset all wallets (keep admin wallets)
  UPDATE public.wallets SET 
    balance = 0,
    bonus = 0,
    bonus_wagering_locked = 0,
    wagering_required = 0,
    wagering_completed = 0,
    referral_income = 0,
    total_withdraw = 0
  WHERE user_id IN (SELECT id FROM public.profiles WHERE role = 'user');
  
  -- Reset all profiles (keep admin profile)
  UPDATE public.profiles SET 
    balance = 0,
    bonus_balance = 0,
    referral_earnings = 0,
    total_referrals = 0,
    signup_bonus_credited = false
  WHERE role = 'user';
  
  -- Delete all user holdings
  DELETE FROM public.holdings;
  
  -- Delete all asset holdings
  DELETE FROM public.asset_holdings;
  
  RETURN jsonb_build_object('success', true, 'message', 'সব ইউজার ডেটা রিসেট করা হয়েছে / All user data has been reset');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_all_data() TO authenticated;
