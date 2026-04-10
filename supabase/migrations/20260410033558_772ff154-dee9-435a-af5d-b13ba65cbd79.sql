
-- G-UNIT Memory (AI Chat History)
CREATE TABLE public.gunit_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gunit_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory" ON public.gunit_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON public.gunit_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own memory" ON public.gunit_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_gunit_memory_user_created ON public.gunit_memory (user_id, created_at DESC);

-- G-UNIT Improvements (Agent Cycle Results)
CREATE TABLE public.gunit_improvements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal TEXT NOT NULL,
  execution TEXT NOT NULL DEFAULT '',
  analysis TEXT NOT NULL DEFAULT '',
  improvement TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gunit_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own improvements" ON public.gunit_improvements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own improvements" ON public.gunit_improvements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_gunit_improvements_user ON public.gunit_improvements (user_id, created_at DESC);

-- G-UNIT Generated Bots
CREATE TABLE public.gunit_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gunit_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bots" ON public.gunit_bots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bots" ON public.gunit_bots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bots" ON public.gunit_bots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- G-UNIT Agents
CREATE TABLE public.gunit_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('active', 'idle')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gunit_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents" ON public.gunit_agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agents" ON public.gunit_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON public.gunit_agents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON public.gunit_agents FOR DELETE TO authenticated USING (auth.uid() = user_id);
