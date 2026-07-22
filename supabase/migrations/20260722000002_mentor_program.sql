-- Mentor program for faculty-guided SIH teams

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT,
  expertise TEXT[],
  bio TEXT,
  available_hours TEXT,
  office_hours TEXT,
  meeting_link TEXT,
  max_teams INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_profiles_read" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_insert_own" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_update_own" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_delete_admin" ON public.mentor_profiles;
CREATE POLICY "mentor_profiles_read" ON public.mentor_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mentor_profiles_insert_own" ON public.mentor_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('faculty', 'admin')
      )
      OR public.is_admin(auth.uid())
    )
  );
CREATE POLICY "mentor_profiles_update_own" ON public.mentor_profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "mentor_profiles_delete_admin" ON public.mentor_profiles
  FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.mentor_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_requests_read" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_insert" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_update" ON public.mentor_requests;
CREATE POLICY "mentor_requests_read" ON public.mentor_requests
  FOR SELECT USING (
    auth.uid() = requester_id
    OR auth.uid() = mentor_id
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id)
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "mentor_requests_insert" ON public.mentor_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
    AND auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id)
  );
CREATE POLICY "mentor_requests_update" ON public.mentor_requests
  FOR UPDATE USING (
    auth.uid() = mentor_id
    OR auth.uid() = requester_id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = mentor_id
    OR auth.uid() = requester_id
    OR public.is_admin(auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.team_mentors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_from_request_id UUID REFERENCES public.mentor_requests(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.team_mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_mentors_read" ON public.team_mentors;
DROP POLICY IF EXISTS "team_mentors_insert" ON public.team_mentors;
DROP POLICY IF EXISTS "team_mentors_update" ON public.team_mentors;
DROP POLICY IF EXISTS "team_mentors_delete" ON public.team_mentors;
CREATE POLICY "team_mentors_read" ON public.team_mentors
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.team_members WHERE team_id = team_mentors.team_id)
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_mentors.team_id)
    OR auth.uid() = mentor_id
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "team_mentors_insert" ON public.team_mentors
  FOR INSERT WITH CHECK (
    auth.uid() = mentor_id
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "team_mentors_update" ON public.team_mentors
  FOR UPDATE USING (
    auth.uid() = mentor_id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = mentor_id
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "team_mentors_delete" ON public.team_mentors
  FOR DELETE USING (
    auth.uid() = mentor_id
    OR public.is_admin(auth.uid())
  );

CREATE UNIQUE INDEX IF NOT EXISTS team_mentors_one_active_per_team
  ON public.team_mentors (team_id)
  WHERE active = true;
