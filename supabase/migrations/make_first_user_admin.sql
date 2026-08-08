-- Make first user admin automatically
-- Run this after creating first user
DO $$
BEGIN
  -- Check if any admin exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    -- Make the first user admin
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;
