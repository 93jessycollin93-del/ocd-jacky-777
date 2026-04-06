-- Jackie Long-Term Memory
CREATE TABLE public.jackie_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'context' CHECK (category IN ('preference', 'decision', 'context', 'pattern', 'architecture', 'style')),
  source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  confidence REAL NOT NULL DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jackie_memory_user ON public.jackie_memory(user_id);
CREATE INDEX idx_jackie_memory_category ON public.jackie_memory(user_id, category);
CREATE UNIQUE INDEX idx_jackie_memory_unique_key ON public.jackie_memory(user_id, key);

ALTER TABLE public.jackie_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON public.jackie_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON public.jackie_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON public.jackie_memory FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON public.jackie_memory FOR DELETE USING (auth.uid() = user_id);

-- Jackie Task Tracker
CREATE TABLE public.jackie_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT DEFAULT 'general',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jackie_tasks_user ON public.jackie_tasks(user_id);
CREATE INDEX idx_jackie_tasks_status ON public.jackie_tasks(user_id, status);

ALTER TABLE public.jackie_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.jackie_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.jackie_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.jackie_tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.jackie_tasks FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger for both tables
CREATE TRIGGER update_jackie_memory_updated_at
  BEFORE UPDATE ON public.jackie_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jackie_tasks_updated_at
  BEFORE UPDATE ON public.jackie_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();