-- Supabase Storage Row-Level Security Policies for Production

-- Ensure Storage RLS is enabled (default in newer versions, but good practice)
-- Supabase handles buckets via storage.buckets and files via storage.objects

-- 1. Resumes Storage Policies
-- Storage bucket 'resumes' must be created as a private bucket in the Supabase Dashboard.

CREATE POLICY "Allow authenticated users to upload own resume" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Allow uploader and admins to view resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (
        -- Faculty/Admin role check by email
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND kiet_email = 'amit.sharma@kiet.edu'
      )
    )
  );

CREATE POLICY "Allow uploader to delete own resume" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );


-- 2. Finalist Presentation Decks (PPTs) Storage Policies
-- Storage bucket 'ppts' should be read-only for public, and authenticated upload-only.

CREATE POLICY "Allow public read access to PPT decks" ON storage.objects
  FOR SELECT USING (bucket_id = 'ppts');

CREATE POLICY "Allow authenticated students to submit PPT decks" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ppts');
