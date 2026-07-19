-- Peer Reputation ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  reliability_score INTEGER CHECK (reliability_score >= 1 AND reliability_score <= 5),
  skill_score INTEGER CHECK (skill_score >= 1 AND skill_score <= 5),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_rater_rated_team_season UNIQUE (rater_id, rated_id, team_id, season)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to insert ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Allow raters to see own ratings" ON public.ratings
  FOR SELECT USING (auth.uid() = rater_id);

-- Anonymized View for rated students to read their scores/comments without rater_id
CREATE OR REPLACE VIEW public.student_ratings AS
  SELECT id, rated_id, team_id, season, reliability_score, skill_score, communication_score, comment, created_at
  FROM public.ratings;

-- Season/System settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read system_settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to write system_settings" ON public.system_settings
  FOR ALL USING (true);
