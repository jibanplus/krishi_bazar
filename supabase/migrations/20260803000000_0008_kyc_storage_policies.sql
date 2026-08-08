-- KYC bucket had no storage policies, so every upload was rejected by RLS.
DROP POLICY IF EXISTS "kyc_read_own_or_admin" ON storage.objects;
CREATE POLICY "kyc_read_own_or_admin" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'kyc'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "kyc_write_own" ON storage.objects;
CREATE POLICY "kyc_write_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc_update_own" ON storage.objects;
CREATE POLICY "kyc_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kyc_delete_own" ON storage.objects;
CREATE POLICY "kyc_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatar_delete_auth" ON storage.objects;
CREATE POLICY "avatar_delete_auth" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars');
