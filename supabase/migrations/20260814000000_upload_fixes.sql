-- Fixes for production upload flows.

-- The Hall of Fame feed orders by created_at. Older archive tables did not
-- have this column, which made every feed query fail and hid uploaded decks.
ALTER TABLE public.archive_ppts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE
  DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

ALTER TABLE public.archive_tips
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE
  DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Resume uploads are stored under {user_id}/... and the bucket is private.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "resumes_upload_own" ON storage.objects;
CREATE POLICY "resumes_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
