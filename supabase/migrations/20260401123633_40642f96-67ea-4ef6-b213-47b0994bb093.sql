
-- Create category enum for design entries
CREATE TYPE public.design_entry_category AS ENUM (
  'lore', 'mechanic', 'unit', 'building', 'resource', 'tech_tree',
  'faction', 'event', 'economy_rule', 'battle_system', 'alliance',
  'monetization', 'quest', 'map', 'general'
);

-- Create status enum for design entries
CREATE TYPE public.design_entry_status AS ENUM ('draft', 'approved', 'implemented');

-- Create game_projects table
CREATE TABLE public.game_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  genre TEXT,
  description TEXT,
  vision_statement TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.game_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.game_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.game_projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.game_projects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_game_projects_updated_at
  BEFORE UPDATE ON public.game_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create game_design_entries table
CREATE TABLE public.game_design_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.game_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.game_design_entries(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category public.design_entry_category NOT NULL DEFAULT 'general',
  status public.design_entry_status NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_design_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.game_design_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.game_design_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.game_design_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.game_design_entries FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_game_design_entries_updated_at
  BEFORE UPDATE ON public.game_design_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_game_design_entries_project ON public.game_design_entries(project_id);
CREATE INDEX idx_game_design_entries_category ON public.game_design_entries(category);
CREATE INDEX idx_game_design_entries_parent ON public.game_design_entries(parent_id);
