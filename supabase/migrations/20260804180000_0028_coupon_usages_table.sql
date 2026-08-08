-- Create coupon_usages table to track which users have used which coupons
-- Migration: 20260804180000_0028_coupon_usages_table.sql
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  bonus_amount numeric(14,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, coupon_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON public.coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);

-- Enable RLS
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own coupon usages
CREATE POLICY "Users can view own coupon usages"
  ON public.coupon_usages FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert coupon usages (via function)
CREATE POLICY "Users can insert coupon usages"
  ON public.coupon_usages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all coupon usages
CREATE POLICY "Admins can view all coupon usages"
  ON public.coupon_usages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
