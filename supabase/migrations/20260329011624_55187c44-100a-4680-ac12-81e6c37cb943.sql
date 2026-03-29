
-- Tags table
CREATE TABLE public.conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags" ON public.conversation_tags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.conversation_tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.conversation_tags
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.conversation_tags
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Junction table
CREATE TABLE public.conversation_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.conversation_tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

ALTER TABLE public.conversation_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tag links" ON public.conversation_tag_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tag links" ON public.conversation_tag_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tag links" ON public.conversation_tag_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
