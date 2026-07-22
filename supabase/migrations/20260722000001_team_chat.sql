-- Team chat for squad coordination

CREATE TABLE IF NOT EXISTS public.team_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_chat_select" ON public.team_chat_messages;
DROP POLICY IF EXISTS "team_chat_insert" ON public.team_chat_messages;
DROP POLICY IF EXISTS "team_chat_delete" ON public.team_chat_messages;

CREATE POLICY "team_chat_select" ON public.team_chat_messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR auth.uid() IN (SELECT user_id FROM public.team_members WHERE team_id = team_chat_messages.team_id)
    OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_chat_messages.team_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "team_chat_insert" ON public.team_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() IN (SELECT user_id FROM public.team_members WHERE team_id = team_chat_messages.team_id)
      OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_chat_messages.team_id)
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "team_chat_delete" ON public.team_chat_messages
  FOR DELETE USING (
    auth.uid() = sender_id
    OR public.is_admin(auth.uid())
  );
