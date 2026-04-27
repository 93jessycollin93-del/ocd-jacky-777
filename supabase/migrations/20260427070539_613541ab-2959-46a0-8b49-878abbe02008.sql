-- Audit log (append-only from client perspective; user can clear by deleting their rows)
CREATE TABLE public.jackie_control_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actor TEXT NOT NULL DEFAULT 'owner',
  command TEXT NOT NULL,
  action_id TEXT,
  args JSONB,
  result TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_jackie_control_audit_user_ts ON public.jackie_control_audit (user_id, ts DESC);
ALTER TABLE public.jackie_control_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own audit" ON public.jackie_control_audit
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own audit" ON public.jackie_control_audit
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own audit" ON public.jackie_control_audit
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Deny audit updates" ON public.jackie_control_audit
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

-- Swarms
CREATE TABLE public.jackie_control_swarms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal TEXT NOT NULL,
  models JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'running',
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_jackie_control_swarms_user ON public.jackie_control_swarms (user_id, started_at DESC);
ALTER TABLE public.jackie_control_swarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own swarms" ON public.jackie_control_swarms
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own swarms" ON public.jackie_control_swarms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own swarms" ON public.jackie_control_swarms
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own swarms" ON public.jackie_control_swarms
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_jackie_control_swarms_updated_at
  BEFORE UPDATE ON public.jackie_control_swarms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-user control preferences (role + model override)
CREATE TABLE public.jackie_control_prefs (
  user_id UUID NOT NULL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'owner',
  model_override TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.jackie_control_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.jackie_control_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.jackie_control_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.jackie_control_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own prefs" ON public.jackie_control_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_jackie_control_prefs_updated_at
  BEFORE UPDATE ON public.jackie_control_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();