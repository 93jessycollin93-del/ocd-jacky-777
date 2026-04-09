
-- API Keys table (hashed storage, never raw)
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["bot:create"]'::jsonb,
  rate_limit integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own keys" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keys" ON public.api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own keys" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bot-to-API-Key junction
CREATE TABLE public.bot_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL,
  api_key_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(bot_id, api_key_id)
);

ALTER TABLE public.bot_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bot keys" ON public.bot_api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bot keys" ON public.bot_api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bot keys" ON public.bot_api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- API Usage Logs (immutable audit trail)
CREATE TABLE public.api_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.api_usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.api_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for rate limit lookups
CREATE INDEX idx_api_usage_logs_key_time ON public.api_usage_logs (api_key_id, created_at DESC);
CREATE INDEX idx_api_keys_hash ON public.api_keys (key_hash);
