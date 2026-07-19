-- Break recursive RLS between teams and team_members by using SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = team_uuid
      AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = team_uuid
      AND leader_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_public_team(team_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = team_uuid
      AND visibility = 'public'
  );
$$;

-- Remove legacy policy names from the initial schema and hardening pass.
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;
DROP POLICY IF EXISTS "Allow leader full control of teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public read access to team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow members of team to modify roster" ON public.team_members;
DROP POLICY IF EXISTS "Allow parties involved to see requests" ON public.requests;
DROP POLICY IF EXISTS "Allow sending requests" ON public.requests;
DROP POLICY IF EXISTS "Allow responders to update status" ON public.requests;

DROP POLICY IF EXISTS "teams_public_read" ON public.teams;
CREATE POLICY "teams_public_read" ON public.teams
  FOR SELECT USING (
    visibility = 'public'
    OR public.is_team_leader(id, auth.uid())
    OR public.is_team_member(id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "teams_leader_write" ON public.teams;
CREATE POLICY "teams_leader_write" ON public.teams
  FOR UPDATE USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);

DROP POLICY IF EXISTS "teams_authenticated_insert" ON public.teams;
CREATE POLICY "teams_authenticated_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

DROP POLICY IF EXISTS "team_members_read" ON public.team_members;
CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR public.is_team_leader(team_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "requests_insert" ON public.requests;
CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "requests_update" ON public.requests;
CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE USING (
    auth.uid() = receiver_id
    OR auth.uid() = sender_id
    OR public.is_team_leader(team_id, auth.uid())
  );

DROP POLICY IF EXISTS "Allow parties involved to see requests" ON public.requests;
CREATE POLICY "requests_read" ON public.requests
  FOR SELECT USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR public.is_team_leader(team_id, auth.uid())
  );
