-- Drop all my earlier wrong tables to reset the schema.
-- These are from my incorrect first attempt and don't match the actual app.
DROP TABLE IF EXISTS public.referral_abuse CASCADE;
DROP TABLE IF EXISTS public.login_history CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;
DROP TABLE IF EXISTS public.withdrawals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Drop the functions I created
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.credit_signup_bonus(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.record_login() CASCADE;
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric,text,text,text,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.process_withdrawal(uuid,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.place_trade(uuid,text,numeric) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_settings(boolean,numeric,numeric,text,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_banner(text,text,text,integer,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_banner(uuid,text,text,text,integer,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_banner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_announcement(text,text,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_announcement(uuid,text,text,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_announcement(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_product(text,text,text,text,numeric,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_product(uuid,text,text,text,text,numeric,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_product(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_ban_user(uuid,boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_revoke_referral(uuid,text) CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
