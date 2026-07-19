-- SIH Team Finder Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  kiet_email TEXT UNIQUE NOT NULL,
  name TEXT,
  branch TEXT,
  year INTEGER,
  roll_no TEXT,
  bio TEXT,
  github_username TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  role_preference TEXT CHECK (role_preference IN ('member', 'leader', 'both')) DEFAULT 'both',
  profile_completeness INTEGER DEFAULT 0,
  github_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile inserts on auth registration" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- Skills lookup table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to skills" ON public.skills
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to skills" ON public.skills
  FOR ALL USING (true); -- simplify for MVP or link to custom admin check


-- User Skills junction table
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
  source TEXT CHECK (source IN ('self-tagged', 'github-verified')),
  confidence_score INTEGER DEFAULT 50,
  UNIQUE(user_id, skill_id)
);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to user_skills" ON public.user_skills
  FOR SELECT USING (true);

CREATE POLICY "Allow users to manage own user_skills" ON public.user_skills
  FOR ALL USING (auth.uid() = user_id);


-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  problem_statement_title TEXT,
  problem_statement_domain TEXT,
  required_skills_json JSONB DEFAULT '[]'::jsonb,
  capacity INTEGER DEFAULT 6,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'locked')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to teams" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Allow leader full control of teams" ON public.teams
  FOR ALL USING (auth.uid() = leader_id);


-- Team Members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to team_members" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "Allow members of team to modify roster" ON public.team_members
  FOR ALL USING (true); -- Simplify check for team collaboration


-- Requests & Invites table
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('join_request', 'invite')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
  pitch_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow parties involved to see requests" ON public.requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR auth.uid() IN (SELECT leader_id FROM public.teams WHERE id = team_id));

CREATE POLICY "Allow sending requests" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Allow responders to update status" ON public.requests
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);


-- Archive PPTs
CREATE TABLE IF NOT EXISTS public.archive_ppts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  ps_title TEXT NOT NULL,
  ps_domain TEXT,
  track TEXT,
  file_url TEXT,
  retrospective TEXT,
  upvotes INTEGER DEFAULT 0
);

ALTER TABLE public.archive_ppts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to ppts" ON public.archive_ppts
  FOR SELECT USING (true);

CREATE POLICY "Allow submission of ppts" ON public.archive_ppts
  FOR INSERT WITH CHECK (true);


-- Archive Tips
CREATE TABLE IF NOT EXISTS public.archive_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  role TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0
);

ALTER TABLE public.archive_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to tips" ON public.archive_tips
  FOR SELECT USING (true);

CREATE POLICY "Allow submission of tips" ON public.archive_tips
  FOR INSERT WITH CHECK (true);
