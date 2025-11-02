
-- Migration: 20251030224947
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  high_school TEXT,
  graduation_year INTEGER,
  gpa DECIMAL(3,2),
  sat_score INTEGER,
  act_score INTEGER,
  intended_major TEXT,
  extracurriculars TEXT[],
  interests TEXT[],
  location_preference TEXT,
  budget_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create colleges table
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  acceptance_rate DECIMAL(5,2),
  avg_gpa DECIMAL(3,2),
  avg_sat INTEGER,
  avg_act INTEGER,
  tuition INTEGER,
  size TEXT,
  majors TEXT[],
  description TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on colleges (public read)
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colleges are viewable by everyone"
  ON public.colleges FOR SELECT
  USING (true);

-- Create user_colleges table for tracking recommendations
CREATE TABLE public.user_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('reach', 'target', 'safety')),
  match_score INTEGER CHECK (match_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, college_id)
);

-- Enable RLS on user_colleges
ALTER TABLE public.user_colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own college matches"
  ON public.user_colleges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own college matches"
  ON public.user_colleges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own college matches"
  ON public.user_colleges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own college matches"
  ON public.user_colleges FOR DELETE
  USING (auth.uid() = user_id);

-- Create progress_milestones table
CREATE TABLE public.progress_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on progress_milestones
ALTER TABLE public.progress_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestones"
  ON public.progress_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
  ON public.progress_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones"
  ON public.progress_milestones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestones"
  ON public.progress_milestones FOR DELETE
  USING (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample college data
INSERT INTO public.colleges (name, location, acceptance_rate, avg_gpa, avg_sat, avg_act, tuition, size, majors, description, website) VALUES
('Stanford University', 'Stanford, CA', 3.9, 3.96, 1505, 34, 56169, 'Medium', ARRAY['Computer Science', 'Engineering', 'Business', 'Biology'], 'A leading research university known for innovation and entrepreneurship.', 'https://www.stanford.edu'),
('MIT', 'Cambridge, MA', 6.7, 3.96, 1535, 35, 53790, 'Medium', ARRAY['Engineering', 'Computer Science', 'Physics', 'Mathematics'], 'World-renowned for science, engineering, and technology research.', 'https://www.mit.edu'),
('UC Berkeley', 'Berkeley, CA', 14.5, 3.89, 1415, 33, 44115, 'Large', ARRAY['Engineering', 'Computer Science', 'Business', 'Environmental Science'], 'Top public university with strong programs across disciplines.', 'https://www.berkeley.edu'),
('UCLA', 'Los Angeles, CA', 10.8, 3.90, 1405, 32, 43022, 'Large', ARRAY['Film', 'Business', 'Psychology', 'Biology'], 'Premier public research university in Southern California.', 'https://www.ucla.edu'),
('University of Michigan', 'Ann Arbor, MI', 20.2, 3.88, 1435, 32, 52266, 'Large', ARRAY['Engineering', 'Business', 'Medicine', 'Law'], 'Excellent public research university with strong academics.', 'https://www.umich.edu'),
('University of Texas at Austin', 'Austin, TX', 31.4, 3.71, 1355, 29, 40032, 'Large', ARRAY['Business', 'Engineering', 'Liberal Arts', 'Natural Sciences'], 'Large public university with diverse programs and vibrant campus.', 'https://www.utexas.edu'),
('San Jose State University', 'San Jose, CA', 67.0, 3.30, 1150, 24, 20704, 'Large', ARRAY['Engineering', 'Business', 'Computer Science', 'Arts'], 'Public university in the heart of Silicon Valley.', 'https://www.sjsu.edu');

-- Migration: 20251030225225
-- Fix function search path for security
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
