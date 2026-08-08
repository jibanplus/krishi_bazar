-- Admins had no way to correct a balance, and products could only take an image URL.

CREATE TABLE IF NOT EXISTS public.wallet_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  reason text NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_adj_user ON public.wallet_adjustments(user_id, created_at DESC);
ALTER TABLE public.wallet_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_adj_select_own_or_admin" ON public.wallet_adjustments;
CREATE POLICY "wallet_adj_select_own_or_admin" ON public.wallet_adjustments FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(p_user_id uuid, p_amount numeric, p_direction text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_delta numeric(14,2);
  v_balance numeric(14,2);
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'অনুমতি নেই'); END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('error', 'সঠিক পরিমাণ লিখুন'); END IF;
  IF p_direction NOT IN ('credit', 'debit') THEN RETURN jsonb_build_object('error', 'ভুল ধরন'); END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RETURN jsonb_build_object('error', 'কারণ লিখুন'); END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('error', 'ব্যবহারকারী পাওয়া যায়নি'); END IF;

  v_delta := CASE WHEN p_direction = 'credit' THEN p_amount ELSE -p_amount END;
  IF v_balance + v_delta < 0 THEN
    RETURN jsonb_build_object('error', 'পর্যাপ্ত ব্যালেন্স নেই', 'balance', v_balance);
  END IF;

  UPDATE public.profiles SET balance = balance + v_delta WHERE id = p_user_id RETURNING balance INTO v_balance;
  UPDATE public.wallets SET balance = balance + v_delta WHERE user_id = p_user_id;

  INSERT INTO public.wallet_adjustments (user_id, admin_id, amount, direction, reason, balance_after)
  VALUES (p_user_id, auth.uid(), p_amount, p_direction, btrim(p_reason), v_balance);

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (p_user_id, 'admin_' || p_direction, p_amount, 'approved',
    CASE WHEN p_direction = 'credit' THEN 'অ্যাডমিন ক্রেডিট / Admin Credit: ' ELSE 'অ্যাডমিন ডেবিট / Admin Debit: ' END || btrim(p_reason));

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id,
    CASE WHEN p_direction = 'credit' THEN 'ওয়ালেটে টাকা যোগ হয়েছে' ELSE 'ওয়ালেট থেকে টাকা কাটা হয়েছে' END,
    '₹' || p_amount || ' — ' || btrim(p_reason), 'general');

  RETURN jsonb_build_object('success', true, 'balance', v_balance);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text, text) TO authenticated;

-- Product image uploads: public read, admin-only write.
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "product_read_public" ON storage.objects;
CREATE POLICY "product_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'products');
DROP POLICY IF EXISTS "product_write_admin" ON storage.objects;
CREATE POLICY "product_write_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'products' AND public.is_admin());
DROP POLICY IF EXISTS "product_update_admin" ON storage.objects;
CREATE POLICY "product_update_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'products' AND public.is_admin())
  WITH CHECK (bucket_id = 'products' AND public.is_admin());
DROP POLICY IF EXISTS "product_delete_admin" ON storage.objects;
CREATE POLICY "product_delete_admin" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'products' AND public.is_admin());
