-- Admin-issued completion certificates. One certificate per team member.
CREATE TABLE IF NOT EXISTS public.team_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES public.profiles(id),
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_certificates_read_own_or_admin" ON public.team_certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "team_certificates_insert_admin" ON public.team_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND issued_by = auth.uid());

CREATE INDEX IF NOT EXISTS team_certificates_team_id_idx
  ON public.team_certificates(team_id);
