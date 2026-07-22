-- Production archive + team hardening

-- Make sure profile preference fields exist everywhere the app expects them.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_to_invites BOOLEAN DEFAULT TRUE;

-- Requests metadata used by the invite workflow.
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS fills_gender_requirement BOOLEAN DEFAULT FALSE;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS target_skill_id UUID REFERENCES public.skills(id);

-- Blocks/reporting support.
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocks_select" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks_insert" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks_update" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks_delete" ON public.user_blocks;
CREATE POLICY "blocks_select" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id OR public.is_admin(auth.uid()));
CREATE POLICY "blocks_insert" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocks_update" ON public.user_blocks
  FOR UPDATE USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocks_delete" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert" ON public.user_reports;
DROP POLICY IF EXISTS "reports_select_admin" ON public.user_reports;
CREATE POLICY "reports_insert" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_admin" ON public.user_reports
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Archive ownership and unique upvotes.
ALTER TABLE public.archive_ppts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.archive_ppts ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.archive_tips ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Allow read access to ppts" ON public.archive_ppts;
DROP POLICY IF EXISTS "Allow submission of ppts" ON public.archive_ppts;
DROP POLICY IF EXISTS "archive_ppts_insert_auth" ON public.archive_ppts;
CREATE POLICY "archive_ppts_read" ON public.archive_ppts
  FOR SELECT USING (true);
CREATE POLICY "archive_ppts_insert_own" ON public.archive_ppts
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "archive_ppts_update_own" ON public.archive_ppts
  FOR UPDATE USING (auth.uid() = author_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE POLICY "archive_ppts_delete_own" ON public.archive_ppts
  FOR DELETE USING (auth.uid() = author_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow read access to tips" ON public.archive_tips;
DROP POLICY IF EXISTS "Allow submission of tips" ON public.archive_tips;
DROP POLICY IF EXISTS "archive_tips_insert_auth" ON public.archive_tips;
CREATE POLICY "archive_tips_read" ON public.archive_tips
  FOR SELECT USING (true);
CREATE POLICY "archive_tips_insert_own" ON public.archive_tips
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "archive_tips_update_own" ON public.archive_tips
  FOR UPDATE USING (auth.uid() = author_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE POLICY "archive_tips_delete_own" ON public.archive_tips
  FOR DELETE USING (auth.uid() = author_id OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.user_upvotes_ppts (
  ppt_id UUID REFERENCES public.archive_ppts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (ppt_id, user_id)
);

ALTER TABLE public.user_upvotes_ppts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppt_upvotes_select" ON public.user_upvotes_ppts
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ppt_upvotes_insert" ON public.user_upvotes_ppts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppt_upvotes_update" ON public.user_upvotes_ppts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppt_upvotes_delete" ON public.user_upvotes_ppts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_upvotes_tips (
  tip_id UUID REFERENCES public.archive_tips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (tip_id, user_id)
);

ALTER TABLE public.user_upvotes_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tip_upvotes_select" ON public.user_upvotes_tips
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tip_upvotes_insert" ON public.user_upvotes_tips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tip_upvotes_update" ON public.user_upvotes_tips
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tip_upvotes_delete" ON public.user_upvotes_tips
  FOR DELETE USING (auth.uid() = user_id);

-- Make sure the new archive bucket exists for pitch deck uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('archive_ppts', 'archive_ppts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "archive_ppts_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "archive_ppts_read_public" ON storage.objects;
DROP POLICY IF EXISTS "archive_ppts_delete_own" ON storage.objects;
CREATE POLICY "archive_ppts_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'archive_ppts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "archive_ppts_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'archive_ppts');
CREATE POLICY "archive_ppts_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'archive_ppts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
