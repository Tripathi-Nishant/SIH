-- Hackathon completion product features.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS award_title TEXT,
  ADD COLUMN IF NOT EXISTS result_rank INTEGER,
  ADD COLUMN IF NOT EXISTS result_published BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.team_certificates
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  ADD COLUMN IF NOT EXISTS award_title TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

UPDATE public.team_certificates
SET verification_token = COALESCE(verification_token, replace(certificate_number, ' ', '-'))
WHERE verification_token IS NULL;

ALTER TABLE public.team_certificates
  ALTER COLUMN verification_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS team_certificates_verification_token_idx
  ON public.team_certificates(verification_token);

CREATE TABLE IF NOT EXISTS public.certificate_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES public.team_certificates(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('issued', 'reissued', 'revoked', 'restored', 'award_updated')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  href TEXT,
  kind TEXT NOT NULL DEFAULT 'general',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.certificate_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificate_audit_admin_read" ON public.certificate_audit_log
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "certificate_audit_admin_insert" ON public.certificate_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()) AND actor_id = auth.uid());
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_admin_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_admin_or_certificate_owner(certificate_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_certificates c
    WHERE c.id = certificate_uuid
      AND (c.user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  );
$$;

DROP POLICY IF EXISTS "team_certificates_read_own_or_admin" ON public.team_certificates;
CREATE POLICY "team_certificates_read_own_or_admin" ON public.team_certificates
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "team_certificates_admin_update" ON public.team_certificates
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
