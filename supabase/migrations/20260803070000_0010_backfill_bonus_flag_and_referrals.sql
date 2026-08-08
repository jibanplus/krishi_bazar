-- 0009 added signup_bonus_credited/total_referrals with DEFAULT false/0 without backfilling them.
-- credit_signup_bonus() only guards on signup_bonus_credited, so users who were already
-- credited (wallets.bonus > 0) would be paid the welcome bonus a second time on next login.
UPDATE public.profiles p SET signup_bonus_credited = true
FROM public.wallets w
WHERE w.user_id = p.id AND w.bonus > 0 AND p.signup_bonus_credited = false;

-- Referral counts already exist as rows in public.referrals.
UPDATE public.profiles p SET total_referrals = r.cnt
FROM (
  SELECT referrer_id, count(*) AS cnt FROM public.referrals WHERE status <> 'revoked' GROUP BY referrer_id
) r
WHERE r.referrer_id = p.id AND p.total_referrals = 0;
