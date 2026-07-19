-- Production hardening: roles, skill seeds, integrity constraints, RLS, triggers

-- ── Roles ────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'faculty', 'admin'));

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('admin', 'faculty')
  );
$$;

-- ── Skill catalog seed ───────────────────────────────────────────────────────
INSERT INTO public.skills (name, category) VALUES
  ('React', 'Frontend'),
  ('Next.js', 'Frontend'),
  ('TypeScript', 'Frontend'),
  ('Tailwind CSS', 'Frontend'),
  ('Vue.js', 'Frontend'),
  ('Node.js', 'Backend'),
  ('Express', 'Backend'),
  ('Python', 'Backend'),
  ('Django', 'Backend'),
  ('FastAPI', 'Backend'),
  ('Java', 'Backend'),
  ('PyTorch', 'ML'),
  ('TensorFlow', 'ML'),
  ('Scikit-learn', 'ML'),
  ('Figma', 'Design'),
  ('PostgreSQL', 'Database'),
  ('MongoDB', 'Database'),
  ('Redis', 'Database'),
  ('Docker', 'DevOps'),
  ('AWS', 'DevOps'),
  ('Git', 'Tools'),
  ('C++', 'Systems'),
  ('Arduino', 'Hardware'),
  ('IoT', 'Hardware')
ON CONFLICT (name) DO NOTHING;

-- ── One active team per student ──────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS team_members_one_team_per_user
  ON public.team_members (user_id);

-- ── Team capacity enforcement ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_team_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
  team_capacity INTEGER;
  team_status TEXT;
BEGIN
  SELECT capacity, status INTO team_capacity, team_status
  FROM public.teams WHERE id = NEW.team_id FOR UPDATE;

  IF team_status = 'locked' THEN
    RAISE EXCEPTION 'Team is locked and not accepting new members';
  END IF;

  SELECT COUNT(*) INTO member_count
  FROM public.team_members WHERE team_id = NEW.team_id;

  IF member_count >= team_capacity THEN
    RAISE EXCEPTION 'Team has reached maximum capacity (%)', team_capacity;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_team_capacity ON public.team_members;
CREATE TRIGGER trg_enforce_team_capacity
  BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_team_capacity();

CREATE OR REPLACE FUNCTION public.sync_team_status_on_roster_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
  team_capacity INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT capacity INTO team_capacity FROM public.teams WHERE id = OLD.team_id;
    SELECT COUNT(*) INTO member_count FROM public.team_members WHERE team_id = OLD.team_id;

    IF member_count < team_capacity THEN
      UPDATE public.teams SET status = 'open' WHERE id = OLD.team_id AND status = 'full';
    END IF;
    RETURN OLD;
  END IF;

  SELECT capacity INTO team_capacity FROM public.teams WHERE id = NEW.team_id;
  SELECT COUNT(*) INTO member_count FROM public.team_members WHERE team_id = NEW.team_id;

  IF member_count >= team_capacity THEN
    UPDATE public.teams SET status = 'full' WHERE id = NEW.team_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_status_insert ON public.team_members;
CREATE TRIGGER trg_sync_team_status_insert
  AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_status_on_roster_change();

DROP TRIGGER IF EXISTS trg_sync_team_status_delete ON public.team_members;
CREATE TRIGGER trg_sync_team_status_delete
  AFTER DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_status_on_roster_change();

-- ── Drop permissive MVP policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow admin write access to skills" ON public.skills;
DROP POLICY IF EXISTS "Allow members of team to modify roster" ON public.team_members;
DROP POLICY IF EXISTS "Allow submission of ppts" ON public.archive_ppts;
DROP POLICY IF EXISTS "Allow submission of tips" ON public.archive_tips;
DROP POLICY IF EXISTS "Allow admins to write system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow uploader and admins to view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload own resume" ON storage.objects;

-- ── Profiles RLS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- ── Skills RLS ───────────────────────────────────────────────────────────────
CREATE POLICY "skills_admin_write" ON public.skills
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Teams RLS ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;
CREATE POLICY "teams_public_read" ON public.teams
  FOR SELECT USING (
    visibility = 'public'
    OR leader_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.team_members WHERE team_id = id)
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Allow leader full control of teams" ON public.teams;
CREATE POLICY "teams_leader_write" ON public.teams
  FOR ALL USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "teams_authenticated_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

-- ── Team members RLS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to team_members" ON public.team_members;
CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id)
    OR auth.uid() IN (SELECT user_id FROM public.team_members tm WHERE tm.team_id = team_members.team_id)
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.visibility = 'public')
  );

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id)
    OR public.is_admin(auth.uid())
  );

-- ── Requests RLS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow sending requests" ON public.requests;
CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Allow responders to update status" ON public.requests;
CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE USING (
    auth.uid() = receiver_id
    OR auth.uid() = sender_id
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id)
  );

-- ── Archive RLS ──────────────────────────────────────────────────────────────
CREATE POLICY "archive_ppts_insert_auth" ON public.archive_ppts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "archive_tips_insert_auth" ON public.archive_tips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── System settings RLS ───────────────────────────────────────────────────────
CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Ratings view access for authenticated users ───────────────────────────────
CREATE POLICY "student_ratings_read" ON public.ratings
  FOR SELECT USING (
    auth.uid() = rater_id
    OR auth.uid() = rated_id
    OR public.is_admin(auth.uid())
  );

-- ── Resume storage (path: resumes/{user_id}/filename) ────────────────────────
CREATE POLICY "resumes_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "resumes_read_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "resumes_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Default season setting ────────────────────────────────────────────────────
INSERT INTO public.system_settings (key, value) VALUES ('season_concluded', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value) VALUES ('season_name', 'SIH 2026')
ON CONFLICT (key) DO NOTHING;
