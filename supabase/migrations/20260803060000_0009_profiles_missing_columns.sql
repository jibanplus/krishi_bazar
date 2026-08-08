-- profiles predates the 0005 schema, and CREATE TABLE IF NOT EXISTS did not add the
-- extended columns, so buy/sell_commodity failed with: record "v_profile" has no field "is_blocked".
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_balance numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_earnings numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_referrals integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_bonus_credited boolean NOT NULL DEFAULT false;

-- Backfill from wallets, which held the real balances until now.
UPDATE public.profiles p SET
  balance = w.balance,
  bonus_balance = w.bonus,
  referral_earnings = w.referral_income
FROM public.wallets w
WHERE w.user_id = p.id AND p.balance = 0 AND p.bonus_balance = 0 AND p.referral_earnings = 0;
