-- Production indexes for the highest-traffic tables.

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_completeness ON public.profiles (profile_completeness);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams (leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams (status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_requests_sender_id ON public.requests (sender_id);
CREATE INDEX IF NOT EXISTS idx_requests_receiver_id ON public.requests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_requests_team_id ON public.requests (team_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_team_created ON public.team_chat_messages (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_team_id ON public.mentor_requests (team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_id ON public.mentor_requests (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON public.mentor_requests (status);
CREATE INDEX IF NOT EXISTS idx_team_mentors_team_active ON public.team_mentors (team_id, active);
CREATE INDEX IF NOT EXISTS idx_team_mentors_mentor_active ON public.team_mentors (mentor_id, active);
