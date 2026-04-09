
CREATE TABLE public.user_bots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  purpose text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'web',
  behavior_style text NOT NULL DEFAULT 'assistant',
  logic_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_code text DEFAULT '',
  language text NOT NULL DEFAULT 'nodejs',
  api_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bots" ON public.user_bots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bots" ON public.user_bots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bots" ON public.user_bots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bots" ON public.user_bots FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_bots_updated_at BEFORE UPDATE ON public.user_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
