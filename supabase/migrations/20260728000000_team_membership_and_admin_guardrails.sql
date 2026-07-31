-- Team membership + admin guardrails
-- This migration makes the database enforce the rules that the UI already assumes:
-- 1) a user can only be in one team at a time
-- 2) invites/join requests are blocked while a user is already in a team
-- 3) only the team leader or a real admin can edit/delete a team
-- 4) mentor management is admin-controlled
-- 5) profile roles cannot be escalated from the browser

-- Keep the profile fields we rely on in place.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_to_invites BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'faculty', 'admin'));

-- Real admin helper: only the admin role counts here.
CREATE OR REPLACE FUNCTION public.is_super_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'admin'
  );
$$;

-- Active membership = the user currently has a row in team_members.
CREATE OR REPLACE FUNCTION public.user_has_active_team(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_receive_invites(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT open_to_invites FROM public.profiles WHERE id = uid),
    TRUE
  )
  AND NOT public.user_has_active_team(uid);
$$;

-- Block browser-driven role escalation.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Only the project owner can change profile roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_changes ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_changes();

-- Protect team ownership from client-side tampering.
CREATE OR REPLACE FUNCTION public.prevent_team_leader_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.leader_id IS DISTINCT FROM OLD.leader_id THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Only the project owner can change the team leader';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_team_leader_changes ON public.teams;
CREATE TRIGGER trg_prevent_team_leader_changes
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_team_leader_changes();

-- Keep request routing fields immutable after creation.
CREATE OR REPLACE FUNCTION public.prevent_request_route_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.type IS DISTINCT FROM OLD.type THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Request routing fields are immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_request_route_changes ON public.requests;
CREATE TRIGGER trg_prevent_request_route_changes
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_request_route_changes();

-- Teams: only the leader or a real admin can manage the row.
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;
DROP POLICY IF EXISTS "Allow leader full control of teams" ON public.teams;
DROP POLICY IF EXISTS "teams_public_read" ON public.teams;
DROP POLICY IF EXISTS "teams_leader_write" ON public.teams;
DROP POLICY IF EXISTS "teams_authenticated_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_read" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_update_owner_or_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_owner_or_admin" ON public.teams;

CREATE POLICY "teams_read" ON public.teams
  FOR SELECT TO authenticated, anon
  USING (
    visibility = 'public'
    OR public.is_team_leader(id, auth.uid())
    OR public.is_team_member(id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "teams_insert_owner" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    leader_id = auth.uid()
    AND NOT public.user_has_active_team(auth.uid())
  );

CREATE POLICY "teams_update_owner_or_admin" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    public.is_team_leader(id, auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    public.is_team_leader(id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "teams_delete_owner_or_admin" ON public.teams
  FOR DELETE TO authenticated
  USING (
    public.is_team_leader(id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Team members: current membership is the source of truth.
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow members of team to modify roster" ON public.team_members;
DROP POLICY IF EXISTS "team_members_read" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_team_member(team_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = user_id
      OR public.is_team_leader(team_id, auth.uid())
      OR public.is_super_admin(auth.uid())
    )
    AND NOT public.user_has_active_team(user_id)
  );

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Requests: block invites/join requests when the target is already in a team.
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow parties involved to see requests" ON public.requests;
DROP POLICY IF EXISTS "Allow sending requests" ON public.requests;
DROP POLICY IF EXISTS "Allow responders to update status" ON public.requests;
DROP POLICY IF EXISTS "requests_read" ON public.requests;
DROP POLICY IF EXISTS "requests_insert" ON public.requests;
DROP POLICY IF EXISTS "requests_update" ON public.requests;

CREATE POLICY "requests_read" ON public.requests
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (
        type = 'join_request'
        AND receiver_id = (SELECT leader_id FROM public.teams WHERE id = team_id)
        AND NOT public.user_has_active_team(sender_id)
      )
      OR
      (
        type = 'invite'
        AND public.is_team_leader(team_id, auth.uid())
        AND COALESCE((SELECT open_to_invites FROM public.profiles WHERE id = receiver_id), TRUE)
        AND NOT public.user_has_active_team(receiver_id)
      )
    )
  );

CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (true);

-- Mentor program: fixed mentor list, admin-controlled assignment.
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_profiles_read" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_insert_own" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_update_own" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_delete_admin" ON public.mentor_profiles;
DROP POLICY IF EXISTS "mentor_profiles_admin_write" ON public.mentor_profiles;

CREATE POLICY "mentor_profiles_read" ON public.mentor_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "mentor_profiles_admin_write" ON public.mentor_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "mentor_profiles_admin_update" ON public.mentor_profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "mentor_profiles_admin_delete" ON public.mentor_profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentor_requests_read" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_insert" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_update" ON public.mentor_requests;

CREATE POLICY "mentor_requests_read" ON public.mentor_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR mentor_id = auth.uid()
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "mentor_requests_insert" ON public.mentor_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND (
      public.is_team_leader(team_id, auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "mentor_requests_update" ON public.mentor_requests
  FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    OR mentor_id = auth.uid()
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (true);

ALTER TABLE public.team_mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_mentors_read" ON public.team_mentors;
DROP POLICY IF EXISTS "team_mentors_insert" ON public.team_mentors;
DROP POLICY IF EXISTS "team_mentors_update" ON public.team_mentors;
DROP POLICY IF EXISTS "team_mentors_delete" ON public.team_mentors;

CREATE POLICY "team_mentors_read" ON public.team_mentors
  FOR SELECT TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
    OR public.is_team_leader(team_id, auth.uid())
    OR mentor_id = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "team_mentors_admin_write" ON public.team_mentors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "team_mentors_admin_update" ON public.team_mentors
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "team_mentors_admin_delete" ON public.team_mentors
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
